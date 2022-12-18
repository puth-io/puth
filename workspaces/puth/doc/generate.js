const fs = require('fs');

let typedoc = require('./src/test.json');

let TypesNotFound = new Set();

// let generateFilter = ['Browser'];
let generateFilter = [
    'Page',
    'JSHandle',
    'Browser',
    'Viewport',
    'Worker',
    'EventEmitter',
    'Target',
    'FileChooser',
    'HTTPRequest',
    'HTTPResponse',
    'ElementHandle',
    'Metrics',
    // 'Buffer', // is a generic node type
    'Frame',
    'BrowserContext',
    'Accessibility',
    'Coverage',
    'Keyboard',
    'Mouse',
    'Touchscreen',
    'Tracing',
    // TODO 'Cookie',
];

let languageMethodTranslations = {
  php: {
    '$': 'get',
    '$$': 'getAll',
    '$$eval': 'getAllEval',
    '$eval': 'getEval',
    '$x': 'getX',
  },
}

function sanitize(text) {
  return text.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function makeCommentString(comment) {
  return comment?.summary?.filter(i => ['text', 'code'].includes(i.kind))
          .map(i => sanitize(i.text))
          .join('')
          .replaceAll('\r\n', ' ')
      ?? '';
}

function translateMethodName(method, language) {
  return languageMethodTranslations?.[language]?.[method] ?? method;
}

let generateFor = typedoc.children.filter((e) => generateFilter.includes(e.name));

generateFor.forEach((def) => {
  console.log('Generating for ' + def.name);
  createClassFor(def);
});

function createClassFor(def) {
  let className = def.name;

  let start = `<?php

namespace Puth\\Objects;

use Puth\\GenericObject;

/**
 * Class ${className}
 * @package Puth\\Objects
 *\n`;

  let end = `\n*/
class ${className} extends GenericObject {}`;

  let methodComments = [];

  // if (className === 'Viewport') {
  //   console.log(def);
  // }

  function transformType(type) {
    if (type.type === 'intersection') {
      return 'mixed';
    }

    if (type.type === 'conditional') {
      return 'mixed';
    }

    if (type.type === 'reflection') {
      return 'mixed';
    }

    if (type.type === 'literal') {
      if (type.value === null) {
        return 'null';
      }

      return 'mixed';
    }

    if (type.type === 'union') {
      return [... new Set(type.types.map(t => transformType(t)))].join('|');
    }

    if (type.type === 'intrinsic') {
      // TODO decide if void function return self/$this
      // if (type.name === 'void') {
      //   return className;
      // }

      if (type.name === 'undefined') {
        return 'null';
      }

      if (type.name === 'unknown') {
        return 'mixed';
      }

      if (type.name === 'boolean') {
        return 'bool';
      }

      if (type.name === 'any') {
        return 'mixed';
      }

      if (type.name === 'symbol') {
        // Symbols are not supported
        return undefined;
      }

      return type.name;
    }

    if (type.type === 'array') {
      return transformType(type.elementType);
    }

    if (type.type === 'reference') {
      if (type.name === 'Promise') {
        return transformType(type.typeArguments[0]);
      }

      if (! generateFilter.includes(type.name)) {
        TypesNotFound.add(type.name);

        return 'mixed';
      }

      return type.name;
    }
  }

  let properties = def.children
      .filter((e) => e.kindString === 'Property' && ! e.flags?.isPrivate)
      .map((property) => {
        let type = transformType(property.type);
        let optional = property.flags?.isOptional ? '|null' : '';
        let comment = makeCommentString(property?.comment);

        return ` * @property ${type}${optional} $${property.name.replace(/^]+|]+$/g, "").replace(/^\[+|\[+$/g, "")} ${comment}`;
      });

  let methods = def.children
    .filter((e) => e.kindString === 'Method' && ! e.flags?.isPrivate)
    .map((method) => {
      let signature = method.signatures[0];
      let comment = makeCommentString(signature?.comment);

      function log(...rest) {
        // if (method.name === 'waitForFunction') {
        //   console.log(...rest);
        // }
      }

      // function resolveTypeToPhp(typeDef, isDef = false) {
      //   log('resolveTypeToPhp', typeDef);
      //
      //   if (isDef && typeDef.kindString && typeDef.kindString === 'Interface') {
      //     return typeDef.name;
      //   }
      //
      //   if (isDef) {
      //     if (typeDef.type) {
      //       typeDef = typeDef.type;
      //     } else {
      //       return;
      //     }
      //   }
      //
      //   if (typeDef.types) {
      //     return typeDef.types.map((type) => resolveTypeToPhp(type)).filter((t) => t)[0];
      //   }
      //
      //   if (typeDef.type) {
      //     if (typeDef.type === 'intrinsic') {
      //       if (typeDef.name === 'any') {
      //         return 'mixed';
      //       }
      //       if (typeDef.name === 'symbol') {
      //         // Symbols are not supported
      //         return undefined;
      //       }
      //       return typeDef.name;
      //     }
      //     if (typeDef.type === 'reflection') {
      //       // Set function type to string because you can't easily transfrom php functions to js function
      //       return 'string';
      //     }
      //     if (typeDef.type === 'array') {
      //       return 'array';
      //     }
      //     if (typeDef.type === 'literal') {
      //       return 'string';
      //     }
      //   }
      // }

      log('signature', signature);

      let parameters = signature.parameters
        ? signature.parameters
            .filter(parameter => parameter.name !== 'this')
            .map((parameter) => {
              let defaultNull = ' = null';

              let typeDef = parameter.type;
              let type = typeDef.type;

              let optionalOrRest = parameter.flags.isOptional || parameter.flags.isRest;
              let optional = optionalOrRest ? '|null' : '';
              let typeTransformed;

              if (parameter.name === 'this') {
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                console.log(parameter);
              }
              log('parameter', parameter, type);

              // if (type === 'reference') {
              //   let refResovled = typedoc.children.find((c) => c.id === typeDef.id);
              //
              //   log('reference', parameter.name, typeDef.name, refResovled);
              //
              //   if (refResovled) {
              //     if (isOptionsArray(refResovled)) {
              //       typeTransformed = 'array';
              //     } else {
              //       // typeTransformed = resolveTypeToPhp(refResovled, true);
              //       typeTransformed = transformType(refResovled);
              //     }
              //     log('reference', parameter.name, typeDef.name, isOptionsArray(refResovled));
              //   } else {
              //     typeTransformed = 'object';
              //   }
              // } else {
                typeTransformed = transformType(typeDef);
              // }

              log('abc', typeDef, transformType(typeDef));

              return `${typeTransformed}${optional} $${parameter.name}${optionalOrRest ? defaultNull : ''}`;
            })
        : [];

      let methodType = (function getMethodType(method) {
        let type = method.type;

        if (!type) {
          return '';
        }

        if (method.name === 'goto') {
          console.log('promise', type.typeArguments[0]);
          // console.log('promise', type.types);
          // console.log('promise', type);
        }

        return transformType(type);
      })(signature);

      log('parameters', parameters);

      return ` * @method ${methodType} ${translateMethodName(method.name, 'php')}(${parameters.join(', ')}) ${comment}`;
    });

  // File generation
  let file = start;

  file += properties.join('\n');

  if (
    properties.length > 0
    && methods.length > 0
  ) {
    file += ' \n * \n';
  }

  file += methods.join('\n');

  file += end;

  fs.writeFileSync('generated/Objects/' + className + '.php', file);
}

function isOptionsArray(def) {
  return def.children ? !def.children.find((c) => c.kindString === 'Method') : false;
  // return !def.children.find((c) => c.kindString === 'Method');
}

// console.log('Types not found', TypesNotFound);
