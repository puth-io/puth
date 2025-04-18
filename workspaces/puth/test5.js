import * as ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/** Entry file(s) that seed the TypeScript program. */
const entryFiles = ['src/index.ts'];

/** Build a TypeScript `Program` covering the whole dependency graph. */
const program = ts.createProgram(entryFiles, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    lib: ['ES2022', 'dom'],
    noImplicitAny: true,
    resolveJsonModule: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
});
const typeChecker = program.getTypeChecker();

// ─────────────────────────────────────────────────────────────────────────────
//  ACCUMULATED METADATA
// ─────────────────────────────────────────────────────────────────────────────

const classes = [];            // every generated class definition
const visitedTypes = new Set(); // guard against infinite recursion

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when `node` has a leading line‑/block‑comment containing “@codegen”. */
function hasCodegen(node) {
    const src = node.getSourceFile().text;
    const ranges = ts.getLeadingCommentRanges(src, node.pos) || [];
    return ranges.some(r => src.slice(r.pos, r.end).includes('@codegen'));
}

function isExternalDeclaration(decl) {
    const source = decl.getSourceFile().fileName;
    const projectRoot = path.resolve('src');
    return !path.resolve(source).startsWith(projectRoot);
}

function extractTypes(typeNode) {
    if (!typeNode) return ['void'];

    // Unwrap Promise<T>
    if (
        ts.isTypeReferenceNode(typeNode) &&
        ts.isIdentifier(typeNode.typeName) &&
        typeNode.typeName.escapedText === 'Promise'
    ) {
        if (!typeNode.typeArguments || typeNode.typeArguments.length === 0) return ['void'];
        return extractTypes(typeNode.typeArguments[0]);
    }

    // Union types → return individual member strings
    if (ts.isUnionTypeNode(typeNode)) {
        return typeNode.types.map(t => t.getFullText(typeNode.getSourceFile()).trim());
    }

    return [typeNode.getFullText(typeNode.getSourceFile()).trim()];
}

function extractParameters(parameters) {
    return parameters.map(p => ({
        name: p.name.getText(p.getSourceFile()),
        type: p.type ? p.type.getFullText(p.getSourceFile()).trim() : 'any',
    }));
}

function getReturnInfo(typeNode) {
    if (!typeNode)
        return {
            isPromise: false,
            types: ['void'],
        };

    const isPromise =
        ts.isTypeReferenceNode(typeNode) &&
        ts.isIdentifier(typeNode.typeName) &&
        typeNode.typeName.escapedText === 'Promise';

    return { isPromise, types: extractTypes(typeNode) };
}

