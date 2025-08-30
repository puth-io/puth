import path, {join} from "node:path";
import fs from "node:fs";
import {classes, isPrimitive, NAME_TRANSLATION, normalizeTypeName, resolveAliasName} from "../codegen-clients";

const OUT_BASE = path.join(import.meta.dirname, '../../workspaces/clients/java/client/src/main/java/io/puth/remote');

const NS_INTERNAL = 'io.puth.remote';
const NS_EXTERNAL = 'io.puth.remote.external';

export function generate() {
    classes.forEach(cls => generateClass(cls));
}

export function generateClass(cls) {
    const ns = cls.isExternal ? NS_EXTERNAL : NS_INTERNAL;
    const oppositeNs = cls.isExternal ? NS_INTERNAL : NS_EXTERNAL;
    
    // Build a set of cross‑namespace import lines
    let uses = new Set();
    // Iterate regardless of Map or Array structure
    /*const iter = cls.methods instanceof Map ? cls.methods.values() : cls.methods;
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
    }*/
    uses = Array.from(uses);
    
    const methodsArray = cls.methods instanceof Map ? Array.from(cls.methods.values()) : cls.methods;
    console.log(cls.name, methodsArray);
    
    const content = [
        `package ${ns};`,
        '',
        'import io.puth.RemoteObject;',
        'import java.util.Map;',
        ...Array.from(uses).map(u => `use ${u};`),
        '',
        '/**',
        cls.comments.map(c => `* ${c ?? ''}`).join('\n'),
        '*/',
        `public class ${cls.name} extends RemoteObject {`,
        `    public ${cls.name}(String id, String type, String represents, RemoteObject parent, io.puth.Context context) {`,
        '        super(id, type, represents, parent, context);',
        '    }',
        '',
        methodsArray.map(m => generateMethod(cls.name, m)).join('\n\n'),
        '}',
        '',
    ].join('\n');
    
    const dir = path.join(OUT_BASE, cls.isExternal ? 'External' : '');
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, `${cls.name}.java`), content, 'utf8');
    console.log(path.join(dir, `${cls.name}.java`));
}

function generateMethod(className, method, optionalIdx = null) {
    let {name, isAsync, parameters, returns, comments} = method;
    
    let extra = null;
    if (optionalIdx == null) {
        console.log(parameters);
        let extraTemp = parameters.map((v, i) => generateMethod(className, method, i)).filter(i => !!i);
        if (extraTemp.length !== 0) {
            extra = extraTemp.join('\n\n') + '\n';
        }
    }
    
    console.log('-----------------------------------------------------', optionalIdx);
    
    const returnHintRaw = returns.length > 1 ? returns.join('|') : returns[0];
    
    // Determine PHP return type
    let rtn = 'Object';
    if (returns.length === 1) {
        rtn = mapType(returns[0], className);
    } else {
        const mapped = Array.from(new Set(returns.map(t => mapType(t, className))));
        if (mapped.length === 1) {
            rtn = mapped[0];
        }
    }
    
    let rest = [];
    if (optionalIdx != null) {
        if (parameters[optionalIdx].initializer == null && parameters[optionalIdx].isOptional === false) {
            console.log(optionalIdx, 'initializer null');
            return;
        }
        rest = parameters.slice(optionalIdx);
        parameters = parameters.slice(0, optionalIdx);
    }
    
    const params = parameters.map(p => `${mapType(p.type, className)} ${p.name}`).join(', ');
    let argArray = `, new Object[]{${parameters.map(p => `${p.name}`).join(', ')}}`;
    let callLine = `${rtn === 'void' ? '' : `return (${rtn}) `}this.callFunc("${name}"${argArray});`;
    
    let nameTranslated = NAME_TRANSLATION?.php?.default?.[className]?.[name] ?? name;
    nameTranslated = NAME_TRANSLATION?.php?.laravel?.[className]?.[name] ?? nameTranslated;
    
    console.log({parameters, params});
    
    if (optionalIdx != null) {
        let args = parameters.map(p => `${p.name}`);
        rest.forEach(p => args.push(typeInitializer(p, className)));
        callLine = `${rtn === 'void' ? '' : `return `}this.${nameTranslated}(${args.join(', ')});`;
    } else {
        console.log(nameTranslated, parameters);
    }
    
    if (nameTranslated === 'createBrowserShim' && optionalIdx == null) {
        // process.exit(0);
    }
    
    return [
        extra,
        //'    /**',
        //comments.map(c => `     * ${c}`).join('\n'),
        //'     */',
        `    public ${rtn} ${nameTranslated}(${params}) {`,
        `        ${callLine}`,
        '    }',
    ].filter(i => !!i).join('\n');
}

function mapType(type, className) {
    if (!type) {
        return 'Object';
    }
    if (type === 'this') {
        return className;
    }
    if (type === 'RemoteObject') {
        return 'RemoteObject';
    }
    if (type.endsWith('[]')) {
        return `${mapType(type.replace('[]', ''))}[]`;
    }
    if (/^Array<.*>$/.test(type) || type === 'Array') {
        return 'array';
    }
    if (type === 'object') {
        return 'Map<String, Object>';
    }
    if (type === 'any') {
        return 'Object';
    }
    
    const base = normalizeTypeName(resolveAliasName(type));
    if (isPrimitive(base)) {
        switch (base) {
            case 'string':
                return 'String';
            case 'number':
                return 'float';
            case 'boolean':
                return 'boolean';
            case 'void':
                return 'void';
            case 'int':
                return 'int';
            /*default:
                return 'Object';*/
        }
    }
    if (classes.find(c => c.name === base)) {
        return base;
    }
    return 'Object';
}

function typeInitializer(p, className) {
    if (p.isOptional) {
        return 'null';
    }
    
    if (p.initializer) {
        if (p.initializer.type === 'object') {
            return `Map.of(${p.initializer.members.map(i => {
                let value = i.type;
                if (i.type === 'string') value = `"${i.value}"`;
                else if (i.type === 'numeric') value = parseInt(i.value);
                
                return `"${i.key}", ${value}`;
            }).join(', ')})`;
        } else if (p.initializer.type === 'array') {
            // TODO support array members
            // return ` = [${p.initializer.members.map(i => {
            //     let value = i.type;
            //     if (i.type === 'string') value = `'${i.value}'`;
            //     else if (i.type === 'numeric') value = parseInt(i.value);
            //
            //     return `'${i.key}' => ${value}`;
            // }).join(', ')}]`;
            
            let type = mapType(p.type.replace('[]', ''), className);
            return `new ${type}[]{}`;
        } else if (p.initializer.type === 'null') {
            return `null`;
        }  else if (p.initializer.type === 'false') {
            return `false`;
        }  else if (p.initializer.type === 'true') {
            return `true`;
        } else if (p.initializer.value != null) {
            if (p.type === 'int') return p.initializer.value;
            else if (p.type === 'string') return `"${p.initializer.value}"`;
        }
    }
    
    return '';
}
