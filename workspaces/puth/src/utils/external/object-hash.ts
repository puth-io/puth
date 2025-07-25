// @ts-nocheck
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 object-hash contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Source: https://github.com/puleos/object-hash/
 */


import crypto from 'node:crypto';

export function objectHash(object, options= {}){
    options = applyDefaults(object, options);

    return hash(object, options);
}

/**
 * Exported sugar methods
 *
 * @param {object} object value to hash
 * @return {string} hash value
 * @api public
 */
export function sha1(object){
    return objectHash(object);
}
export function keys(object){
    return objectHash(object, {excludeValues: true, algorithm: 'sha1', encoding: 'hex'});
}
export function MD5(object){
    return objectHash(object, {algorithm: 'md5', encoding: 'hex'});
}
export function keysMD5(object){
    return objectHash(object, {algorithm: 'md5', encoding: 'hex', excludeValues: true});
}

// Internals
const hashes = crypto.getHashes ? crypto.getHashes().slice() : ['sha1', 'md5'];
hashes.push('passthrough');
const encodings = ['buffer', 'hex', 'binary', 'base64'];

function applyDefaults(object, sourceOptions) {
    sourceOptions = sourceOptions || {};

    // create a copy rather than mutating
    const options = {};
    options.algorithm = sourceOptions.algorithm || 'sha1';
    options.encoding = sourceOptions.encoding || 'hex';
    options.excludeValues = sourceOptions.excludeValues ? true : false;
    options.algorithm = options.algorithm.toLowerCase();
    options.encoding = options.encoding.toLowerCase();
    options.ignoreUnknown = sourceOptions.ignoreUnknown !== true ? false : true; // default to false
    options.respectType = sourceOptions.respectType === false ? false : true; // default to true
    options.respectFunctionNames = sourceOptions.respectFunctionNames === false ? false : true;
    options.respectFunctionProperties = sourceOptions.respectFunctionProperties === false ? false : true;
    options.unorderedArrays = sourceOptions.unorderedArrays !== true ? false : true; // default to false
    options.unorderedSets = sourceOptions.unorderedSets === false ? false : true; // default to false
    options.unorderedObjects = sourceOptions.unorderedObjects === false ? false : true; // default to true
    options.replacer = sourceOptions.replacer || undefined;
    options.excludeKeys = sourceOptions.excludeKeys || undefined;

    if (typeof object === 'undefined') {
        throw new Error('Object argument required.');
    }

    // if there is a case-insensitive match in the hashes list, accept it
    // (i.e. SHA256 for sha256)
    for (var i = 0; i < hashes.length; ++i) {
        if (hashes[i].toLowerCase() === options.algorithm.toLowerCase()) {
            options.algorithm = hashes[i];
        }
    }

    if (hashes.indexOf(options.algorithm) === -1) {
        throw new Error(
            'Algorithm "' + options.algorithm + '"  not supported. ' + 'supported values: ' + hashes.join(', '),
        );
    }

    if (encodings.indexOf(options.encoding) === -1 && options.algorithm !== 'passthrough') {
        throw new Error(
            'Encoding "' + options.encoding + '"  not supported. ' + 'supported values: ' + encodings.join(', '),
        );
    }

    return options;
}

/** Check if the given function is a native function */
function isNativeFunction(f) {
    if ((typeof f) !== 'function') {
        return false;
    }
    var exp = /^function\s+\w*\s*\(\s*\)\s*{\s+\[native code\]\s+}$/i;
    return exp.exec(Function.prototype.toString.call(f)) !== null;
}

function hash(object, options) {
    var hashingStream;

    if (options.algorithm !== 'passthrough') {
        hashingStream = crypto.createHash(options.algorithm);
    } else {
        hashingStream = new PassThrough();
    }

    if (typeof hashingStream.write === 'undefined') {
        hashingStream.write = hashingStream.update;
        hashingStream.end   = hashingStream.update;
    }

    var hasher = typeHasher(options, hashingStream);
    hasher.dispatch(object);
    if (!hashingStream.update) {
        hashingStream.end('');
    }

    if (hashingStream.digest) {
        return hashingStream.digest(options.encoding === 'buffer' ? undefined : options.encoding);
    }

    var buf = hashingStream.read();
    if (options.encoding === 'buffer') {
        return buf;
    }

    return buf.toString(options.encoding);
}