/** Queue up generation for the given type name (recurses if it’s a class). */
function resolveTypeToClass(typeName) {
    const clean = typeName.replace(/\[\]$/, ''); // strip []
    if (visitedTypes.has(clean)) return;

    const symbol = typeChecker.resolveName(clean, undefined, ts.SymbolFlags.Type, false);
    if (!symbol || !symbol.declarations) return;

    for (const decl of symbol.declarations) {
        if (ts.isClassDeclaration(decl)) visitClass(decl, /*forceIncludeAllMethods*/ true);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  AST  →  METADATA PASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates metadata for a class declaration. If `forceIncludeAllMethods` is
 * true, every method is captured regardless of @codegen annotation.
 */
function visitClass(node, forceIncludeAllMethods = false) {
    if (!ts.isClassDeclaration(node) || !node.name) return;

    const className = node.name.text;
    if (visitedTypes.has(className)) return;
    visitedTypes.add(className);

    // For classes inside src we require @codegen unless an upstream dependency
    // forced us in (forceIncludeAllMethods).
    const external = isExternalDeclaration(node);
    if (!external && !forceIncludeAllMethods && !hasCodegen(node)) return;

    const classInfo = {
        name: className,
        isExternal: external,
        methods: [],
    };

    const includeAllMethods = external || forceIncludeAllMethods;

    for (const member of node.members) {
        if (!ts.isMethodDeclaration(member) || !member.name) continue;

        if (!includeAllMethods && !hasCodegen(member)) continue;

        const method = {
            name: member.name.escapedText.toString(),
            parameters: extractParameters(member.parameters),
            returns: getReturnInfo(member.type),
            multiDef: [],
        };

        // Skip overload "this" params
        if (method.parameters.some(p => p.name === 'this')) continue;

        // Recurse into return types
        for (const rt of method.returns.types) {
            if (
                !rt.match(
                    /^(string|number|boolean|any|void|null|undefined|Array|mixed|this|Uint8Array|\[.*\]|\(.*\))$/,
                )
            ) {
                resolveTypeToClass(rt);
            }
        }

        const existing = classInfo.methods.find(m => m.name === method.name);
        if (existing) existing.multiDef.push(method);
        else classInfo.methods.push(method);
    }

    classes.push(classInfo);
}

// ─────────────────────────────────────────────────────────────────────────────
//  BOOTSTRAP – start with annotated root classes
// ─────────────────────────────────────────────────────────────────────────────

for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;
    if (!sf.fileName.startsWith(path.resolve('src'))) continue; // only user code

    ts.forEachChild(sf, node => {
        if (ts.isClassDeclaration(node) && node.name && hasCodegen(node)) {
            visitClass(node);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  METADATA  →  PHP GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function phpNamespace(cls) {
    return cls.isExternal ? 'Puth\\Generics\\External' : 'Puth\\Generics\\Puth';
}

function mapTypeToPHP(type) {
    if (type === 'string') return 'string';
    if (type === 'number') return 'float';
    if (type === 'boolean') return 'bool';
    if (type === 'any' || type === 'mixed') return 'mixed';
    if (type === 'void') return 'void';
    if (type === 'null' || type === 'undefined') return 'null';
    if (type === 'Uint8Array') return 'array';
    if (type.endsWith('[]') || type === 'Array') return 'array';
    return type;
}

function collectImports(current) {
    const imports = new Set();
    const currentNs = phpNamespace(current);

    const ensureImport = typeName => {
        const base = typeName.replace(/\[\]$/, '');
        const def = classes.find(c => c.name === base);
        if (!def) return;
        const ns = phpNamespace(def);
        if (ns !== currentNs) imports.add(`use ${ns}\\${base};`);
    };

    for (const m of current.methods) {
        m.parameters.forEach(p => ensureImport(p.type));
        m.returns.types.forEach(t => ensureImport(t));
        m.multiDef.forEach(s => {
            s.parameters.forEach(p => ensureImport(p.type));
            s.returns.types.forEach(t => ensureImport(t));
        });
    }

    return [...imports];
}

function generatePHPMethod(cls, method) {
    const { name, parameters, returns } = method;
    const { types } = returns;

    let returnTypeHint;
    if (types.includes('Array') || types.some(t => t.endsWith('[]'))) {
        returnTypeHint = 'array';
    } else if (types.length === 1) {
        returnTypeHint = mapTypeToPHP(types[0]);
    } else {
        const mapped = Array.from(new Set(types.map(mapTypeToPHP)));
        returnTypeHint = mapped.includes('mixed') ? 'mixed' : mapped.join('|');
    }

    const paramStr = parameters.map(p => `${mapTypeToPHP(p.type)} $${p.name}`).join(', ');
    const argsArr = parameters.length ? `, [${parameters.map(p => `$${p.name}`).join(', ')}]` : '';
    const call = `${returnTypeHint === 'void' ? '' : 'return '}$this->callMethod('${name}'${argsArr});`;

    return [
        '    /**',
        `     * @returns ${types.join('|')}`,
        '     */',
        `    public function ${name}(${paramStr})${returnTypeHint ? `: ${returnTypeHint}` : ''}`,
        '    {',
        `        ${call}`,
        '    }',
    ].join('\n');
}

function generatePHPClass(def) {
    const ns = phpNamespace(def);
    const imports = collectImports(def);
    const methods = def.methods.map(m => generatePHPMethod(def, m)).join('\n\n');

    const content = `<?php\n\nnamespace ${ns};\n\nuse Puth\\GenericObject;\n${imports.length ? imports.join('\n') + '\n' : ''}\nclass ${def.name} extends GenericObject\n{\n${methods}\n}`;

    return {
        name: def.name,
        content,
        targetFolder: def.isExternal ? 'Generics/External' : 'Generics/Puth',
    };
}

function writePhpFiles() {
    const outRoot = path.resolve('../clients/php/client/src');
    for (const cls of classes) {
        const { name, content, targetFolder } = generatePHPClass(cls);
        const dir = path.join(outRoot, targetFolder);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${name}.php`), content, 'utf8');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────

writePhpFiles();
console.log('Generated shims for:', classes.map(c => c.name));
