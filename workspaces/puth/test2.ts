import * as ts from 'typescript';

const program = ts.createProgram(['src/index.ts'], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    lib: [
        'ES2022',
        'dom',
    ],
    noImplicitAny: true,
    // moduleResolution: 'node',
    resolveJsonModule: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
});

const checker = program.getTypeChecker();

// program.getSourceFiles().forEach(sourceFile => {
//     if (!sourceFile.fileName.endsWith(".d.ts")) {
//         return;
//     }
//     if (sourceFile.fileName.includes("node_modules") && !sourceFile.fileName.includes('puppeteer')) {
//         return;
//     }
//
//     // console.log(sourceFile.fileName);
//     // analyzeSourceFile(sourceFile);
// });

function analyzeSourceFile(sourceFile) {
    const classMap = new Map();
    
    function classDeclaration(node: ts.ClassDeclaration) {
        node = node as ts.ClassDeclaration;
        const className = node.name.text;
        classMap.set(className, node);
        printClassMethods(node);
    }
    
    function visit(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.ClassDeclaration) {
            classDeclaration(node as any);
        }
        if (node.kind === ts.SyntaxKind.ExportAssignment) {
            console.log(`Default Export: ${node.expression.escapedText || node.expression.getText()}`);
        }
        
        ts.forEachChild(node, visit);
    }
    
    function method(member: ts.MethodDeclaration) {
        const methodName = member.name.escapedText;
        
        console.log(`  Methode: ${methodName}`);
        
        
        // console.log(member);
        if (member?.type?.getFullText(sourceFile).trim() === 'Promise<PuthBrowser>') {
            console.log('--------------------------------------------');
            // console.log(member);
            if (ts.getJSDocTags(member).find(node => node.tagName.escapedText === ''))
            console.log()
            // console.log(member.type.getFullText(sourceFile).trim());
            // console.log(ts.SyntaxKind[member.type.kind]);
            // console.log(member.type.typeName.escapedText);
            // console.log(member.type.typeArguments[0].kind); // TypeReference
            // console.log(member.type.typeArguments[0].typeName); //
            //
            // checker.getTypeAtLocation(member.type.typeArguments[0].typeName).types.forEach(type => {
            //     console.log(type.symbol.members);
            // })
            //
            console.log('--------------------------------------------');
            throw new Error('');
        }
    }
    
    function printClassMethods(classNode: ts.ClassDeclaration) {
        classNode.members.forEach((member) => {
            if (member.kind === ts.SyntaxKind.MethodDeclaration && member.name) {
                method(member as any);
            }
        });
    }
    
    visit(sourceFile);
}

analyzeSourceFile(program.getSourceFile('src/Context.ts'));
