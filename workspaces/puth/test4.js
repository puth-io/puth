import * as ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_SRC = path.resolve('src');

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

const classes = [];
const visited = new Set(); // shim names already generated

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITIES
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
]);

function isPrimitive(txt) {
    return PRIMITIVES.has(txt) || /^(?:string|number|boolean)\[\]$/.test(txt);
}

function hasCodegen(node) {
    const src = node.getSourceFile().text;
    const ranges = ts.getLeadingCommentRanges(src, node.pos) || [];
    return ranges.some(r => src.slice(r.pos, r.end).includes('@codegen'));
}

function normalizeTypeName(txt) {
    let out = txt.trim();
    out = out.replace(/^Array<(.+)>$/u, '$1'); // Array<T>
    out = out.replace(/\[\]$/u, ''); // T[]
    out = out.replace(/import\([^)]*\)\./u, ''); // import("foo").Bar
    out = out.replace(/<.*>/u, ''); // Foo<T>
    return out.split('.').pop();
}

// ─────────────────────────────────────────────────────────────────────────────
//  TYPE EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractTypes(node) {
    if (!node) return ['void'];

    // unwrap Promise<…>
    while (
        ts.isTypeReferenceNode(node) &&
        ts.isIdentifier(node.typeName) &&
        node.typeName.escapedText === 'Promise'
        ) {
        if (!(node.typeArguments?.length)) return ['void'];
        node = node.typeArguments[0];
    }

    if (ts.isUnionTypeNode(node)) {
        return node.types.flatMap(t => extractTypes(t));
    }

    if (ts.isIntersectionTypeNode(node)) {
        return node.types.flatMap(t => extractTypes(t));
    }

    if (ts.isTypeLiteralNode(node)) {
        // anonymous object literal – give it synthetic shim name
        const anonName = 'Anonymous_' + Math.random().toString(36).slice(2, 10);
        generateObjectShim(anonName, node, /*isExternal*/ false);
        return [anonName];
    }

    return [node.getFullText(node.getSourceFile()).trim()];
}

function extractParameters(params) {
    return params.map(p => ({
        name: p.name.getText(p.getSourceFile()),
        type: p.type ? p.type.getFullText(p.getSourceFile()).trim() : 'any',
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  SHIM GENERATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateObjectShim(name, typeLiteral, isExternal) {
    if (visited.has(name)) return;
    visited.add(name);

    const classInfo = { name, isExternal, methods: [] };

    typeLiteral.members.forEach(m => {
        if (!m.name) return;
        const propName = m.name.getText(typeLiteral.getSourceFile());
        const returns = m.type ? extractTypes(m.type) : ['mixed'];
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

function addMethodToClassInfo(info, member, includeAllMethods) {
    const methodKind = ts.isMethodDeclaration(member) || ts.isMethodSignature(member);
    if (!methodKind) return;
    if (!includeAllMethods && !hasCodegen(member)) return;
    if (!member.name) return;

    const methodName = member.name.getText(member.getSourceFile());
    const method = {
        name: methodName,
        isAsync: member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
        parameters: extractParameters(member.parameters ?? []),
        returns: extractTypes(member.type),
        multiDef: [],
    };

    // recurse into return types
    method.returns.forEach(t => { if (!isPrimitive(t)) resolveTypeToClass(t); });

    if (info.methods.has(method.name)) {
        info.methods.get(method.name).multiDef.push(method);
    } else {
        info.methods.set(method.name, method);
    }
}

function visitClassOrInterface(decl, includeAllMethods) {
    if (!decl.name) return;
    const name = decl.name.text;
    if (visited.has(name)) return;
    visited.add(name);

    const isExternal = !path.resolve(decl.getSourceFile().fileName).startsWith(PROJECT_SRC);
    const classInfo = { name, isExternal, methods: new Map() };

    (decl.members ?? []).forEach(m => addMethodToClassInfo(classInfo, m, includeAllMethods));

    classInfo.methods = [...classInfo.methods.values()];
    classes.push(classInfo);
}

function visitTypeAlias(decl, includeAllMethods) {
    const name = decl.name.text;
    if (visited.has(name)) return;

    // If RHS is an object literal → create shim with the alias' name
    if (ts.isTypeLiteralNode(decl.type)) {
        const isExternal = !path.resolve(decl.getSourceFile().fileName).startsWith(PROJECT_SRC);
        generateObjectShim(name, decl.type, isExternal);
        return;
    }

    // Otherwise just follow through its member types
    extractTypes(decl.type).forEach(t => resolveTypeToClass(t));
}

// ─────────────────────────────────────────────────────────────────────────────
//  TYPE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

function resolveTypeToClass(typeText) {
    const id = normalizeTypeName(typeText);
    if (!id || visited.has(id) || isPrimitive(id)) return;

    // checker‑based resolution first
    const sym = checker.resolveName(id, undefined,
        ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias,
        false,
    );
    if (sym?.declarations?.length) {
        sym.declarations.forEach(d => {
            if (ts.isClassDeclaration(d) || ts.isInterfaceDeclaration(d)) {
                visitClassOrInterface(d, true);
            } else if (ts.isTypeAliasDeclaration(d)) {
                visitTypeAlias(d, true);
            }
        });
        return;
    }

    // brute scan fallback
    program.getSourceFiles().forEach(sf => {
        ts.forEachChild(sf, node => {
            if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name?.text === id) {
                visitClassOrInterface(node, true);
            }
            if (ts.isTypeAliasDeclaration(node) && node.name.text === id) {
                visitTypeAlias(node, true);
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT WALK
// ─────────────────────────────────────────────────────────────────────────────

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
//  PHP GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function mapTypeToPHP(type) {
    if (PRIMITIVES.has(type)) {
        switch (type) {
            case 'string': return 'string';
            case 'number': return 'float';
            case 'boolean': return 'bool';
            case 'void': return 'void';
            default: return 'mixed';
        }
    }
    return type;
}

function generatePHPMethod(method) {
    const returns = method.returns.length > 1 ? method.returns.join('|') : method.returns[0];
    const returnHint = method.returns.length === 1 ? mapTypeToPHP(method.returns[0]) : 'mixed';
    const paramList = method.parameters.map(p => `${mapTypeToPHP(p.type)} $${p.name}`).join(', ');
    const args = method.parameters.length ? `, [${method.parameters.map(p => `$${p.name}`).join(', ')}]` : '';
    const callLine = `${returnHint === 'void' ? '' : 'return '} $this->callMethod('${method.name}'${args});`;
    return [
        '    /**',
        `     * @returns ${returns}`,
        '     */',
        `    public function ${method.name}(${paramList}): ${returnHint}`,
        '    {',
        `        ${callLine}`,
        '    }',
    ].join('\n');
}

function emitPHPClass(info) {
    const ns = info.isExternal ? 'Puth\\Generics\\External' : 'Puth\\Generics\\Puth';
    const methods = info.methods.map(generatePHPMethod).join('\n\n');
    return `<?php\n\nnamespace ${ns};\n\nuse Puth\\GenericObject;\n\nclass ${info.name} extends GenericObject\n{\n${methods}\n}`;
}

// write shims
classes.forEach(def => {
    const dir = def.isExternal ? '../clients/php/client/src/Generics/External' : '../clients/php/client/src/Generics/Puth';
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${def.name}.php`), emitPHPClass(def), 'utf8');
});
