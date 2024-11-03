import * as ts from 'typescript';
import fs from 'node:fs';

const path = '../../node_modules/puppeteer-core/lib/esm/puppeteer/index.d.ts';
const content = fs.readFileSync(path, 'utf8');

let ast = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

function extractTypes(typeNode) {
    if (!typeNode) {
        throw new Error('undefined typeNode');
    }
    
    if (typeNode.kind === ts.SyntaxKind.TypeReference && typeNode.typeName.escapedText === 'Promise') {
        if (typeNode.typeArguments.length < 1) {
            return ['void'];
        }
        typeNode = typeNode.typeArguments[0];
    }
    
    if (typeNode.kind === ts.SyntaxKind.UnionType) {
        return typeNode.types.map(t => t.getFullText(ast).trim());
    }
    
    return [typeNode.getFullText(ast).trim()];
}

// function extractPromiseTypes(typeNode) {
//     if (typeNode.kind === ts.SyntaxKind.TypeReference && typeNode.typeName.escapedText === 'Promise') {
//         const typeArguments = typeNode.typeArguments;
//         if (typeArguments && typeArguments.length > 0) {
//             const innerType = typeArguments[0];
//             if (innerType.kind === ts.SyntaxKind.UnionType) {
//                 return innerType.types.map(t => t.getFullText(ast).trim());
//             } else {
//                 return [innerType.getFullText(ast).trim()];
//             }
//         }
//     }
//     return null;
// }

function extractParameters(parameters) {
    return parameters.map(param => {
        const paramName = param.name.getText(ast);
        const paramType = param.type ? param.type.getFullText(ast).trim() : 'any';
        return {
            name: paramName,
            type: paramType,
        };
    });
}

function returns(typeNode) {
    const returnsPromise = typeNode.kind === ts.SyntaxKind.TypeReference && typeNode.typeName.escapedText === 'Promise';
    const promiseTypes = extractTypes(typeNode);
    
    return {
        isPromise: returnsPromise,
        types: promiseTypes,
    };
}

const classes = [];

function visit(node) {
    if (node.kind === ts.SyntaxKind.ClassDeclaration && node.name) {
        console.log(node);
        const classInfo = {
            name: node.name.text,
            methods: new Map(),
        };
        
        node.members.forEach(member => {
            if (member.kind === ts.SyntaxKind.MethodDeclaration && member.name) {
                const methodInfo = {
                    name: member.name.escapedText,
                    isAsync: member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
                    parameters: extractParameters(member.parameters),
                    returns: returns(member.type),
                    multiDef: [],
                };
                
                if (methodInfo.parameters.find(param => param.name === 'this')) {
                    return;
                }
                console.log('-----------------------');
                console.log(methodInfo.parameters.find(param => param.name === 'this'));
                console.log(methodInfo.parameters);
                // if (methodInfo.name === 'contentFrame') {
                //     throw new Error('');
                // }
                
                if (classInfo.methods.has(methodInfo.name)) {
                    let first = classInfo.methods.get(methodInfo.name);
                    first.multiDef.push(methodInfo);
                } else {
                    classInfo.methods.set(methodInfo.name, methodInfo);
                }
            }
        });
        classInfo.methods = [...classInfo.methods.values()];
        
        classes.push(classInfo);
    }
    
    ts.forEachChild(node, visit);
}

visit(ast);

console.log(classes[1]);
// console.log(classes[13].methods[8]);

// import * as Test from 'puppeteer-core/lib/types';
// console.log(Test);

function mapTypeToPHP(type, classes) {
    if (type === 'string') {
        return 'string';
    }
    if (type === 'number') {
        return 'float';
    }
    if (type === 'boolean') {
        return 'bool';
    }
    if (type === 'any') {
        return 'mixed';
    }
    if (type === 'void') {
        return 'void';
    }
    if (type === 'mixed') {
        return 'mixed';
    }
    if (type === 'Promise') {
        return '';
    }
    if (type === 'undefined') {
        return 'null';
    }
    if (type === 'null') {
        return 'null';
    }
    if (type === 'this') {
        return 'static';
    }
    if (type === 'Uint8Array') {
        return 'array';
    }
    
    if (classes.find(def => def.name === type)) {
        return type;
    }
    
    return 'mixed';
}

function generatePHPMethod(className, method, classes) {
    const {name, isAsync, returns, parameters} = method;
    const {isPromise, types} = returns;
    const returnTypeComment = types.length > 1 ? types.join('|') : types[0];
    
    let skip = name.startsWith('$');
    if (skip) {
        console.warn('Skipped ' + className + ' ' + name);
    }
    
    let returnTypeHint;
    if (types.includes('Array') || types.some(type => type.endsWith('[]'))) {
        returnTypeHint = 'array';
    } else if (types.length === 1) {
        returnTypeHint = mapTypeToPHP(types[0], classes);
    } else {
        let a = types.map(type => mapTypeToPHP(type, classes));
        if (a.includes('mixed')) {
            a = ['mixed'];
        }
        if (a.includes('void')) {
            a = ['void'];
        }
        returnTypeHint = a.filter(i => !!i).join('|');
    }
    
    let phpParameters = parameters.map(param => `${mapTypeToPHP(param.type, classes)} $${param.name}`).join(', ');
    
    let args = parameters.length === 0 ? ''
        : `, [${parameters.map(param => `$${param.name}`).join(', ')}]`;
    let call = `${returnTypeHint === 'void' ? '' : 'return '}$this->callMethod('${name}'${args});`;
    
    return [
        `    /**`,
        `    * @returns ${returnTypeComment}`,
        `    */`,
        `    ${skip ? '// ' : ''}public function ${name}(${phpParameters}): ${returnTypeHint}`,
        `    ${skip ? '// ' : ''}{`,
        `    ${skip ? '// ' : ''}    ${call}`,
        `    ${skip ? '// ' : ''}}`,
    ].join('\n');
}

function generatePHPClasses(classData, classes) {
    const {name, methods} = classData;
    
    return `<?php

namespace Puth\\Generics\\Puppeteer;

use Puth\\GenericObject;

class ${name} extends GenericObject
{
${methods.map(method => generatePHPMethod(name, method, classes)).join('\n\n')}
}`;
}

function generatePhp(classes) {
    return classes.map(def => ({
        name: def.name,
        content: generatePHPClasses(def, classes),
    }));
}

let php = generatePhp(classes);
php.forEach(def => fs.writeFileSync('../clients/php/client/src/Generics/Puppeteer/' + def.name + '.php', def.content, 'utf8'));