/**
 * Expose streaming API
 *
 * @param {object} object  Value to serialize
 * @param {object} options  Options, as for hash()
 * @param {object} stream  A stream to write the serializiation to
 * @api public
 */
export function writeToStream(object, options, stream) {
    if (typeof stream === 'undefined') {
        stream = options;
        options = {};
    }

    options = applyDefaults(object, options);

    return typeHasher(options, stream).dispatch(object);
}

function typeHasher(options, writeTo, context){
    context = context || [];
    var write = function(str) {
        if (writeTo.update) {
            return writeTo.update(str, 'utf8');
        } else {
            return writeTo.write(str, 'utf8');
        }
    };

    return {
        dispatch: function(value){
            if (options.replacer) {
                value = options.replacer(value);
            }

            var type = typeof value;
            if (value === null) {
                type = 'null';
            }

            //console.log("[DEBUG] Dispatch: ", value, "->", type, " -> ", "_" + type);

            return this['_' + type](value);
        },
        _object: function(object) {
            var pattern = (/\[object (.*)\]/i);
            var objString = Object.prototype.toString.call(object);
            var objType = pattern.exec(objString);
            if (!objType) { // object type did not match [object ...]
                objType = 'unknown:[' + objString + ']';
            } else {
                objType = objType[1]; // take only the class name
            }

            objType = objType.toLowerCase();

            var objectNumber = null;

            if ((objectNumber = context.indexOf(object)) >= 0) {
                return this.dispatch('[CIRCULAR:' + objectNumber + ']');
            } else {
                context.push(object);
            }

            if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(object)) {
                write('buffer:');
                return write(object);
            }

            if(objType !== 'object' && objType !== 'function' && objType !== 'asyncfunction') {
                if(this['_' + objType]) {
                    this['_' + objType](object);
                } else if (options.ignoreUnknown) {
                    return write('[' + objType + ']');
                } else {
                    throw new Error('Unknown object type "' + objType + '"');
                }
            }else{
                var keys = Object.keys(object);
                if (options.unorderedObjects) {
                    keys = keys.sort();
                }
                // Make sure to incorporate special properties, so
                // Types with different prototypes will produce
                // a different hash and objects derived from
                // different functions (`new Foo`, `new Bar`) will
                // produce different hashes.
                // We never do this for native functions since some
                // seem to break because of that.
                if (options.respectType !== false && !isNativeFunction(object)) {
                    keys.splice(0, 0, 'prototype', '__proto__', 'constructor');
                }

                if (options.excludeKeys) {
                    keys = keys.filter(function(key) { return !options.excludeKeys(key); });
                }

                write('object:' + keys.length + ':');
                var self = this;
                return keys.forEach(function(key){
                    self.dispatch(key);
                    write(':');
                    if(!options.excludeValues) {
                        self.dispatch(object[key]);
                    }
                    write(',');
                });
            }
        },
        _array: function(arr, unordered){
            unordered = typeof unordered !== 'undefined' ? unordered :
                options.unorderedArrays !== false; // default to options.unorderedArrays

            var self = this;
            write('array:' + arr.length + ':');
            if (!unordered || arr.length <= 1) {
                return arr.forEach(function(entry) {
                    return self.dispatch(entry);
                });
            }

            // the unordered case is a little more complicated:
            // since there is no canonical ordering on objects,
            // i.e. {a:1} < {a:2} and {a:1} > {a:2} are both false,
            // we first serialize each entry using a PassThrough stream
            // before sorting.
            // also: we can’t use the same context array for all entries
            // since the order of hashing should *not* matter. instead,
            // we keep track of the additions to a copy of the context array
            // and add all of them to the global context array when we’re done
            var contextAdditions = [];
            var entries = arr.map(function(entry) {
                var strm = new PassThrough();
                var localContext = context.slice(); // make copy
                var hasher = typeHasher(options, strm, localContext);
                hasher.dispatch(entry);
                // take only what was added to localContext and append it to contextAdditions
                contextAdditions = contextAdditions.concat(localContext.slice(context.length));
                return strm.read().toString();
            });
            context = context.concat(contextAdditions);
            entries.sort();
            return this._array(entries, false);
        },
        _date: function(date){
            return write('date:' + date.toJSON());
        },
        _symbol: function(sym){
            return write('symbol:' + sym.toString());
        },
        _error: function(err){
            return write('error:' + err.toString());
        },
        _boolean: function(bool){
            return write('bool:' + bool.toString());
        },
        _string: function(string){
            write('string:' + string.length + ':');
            write(string.toString());
        },
        _function: function(fn){
            write('fn:');
            if (isNativeFunction(fn)) {
                this.dispatch('[native]');
            } else {
                this.dispatch(fn.toString());
            }

            if (options.respectFunctionNames !== false) {
                // Make sure we can still distinguish native functions
                // by their name, otherwise String and Function will
                // have the same hash
                this.dispatch("function-name:" + String(fn.name));
            }

            if (options.respectFunctionProperties) {
                this._object(fn);
            }
        },
        _number: function(number){
            return write('number:' + number.toString());
        },
        _xml: function(xml){
            return write('xml:' + xml.toString());
        },
        _null: function() {
            return write('Null');
        },
        _undefined: function() {
            return write('Undefined');
        },
        _regexp: function(regex){
            return write('regex:' + regex.toString());
        },
        _uint8array: function(arr){
            write('uint8array:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint8clampedarray: function(arr){
            write('uint8clampedarray:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int8array: function(arr){
            write('int8array:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint16array: function(arr){
            write('uint16array:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int16array: function(arr){
            write('int16array:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint32array: function(arr){
            write('uint32array:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int32array: function(arr){
            write('int32array:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _float32array: function(arr){
            write('float32array:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _float64array: function(arr){
            write('float64array:');
            return this.dispatch(Array.prototype.slice.call(arr));
        },
        _arraybuffer: function(arr){
            write('arraybuffer:');
            return this.dispatch(new Uint8Array(arr));
        },
        _url: function(url) {
            return write('url:' + url.toString(), 'utf8');
        },
        _map: function(map) {
            write('map:');
            var arr = Array.from(map);
            return this._array(arr, options.unorderedSets !== false);
        },
        _set: function(set) {
            write('set:');
            var arr = Array.from(set);
            return this._array(arr, options.unorderedSets !== false);
        },
        _file: function(file) {
            write('file:');
            return this.dispatch([file.name, file.size, file.type, file.lastModfied]);
        },
        _blob: function() {
            if (options.ignoreUnknown) {
                return write('[blob]');
            }

            throw Error('Hashing Blob objects is currently not supported\n' +
                '(see https://github.com/puleos/object-hash/issues/26)\n' +
                'Use "options.replacer" or "options.ignoreUnknown"\n');
        },
        _domwindow: function() { return write('domwindow'); },
        _bigint: function(number){
            return write('bigint:' + number.toString());
        },
        /* Node.js standard native objects */
        _process: function() { return write('process'); },
        _timer: function() { return write('timer'); },
        _pipe: function() { return write('pipe'); },
        _tcp: function() { return write('tcp'); },
        _udp: function() { return write('udp'); },
        _tty: function() { return write('tty'); },
        _statwatcher: function() { return write('statwatcher'); },
        _securecontext: function() { return write('securecontext'); },
        _connection: function() { return write('connection'); },
        _zlib: function() { return write('zlib'); },
        _context: function() { return write('context'); },
        _nodescript: function() { return write('nodescript'); },
        _httpparser: function() { return write('httpparser'); },
        _dataview: function() { return write('dataview'); },
        _signal: function() { return write('signal'); },
        _fsevent: function() { return write('fsevent'); },
        _tlswrap: function() { return write('tlswrap'); },
    };
}

// Mini-implementation of stream.PassThrough
// We are far from having need for the full implementation, and we can
// make assumptions like "many writes, then only one final read"
// and we can ignore encoding specifics
function PassThrough() {
    return {
        buf: '',

        write: function(b) {
            this.buf += b;
        },

        end: function(b) {
            this.buf += b;
        },

        read: function() {
            return this.buf;
        }
    };
}
