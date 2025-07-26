#!/usr/bin/env node

import * as ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_SRC = path.join(import.meta.dirname, '../workspaces/puth/src');
const PHP_OUT_BASE = path.join(import.meta.dirname, '../workspaces/clients/php/client/src/RemoteObjects');

const NS_INTERNAL = 'Puth\\RemoteObjects';
const NS_EXTERNAL = 'Puth\\RemoteObjects\\External';

// skips all files for resolving that are not inside project src
const skipResolvingNonProjectFiles = true;

// ─────────────────────────────────────────────────────────────────────────────
//  PROGRAM + TYPE‑CHECKER
// ─────────────────────────────────────────────────────────────────────────────

const program = ts.createProgram([path.join(PROJECT_SRC, 'index.ts')], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    lib: ['ES2022', 'dom'],
    noImplicitAny: true,
    resolveJsonModule: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
});
const checker = program.getTypeChecker();

// ─────────────────────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────────────────────

/** @type {{name:string,isExternal:boolean,methods:Array}} */
const classes = [];
const visitedNames = new Set();          // class/interface name guard
const visitedSymbols = new Set();        // symbol‑level guard (alias safe)

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const PRIMITIVES = new Set([
    'string', 'number', 'boolean', 'any', 'void', 'null', 'undefined',
    'bigint', 'symbol', 'never', 'mixed', 'unknown', 'Uint8Array',
    'int',
]);

function isPrimitive(txt) {return PRIMITIVES.has(txt);} // simple check — arrays handled later

function sourceIsExternal(sf) {
    return !path.resolve(sf.fileName).startsWith(PROJECT_SRC);
}

function hasCodegen(node) {
    const src = node.getSourceFile().text;
    const ranges = ts.getLeadingCommentRanges(src, node.pos) || [];
    return ranges.some(r => src.slice(r.pos, r.end).includes('@codegen'));
}

function normalizeTypeName(txt) {
    let out = txt.trim();
    out = out.replace(/^Array<(.+)>$/u, '$1');
    out = out.replace(/\[\]$/u, '');
    out = out.replace(/import\([^)]*\)\./u, '');
    out = out.replace(/<.*>/u, '');
    return out.split('.').pop();
}

// alias map so we can follow renamed imports
const aliasMap = new Map();

function recordAlias(id, origSym) {if (id && origSym && id.text !== origSym.getName()) {aliasMap.set(id.text, origSym.getName());}}

function resolveAliasName(n) {return aliasMap.get(n) || n;}

const NAME_TRANSLATION = {
    php: {
        default: {
            Browser: {
                $: 'get',
                $$: 'getAll',
                $$eval: 'getAllEval',
                $eval: 'getEval',
                $x: 'getX',
            },
        },
        laravel: {
            Browser: {
                screenshot: '_screenshot',
                // type: '_type',
                keys: '_keys',
                // typeSlowly: '_typeSlowly',
                findOrFail: '_findOrFail',
                firstOrFail: '_firstOrFail',
                assertHasCookie: '_assertHasCookie',
                assertCookieMissing: '_assertCookieMissing',
                assertCookieValue: '_assertCookieValue',
                waitUntil: '_waitUntil',
                format: '_format',
                withinIframe: '_withinIframe',
            },
        },
    },
}

