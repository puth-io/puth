import * as ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_SRC = path.resolve('src');
const PHP_OUT_BASE = path.resolve('../clients/php/client/src/Generics');

// Build a TypeScript program that spans *every* file reachable from our roots
// so we can follow types into node_modules while retaining proper symbol
// information.
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
//  STATE HOLDERS
// ─────────────────────────────────────────────────────────────────────────────

/** All shim class metadata accumulated during traversal. */
const classes = [];
/** Name‑based guard so we don’t regenerate the same class twice. */
const visited = new Set();
/** Symbol‑based guard for alias handling. */
const visitedSymbols = new Set();

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const PRIMITIVES = new Set([
    'string',
    'number',
    'boolean',
    'any',
    'void',
    'null',
    'undefined',
    'bigint',
    'symbol',
    'never',
    'mixed',
    'unknown',
]);

function isPrimitive(txt) {
    return (
        PRIMITIVES.has(txt) ||
        /^(?:string|number|boolean)\[\]$/.test(txt) // primitive array e.g. string[]
    );
}

function hasCodegen(node) {
    const src = node.getSourceFile().text;
    const ranges = ts.getLeadingCommentRanges(src, node.pos) || [];
    return ranges.some(r => src.slice(r.pos, r.end).includes('@codegen'));
}

/**
 * Sanitize a raw TypeScript type string down to an identifier we can look up.
 */
function normalizeTypeName(txt) {
    let out = txt.trim();
    out = out.replace(/^Array<(.+)>$/u, '$1'); // Array<T> → T
    out = out.replace(/\[\]$/u, ''); // Foo[] → Foo
    out = out.replace(/import\([^)]*\)\./u, ''); // import("pkg").Bar → Bar
    out = out.replace(/<.*>/u, ''); // Foo<Bar> → Foo
    return out.split('.').pop(); // A.B.C → C
}

function sourceIsExternal(sf) {
    return !path.resolve(sf.fileName).startsWith(PROJECT_SRC);
}

// ─────────────────────────────────────────────────────────────────────────────
//  ALIAS TRACKING
// ─────────────────────────────────────────────────────────────────────────────

/** alias identifier text → original symbol name  */
const aliasMap = new Map();

function recordAlias(id, originalSym) {
    if (!id || !originalSym) return;
    const origName = originalSym.getName();
    if (id.text !== origName) aliasMap.set(id.text, origName);
}

function resolveAliasName(name) {
    return aliasMap.get(name) ?? name;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TYPE EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractTypes(node) {
    if (!node) return ['void'];

    // Strip Promise<…>
    while (
        ts.isTypeReferenceNode(node) &&
        ts.isIdentifier(node.typeName) &&
        node.typeName.escapedText === 'Promise'
        ) {
        if (!node.typeArguments?.length) return ['void'];
        node = node.typeArguments[0];
    }

    // Union / Intersection → flatten
    if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        return node.types.flatMap(t => extractTypes(t));
    }

    // Foo[] / Array<Foo>
    if (ts.isArrayTypeNode(node)) {
        return extractTypes(node.elementType).map(t => t + '[]');
    }

    // TypeReference – may be aliased
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

    // Inline object literal – create shim immediately
    if (ts.isTypeLiteralNode(node)) {
        // Try to find a surrounding type alias to name this shim.
        let aliasName;
        for (let p = node.parent; p; p = p.parent) {
            if (ts.isTypeAliasDeclaration(p)) {
                aliasName = p.name.text;
                break;
            }
        }

        const shimName = aliasName ?? 'Anonymous_' + Math.random().toString(36).slice(2, 10);
        const isExternal = sourceIsExternal(node.getSourceFile());
        generateObjectShim(shimName, node, isExternal);
        return [shimName];
    }

    // Fallback: raw text
    return [node.getFullText(node.getSourceFile()).trim()];
}