// ─────────────────────────────────────────────────────────────────────────────
//  TYPE EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function isValidPhpIdentifier(name) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function extractTypes(node) {
    if (!node) {
        return ['void'];
    }

    // unwrap Promise<...>
    while (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.escapedText === 'Promise') {
        if (!node.typeArguments?.length) {
            return ['void'];
        }
        node = node.typeArguments[0];

        if (node.typeName?.escapedText === 'Return') {
            if (!node.typeArguments?.length) {
                return ['void'];
            }
            node = node.typeArguments[0];
        }
    }

    if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        return node.types.flatMap(t => extractTypes(t));
    }

    if (ts.isArrayTypeNode(node)) {
        return extractTypes(node.elementType).map(t => t + '[]');
    }

    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
        const id = node.typeName;
        let typeName = id.text;
        const sym = checker.getSymbolAtLocation(id);
        if (sym && sym.flags & ts.SymbolFlags.Alias) {
            const aliased = checker.getAliasedSymbol(sym);
            recordAlias(id, aliased);
            typeName = aliased.getName();
        }
        return [typeName];
    }

    if (ts.isTypeLiteralNode(node)) {
        let aliasName;
        for (let p = node.parent; p; p = p.parent) {
            if (ts.isTypeAliasDeclaration(p)) {
                aliasName = p.name.text;
                break;
            }
        }
        const shimName = aliasName || ('Anonymous_' + Math.random().toString(36).slice(2, 8));
        const isExt = sourceIsExternal(node.getSourceFile());
        generateObjectShim(shimName, node, isExt);
        return [shimName];
    }

    return [node.getFullText(node.getSourceFile()).trim()];
}

function extractParameters(params) {
    return (params || []).map(p => {
        // if (p.name.getText(p.getSourceFile()) === 'options') {
        //     p?.initializer?.symbol?.members.forEach((member, key) => {
        //         console.log(key, member.valueDeclaration); // StringLiteral (text), NumericLiteral, FalseKeyword, NullKeyword, TrueKeyword
        //     });
        // }

        let param = {
            name: p.name.getText(p.getSourceFile()),
            type: p.type ? p.type.getFullText(p.getSourceFile()).trim() : 'any',
            isOptional: p?.questionToken != null,
        };

        if (p?.initializer?.kind === ts.SyntaxKind.ObjectLiteralExpression) {
            let members = [];

            p?.initializer?.symbol?.members.forEach((member, key) => {
                let initializer = member?.valueDeclaration.initializer;
                members.push({
                    key,
                    type: initializer.kind === ts.SyntaxKind.NumericLiteral ? 'numeric'
                        : (initializer.kind === ts.SyntaxKind.StringLiteral ? 'string'
                            : (initializer.kind === ts.SyntaxKind.FalseKeyword ? 'false'
                            : (initializer.kind === ts.SyntaxKind.TrueKeyword ? 'true'
                            : (initializer.kind === ts.SyntaxKind.NullKeyword ? 'null'
                                : 'unsupported')))),
                    value: initializer?.text,
                });
            });

            param.initializer = {
                type: 'object',
                members,
            };
        } else if (p?.initializer?.kind === ts.SyntaxKind.ArrayLiteralExpression) {
            let members = [];

            if (p?.initializer?.elements?.length > 0) {
                throw new Error('Unsupported initializer: currently only empty array default values are allowed.');
            }

            param.initializer = {
                type: 'array',
                members,
            };
        } else if (p?.initializer?.kind === ts.SyntaxKind.NullKeyword) {
            param.initializer = {
                type: 'null',
            };
        } else if (p?.initializer?.kind === ts.SyntaxKind.NumericLiteral) {
            param.initializer = {
                type: 'numeric',
                value: p?.initializer?.text,
            };
        } else if (p?.initializer?.kind === ts.SyntaxKind.StringLiteral) {
            param.initializer = {
                type: 'string',
                value: p?.initializer?.text,
            };
        } else if (p?.initializer?.kind === ts.SyntaxKind.FalseKeyword) {
            param.initializer = {
                type: 'false',
            };
        } else if (p?.initializer?.kind === ts.SyntaxKind.TrueKeyword) {
            param.initializer = {
                type: 'true',
            };
        }

        return param;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SHIM GENERATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function nodeComments(node) {
    const src = node.getSourceFile().text;
    return (ts.getLeadingCommentRanges(src, node.pos) || []).map(r => {
        return src.slice(r.pos, r.end).split('\n').map(l => l.trim()).map(line => {
            if (line.startsWith('////')) return '';
            if (line.startsWith('/**')) return line.slice(3);
            if (line.startsWith('/*')) return line.slice(2);
            if (line.startsWith('//')) return line.slice(2);
            if (line.startsWith('*/')) return line.slice(2);
            if (line.startsWith('*')) return line.slice(1);

            return line;
        }).map(l => l.trim()).filter(i => i !== '');
    }).flat();
}

function ensureClassEntry(name, isExternal, comments) {
    if (visitedNames.has(name)) {
        return classes.find(c => c.name === name);
    }

    const entry = {name, isExternal, methods: new Map(), comments,};
    classes.push(entry);
    visitedNames.add(name);
    return entry;
}

function pushMethod(entry, method) {
    if (entry.methods.has(method.name)) {
        entry.methods.get(method.name).multiDef.push(method);
    } else {
        entry.methods.set(method.name, method);
    }
}

function generateObjectShim(name, typeLiteral, isExternal) {
    const entry = ensureClassEntry(name, isExternal);
    typeLiteral.members.forEach(m => {
        if (!m.name || !m.type) {
            return;
        }
        const prop = m.name.getText(m.getSourceFile());
        const returns = extractTypes(m.type);
        pushMethod(entry, {
            name: 'get' + prop.charAt(0).toUpperCase() + prop.slice(1),
            isAsync: false,
            parameters: [],
            returns,
            multiDef: [],
        });
        returns.forEach(t => {
            if (!isPrimitive(normalizeTypeName(t))) {
                resolveTypeToClass(t);
            }
        });
    });
}

function addMemberToClass(entry, member, includeAll) {
    const isMethod = ts.isMethodDeclaration(member) || ts.isMethodSignature(member);
    if (!isMethod) {
        return;
    }
    if (!includeAll && !hasCodegen(member)) {
        return;
    }
    if (!member.name) {
        return;
    }
    if (!member.modifiers?.find(m => m.kind === ts.SyntaxKind.PublicKeyword)) {
        return;
    }

    const rawName = member.name.getText(member.getSourceFile());
    // Skip computed / symbol names that are not valid in PHP
    if (!isValidPhpIdentifier(rawName)) {
        throw new Error('Found unsupported character in function name ' + rawName);
    }

    const isAsync = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
    const parameters = extractParameters(member.parameters);
    const comments = nodeComments(member);
    const foundReturnOverwrite = comments.find(i => i.startsWith('@gen-returns'));
    const originalReturns = extractTypes(member.type);
    const returns = foundReturnOverwrite ? [foundReturnOverwrite.replace('@gen-returns', '').trim()] : originalReturns;

    if (comments.length !== 0) comments.push('');
    comments.push('@debug-gen-original-name ' + JSON.stringify(rawName));
    comments.push('@debug-gen-original-is-async ' + (isAsync ? 'true' : 'false'));
    comments.push('@debug-gen-original-returns ' + JSON.stringify(originalReturns));
    parameters.forEach(parameter => {
        let clone = structuredClone(parameter);
        delete clone['name'];
        comments.push('@debug-gen-original-parameter' + ` ${parameter.name} ` + JSON.stringify(clone));
    });

    const method = {
        name: rawName,
        isAsync,
        parameters,
        comments,
        returns,
        multiDef: [],
    };

    pushMethod(entry, method);
    returns.forEach(t => {
        if (!isPrimitive(normalizeTypeName(t))) {
            resolveTypeToClass(t);
        }
    });
}

function visitClassOrInterface(decl, includeAll) {
    if (!decl.name) {
        return;
    }
    const name = decl.name.text;
    const isExt = sourceIsExternal(decl.getSourceFile());
    const entry = ensureClassEntry(name, isExt, nodeComments(decl));
    (decl.members || []).forEach(m => addMemberToClass(entry, m, includeAll));
}

function visitTypeAlias(decl, includeAll) {
    const name = decl.name.text;
    if (ts.isTypeLiteralNode(decl.type)) {
        const isExt = sourceIsExternal(decl.getSourceFile());
        generateObjectShim(name, decl.type, isExt);
    } else {
        extractTypes(decl.type).forEach(t => resolveTypeToClass(t));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TYPE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

function resolveTypeToClass(typeTxt) {
    const aliasResolved = resolveAliasName(typeTxt);
    const cleaned = normalizeTypeName(aliasResolved);
    if (!cleaned || isPrimitive(cleaned)) {
        return;
    }

    // fast exit if already done
    if (visitedNames.has(cleaned)) {
        return;
    }

    const sym = checker.resolveName(
        aliasResolved,
        undefined,
        ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Alias,
        false,
    );

    if (sym) {
        const target = (sym.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(sym) : sym;
        if (visitedSymbols.has(target)) {
            return;
        }
        visitedSymbols.add(target);
        for (const d of target.declarations || []) {
            if (ts.isClassDeclaration(d) || ts.isInterfaceDeclaration(d)) {
                visitClassOrInterface(d, true);
            } else if (ts.isTypeAliasDeclaration(d)) {
                visitTypeAlias(d, true);
            }
        }
        return;
    }

    // fallback: exhaustive scan by name
    program.getSourceFiles().forEach(sf => {
        if (skipResolvingNonProjectFiles && !sf.fileName.startsWith(PROJECT_SRC)) {
            return;
        }

        ts.forEachChild(sf, node => {
            if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name?.text === cleaned) {
                visitClassOrInterface(node, true);
            } else if (ts.isTypeAliasDeclaration(node) && node.name.text === cleaned) {
                visitTypeAlias(node, true);
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  INITIAL WALK (roots must have @codegen)
// ─────────────────────────────────────────────────────────────────────────────

program.getSourceFiles().forEach(sf => {
    if (!sf.fileName.startsWith(PROJECT_SRC)) {
        return;
    }
    ts.forEachChild(sf, node => {
        if (ts.isClassDeclaration(node) && node.name && hasCodegen(node)) {
            visitClassOrInterface(node, false);
        } else if (ts.isInterfaceDeclaration(node) && node.name && hasCodegen(node)) {
            visitClassOrInterface(node, false);
        } else if (ts.isTypeAliasDeclaration(node) && node.name && hasCodegen(node)) {
            visitTypeAlias(node, false);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHP GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function mapTypeToPHP(type, className) {
    if (!type) {
        return 'mixed';
    }
    if (type === 'this') {
        return className;
    }
    if (type === 'RemoteObject') {
        return 'RemoteObject';
    }
    if (type.endsWith('[]') || /^Array<.*>$/.test(type) || type === 'Array') {
        return 'array';
    }
    const base = normalizeTypeName(resolveAliasName(type));
    if (isPrimitive(base)) {
        switch (base) {
            case 'string':
                return 'string';
            case 'number':
                return 'float';
            case 'boolean':
                return 'bool';
            case 'void':
                return 'void';
            case 'int':
                return 'int';
            default:
                return 'mixed';
        }
    }
    if (classes.find(c => c.name === base)) {
        return base;
    }
    return 'mixed';
}

function functionParameterOptional(p, className) {
    console.log(className, p);
    if (p.initializer) {
        if (p.initializer.type === 'object') {
            return ` = [${p.initializer.members.map(i => {
                let value = i.type;
                if (i.type === 'string') value = `'${i.value}'`;
                else if (i.type === 'numeric') value = parseInt(i.value);
                
                return `'${i.key}' => ${value}`;
            }).join(', ')}]`;
        } else if (p.initializer.type === 'array') {
            // TODO support array members
            // return ` = [${p.initializer.members.map(i => {
            //     let value = i.type;
            //     if (i.type === 'string') value = `'${i.value}'`;
            //     else if (i.type === 'numeric') value = parseInt(i.value);
            //
            //     return `'${i.key}' => ${value}`;
            // }).join(', ')}]`;
            return ` = []`;
        } else if (p.initializer.type === 'null') {
            return ` = null`;
        }  else if (p.initializer.type === 'false') {
            return ` = false`;
        }  else if (p.initializer.type === 'true') {
            return ` = true`;
        } else if (p.initializer.value != null) {
            if (p.type === 'int') return ` = ${p.initializer.value}`;
            else if (p.type === 'string') return ` = '${p.initializer.value}'`;
        }
    }

    return '';
}

function generatePHPMethod(className, method) {
    const {name, isAsync, parameters, returns, comments} = method;
    const types = returns;
    const returnHintRaw = types.length > 1 ? types.join('|') : types[0];

    // Determine PHP return type
    let phpReturn = 'mixed';
    if (types.length === 1) {
        phpReturn = mapTypeToPHP(types[0], className);
    } else {
        const mapped = Array.from(new Set(types.map(t => mapTypeToPHP(t, className))));
        if (mapped.length === 1) {
            phpReturn = mapped[0];
        }
    }

    const phpParams = parameters.map(p => `${mapTypeToPHP(p.type, className)} $${p.name}${functionParameterOptional(p, className)}`).join(', ');
    const argArray = parameters.length ? `, [${parameters.map(p => `$${p.name}`).join(', ')}]` : '';
    const callLine = `${phpReturn === 'void' ? '' : 'return '}$this->callFunc('${name}'${argArray});`;

    let nameTranslated = NAME_TRANSLATION?.php?.default?.[className]?.[name] ?? name;
    nameTranslated = NAME_TRANSLATION?.php?.laravel?.[className]?.[name] ?? nameTranslated;

    console.log(nameTranslated, parameters);
    return [
        '    /**',
        comments.map(c => `     * ${c}`).join('\n'),
        '     */',
        `    public function ${nameTranslated}(${phpParams}): ${phpReturn}`,
        '    {',
        `        ${callLine}`,
        '    }',
    ].filter(i => !!i).join('\n');
}

function emitPHPClass(cls) {
    const ns = cls.isExternal ? NS_EXTERNAL : NS_INTERNAL;
    const oppositeNs = cls.isExternal ? NS_INTERNAL : NS_EXTERNAL;

    // Build a set of cross‑namespace import lines
    const uses = new Set();
    // Iterate regardless of Map or Array structure
    const iter = cls.methods instanceof Map ? cls.methods.values() : cls.methods;
    for (const m of iter) {
        for (const t of m.returns) {
            const base = normalizeTypeName(resolveAliasName(t));
            const target = classes.find(c => c.name === base);
            if (target && base !== cls.name) {
                const otherNs = target.isExternal ? NS_EXTERNAL : NS_INTERNAL;
                if (otherNs !== ns) {
                    uses.add(`${otherNs}\\${base}`);
                }
            }
        }
    }

    const methodsArray = cls.methods instanceof Map ? Array.from(cls.methods.values()) : cls.methods;
    console.log(cls.name, methodsArray);

    const content = [
        '<?php',
        '',
        `namespace ${ns};`,
        '',
        'use Puth\\RemoteObject;',
        ...Array.from(uses).map(u => `use ${u};`),
        '',
        '/**',
        cls.comments.map(c => `* ${c ?? ''}`).join('\n'),
        '*/',
        `class ${cls.name} extends RemoteObject`,
        '{',
        methodsArray.map(m => generatePHPMethod(cls.name, m)).join('\n\n'),
        '}',
        '',
    ].join('\n');

    const dir = path.join(PHP_OUT_BASE, cls.isExternal ? 'External' : '');
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, `${cls.name}.php`), content, 'utf8');
}

classes.forEach(c => emitPHPClass(c));

console.log(`Generated ${classes.length} PHP shim classes.`);