function extractParameters(params) {
    return params.map(p => ({
        name: p.name.getText(p.getSourceFile()),
        type: p.type ? p.type.getFullText(p.getSourceFile()).trim() : 'any',
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  SHIM GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function generateObjectShim(name, typeLiteral, isExternal) {
    if (visited.has(name)) return;
    visited.add(name);

    const classInfo = { name, isExternal, methods: [] };

    typeLiteral.members.forEach(m => {
        if (!m.name || !m.type) return;
        const propName = m.name.getText(typeLiteral.getSourceFile());
        const returns = extractTypes(m.type);
        classInfo.methods.push({
            name: 'get' + propName[0].toUpperCase() + propName.slice(1),
            isAsync: false,
            parameters: [],
            returns,
            multiDef: [],
        });
        returns.forEach(t => { if (!isPrimitive(t)) resolveTypeToClass(t); });
    });

    classes.push(classInfo);
}

function addMethodToClassInfo(info, member, includeAll) {
    const isMethod = ts.isMethodDeclaration(member) || ts.isMethodSignature(member);
    if (!isMethod) return;
    if (!includeAll && !hasCodegen(member)) return;
    if (!member.name) return;

    const mName = member.name.getText(member.getSourceFile());
    const method = {
        name: mName,
        isAsync: member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
        parameters: extractParameters(member.parameters ?? []),
        returns: extractTypes(member.type),
        multiDef: [],
    };

    method.returns.forEach(t => { if (!isPrimitive(t)) resolveTypeToClass(t); });

    if (info.methods.has(mName)) {
        info.methods.get(mName).multiDef.push(method);
    } else {
        info.methods.set(mName, method);
    }
}

function visitClassOrInterface(decl, includeAllMethods) {
    if (!decl.name) return;
    const name = decl.name.text;
    if (visited.has(name)) return;
    visited.add(name);

    const isExternal = sourceIsExternal(decl.getSourceFile());
    const info = { name, isExternal, methods: new Map() };
    (decl.members ?? []).forEach(m => addMethodToClassInfo(info, m, includeAllMethods));
    info.methods = [...info.methods.values()];
    classes.push(info);
}

function visitTypeAlias(decl, includeAll) {
    const name = decl.name.text;
    if (visited.has(name)) return;

    if (ts.isTypeLiteralNode(decl.type)) {
        const isExternal = sourceIsExternal(decl.getSourceFile());
        generateObjectShim(name, decl.type, isExternal);
    } else {
        extractTypes(decl.type).forEach(t => resolveTypeToClass(t));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TYPE RESOLUTION (alias‑safe)
// ─────────────────────────────────────────────────────────────────────────────

function resolveTypeToClass(typeText) {
    const aliasResolved = resolveAliasName(typeText);
    const cleaned = normalizeTypeName(aliasResolved);
    if (!cleaned || isPrimitive(cleaned)) return;

    // Try the checker first – guarantees we follow aliases correctly.
    // const sym = checker.resolveName(
    //     aliasResolved,
    //     /*location*/ undefined,
    //     ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Alias,
    //     /*excludeGlobals*/ false,
    // );
    //
    // if (sym) {
    //     const target = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
    //     if (visitedSymbols.has(target)) return;
    //     visitedSymbols.add(target);
    //
    //     for (const d of target.declarations ?? []) {
    //         if (ts.isClassDeclaration(d) || ts.isInterfaceDeclaration(d)) {
    //             visitClassOrInterface(d, true);
    //         } else if (ts.isTypeAliasDeclaration(d)) {
    //             visitTypeAlias(d, true);
    //         }
    //     }
    //     return; // done – we resolved via symbol
    // }

    // Symbol not found — fallback: scan by cleaned name (might be re‑exported)
    if (visited.has(cleaned)) return;
    program.getSourceFiles().forEach(sf => {
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
//  ROOT WALK
// ─────────────────────────────────────────────────────────────────────────────

console.log(program.getSourceFiles().length);

program.getSourceFiles().forEach(sf => {
    if (!sf.fileName.startsWith(PROJECT_SRC)) return;
    ts.forEachChild(sf, node => {
        if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && hasCodegen(node)) {
            visitClassOrInterface(node, false);
        }
        if (ts.isTypeAliasDeclaration(node) && hasCodegen(node)) {
            visitTypeAlias(node, false);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHP GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function mapTypeToPHP(type) {
    if (type.endsWith('[]') || /^Array<.*>$/.test(type) || type === 'Array') return 'array';
    if (PRIMITIVES.has(type)) {
        switch (type) {
            case 'string': return 'string';
            case 'number': return 'float';
            case 'boolean': return 'bool';
            case 'void': return 'void';
            default: return 'mixed';
        }
    }
    return resolveAliasName(type);
}

function generatePHPMethod(method) {
    const docReturn = method.returns.join('|');
    const hints = [...new Set(method.returns.map(mapTypeToPHP))];
    let returnHint = hints.length === 1 ? hints[0] : 'mixed';
    if (hints.includes('void')) returnHint = 'void';

    const params = method.parameters.map(p => `${mapTypeToPHP(p.type)} $${p.name}`).join(', ');
    const argArr = method.parameters.length ? `, [${method.parameters.map(p => `$${p.name}`).join(', ')}]` : '';
    const call = `${returnHint === 'void' ? '' : 'return '} $this->callMethod('${method.name}'${argArr});`;

    return [
        '    /**',
        `     * @returns ${docReturn}`,
        '     */',
        `    public function ${method.name}(${params}): ${returnHint}`,
        '    {',
        `        ${call}`,
        '    }',
    ].join('\n');
}

function emitPHPClass(info) {
    const namespace = info.isExternal ? 'Puth\\Generics\\External' : 'Puth\\Generics\\Puth';
    const oppositeNs = info.isExternal ? 'Puth\\Generics\\Puth' : 'Puth\\Generics\\External';

    const uses = new Set();
    const consider = t => {
        const base = normalizeTypeName(resolveAliasName(t).replace(/\[\]$/, ''));
        if (isPrimitive(base)) return;
        const cls = classes.find(c => c.name === base);
        if (cls && cls.isExternal !== info.isExternal) uses.add(`${oppositeNs}\\${base}`);
    };
    info.methods.forEach(m => {
        m.returns.forEach(consider);
        m.parameters.forEach(p => consider(p.type));
    });

    const useLines = [...uses].map(u => `use ${u};`).join('\n');
    const methodsCode = info.methods.map(generatePHPMethod).join('\n\n');

    const content = [
        '<?php',
        '',
        `namespace ${namespace};`,
        '',
        'use Puth\\GenericObject;'
        + (useLines ? `\n${useLines}` : ''),
        '',
        `class ${info.name} extends GenericObject`,
        '{',
        methodsCode,
        '}',
        '',
    ].join('\n');

    return { ...info, content };
}

const phpDefs = classes.map(emitPHPClass);
phpDefs.forEach(def => {
    const dir = path.join(PHP_OUT_BASE, def.isExternal ? 'External' : 'Puth');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${def.name}.php`), def.content, 'utf8');
});
