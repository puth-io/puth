import setPrototypeOf from 'setprototypeof';
import util from 'node:util';
import iconv from 'iconv-lite';

/**
 * (The MIT License)
 *
 * Copyright (c) 2012-2014 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright (c) 2015 Jed Watson <jed.watson@me.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Module variables.
 * @private
 */

var formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g;

var formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/;

var map = {
    b:  1,
    kb: 1 << 10,
    mb: 1 << 20,
    gb: 1 << 30,
    tb: Math.pow(1024, 4),
    pb: Math.pow(1024, 5),
};

var parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;

/**
 * Convert the given value in bytes into a string or parse to string to an integer in bytes.
 *
 * @param {string|number} value
 * @param {{
 *  case: [string],
 *  decimalPlaces: [number]
 *  fixedDecimals: [boolean]
 *  thousandsSeparator: [string]
 *  unitSeparator: [string]
 *  }} [options] bytes options.
 *
 * @returns {string|number|null}
 */

function bytes(value, options) {
    if (typeof value === 'string') {
        return parse(value);
    }

    if (typeof value === 'number') {
        return format(value, options);
    }

    return null;
}

/**
 * Format the given value in bytes into a string.
 *
 * If the value is negative, it is kept as such. If it is a float,
 * it is rounded.
 *
 * @param {number} value
 * @param {object} [options]
 * @param {number} [options.decimalPlaces=2]
 * @param {number} [options.fixedDecimals=false]
 * @param {string} [options.thousandsSeparator=]
 * @param {string} [options.unit=]
 * @param {string} [options.unitSeparator=]
 *
 * @returns {string|null}
 * @public
 */

function format(value, options) {
    if (!Number.isFinite(value)) {
        return null;
    }

    var mag = Math.abs(value);
    var thousandsSeparator = (options && options.thousandsSeparator) || '';
    var unitSeparator = (options && options.unitSeparator) || '';
    var decimalPlaces = (options && options.decimalPlaces !== undefined) ? options.decimalPlaces : 2;
    var fixedDecimals = Boolean(options && options.fixedDecimals);
    var unit = (options && options.unit) || '';

    if (!unit || !map[unit.toLowerCase()]) {
        if (mag >= map.pb) {
            unit = 'PB';
        } else if (mag >= map.tb) {
            unit = 'TB';
        } else if (mag >= map.gb) {
            unit = 'GB';
        } else if (mag >= map.mb) {
            unit = 'MB';
        } else if (mag >= map.kb) {
            unit = 'KB';
        } else {
            unit = 'B';
        }
    }

    var val = value / map[unit.toLowerCase()];
    var str = val.toFixed(decimalPlaces);

    if (!fixedDecimals) {
        str = str.replace(formatDecimalsRegExp, '$1');
    }

    if (thousandsSeparator) {
        str = str.split('.').map(function (s, i) {
            return i === 0
                ? s.replace(formatThousandsRegExp, thousandsSeparator)
                : s
        }).join('.');
    }

    return str + unitSeparator + unit;
}

/**
 * Parse the string value into an integer in bytes.
 *
 * If no unit is given, it is assumed the value is in bytes.
 *
 * @param {number|string} val
 *
 * @returns {number|null}
 * @public
 */

function parse(val) {
    if (typeof val === 'number' && !isNaN(val)) {
        return val;
    }

    if (typeof val !== 'string') {
        return null;
    }

    // Test if the string passed is valid
    var results = parseRegExp.exec(val);
    var floatValue;
    var unit = 'b';

    if (!results) {
        // Nothing could be extracted from the given string
        floatValue = parseInt(val, 10);
        unit = 'b'
    } else {
        // Retrieve the value and the unit
        floatValue = parseFloat(results[1]);
        unit = results[4].toLowerCase();
    }

    if (isNaN(floatValue)) {
        return null;
    }

    return Math.floor(map[unit] * floatValue);
}

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Jonathan Ong <me@jongleberry.com>
 * Copyright (c) 2016 Douglas Christopher Wilson <doug@somethingdoug.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const codes = {
    "100": "Continue",
    "101": "Switching Protocols",
    "102": "Processing",
    "103": "Early Hints",
    "200": "OK",
    "201": "Created",
    "202": "Accepted",
    "203": "Non-Authoritative Information",
    "204": "No Content",
    "205": "Reset Content",
    "206": "Partial Content",
    "207": "Multi-Status",
    "208": "Already Reported",
    "226": "IM Used",
    "300": "Multiple Choices",
    "301": "Moved Permanently",
    "302": "Found",
    "303": "See Other",
    "304": "Not Modified",
    "305": "Use Proxy",
    "307": "Temporary Redirect",
    "308": "Permanent Redirect",
    "400": "Bad Request",
    "401": "Unauthorized",
    "402": "Payment Required",
    "403": "Forbidden",
    "404": "Not Found",
    "405": "Method Not Allowed",
    "406": "Not Acceptable",
    "407": "Proxy Authentication Required",
    "408": "Request Timeout",
    "409": "Conflict",
    "410": "Gone",
    "411": "Length Required",
    "412": "Precondition Failed",
    "413": "Payload Too Large",
    "414": "URI Too Long",
    "415": "Unsupported Media Type",
    "416": "Range Not Satisfiable",
    "417": "Expectation Failed",
    "418": "I'm a Teapot",
    "421": "Misdirected Request",
    "422": "Unprocessable Entity",
    "423": "Locked",
    "424": "Failed Dependency",
    "425": "Too Early",
    "426": "Upgrade Required",
    "428": "Precondition Required",
    "429": "Too Many Requests",
    "431": "Request Header Fields Too Large",
    "451": "Unavailable For Legal Reasons",
    "500": "Internal Server Error",
    "501": "Not Implemented",
    "502": "Bad Gateway",
    "503": "Service Unavailable",
    "504": "Gateway Timeout",
    "505": "HTTP Version Not Supported",
    "506": "Variant Also Negotiates",
    "507": "Insufficient Storage",
    "508": "Loop Detected",
    "509": "Bandwidth Limit Exceeded",
    "510": "Not Extended",
    "511": "Network Authentication Required"
};

// status code to message map
statuses.message = codes

// statuses message (lower-case) to code map
statuses.code = createMessageToStatusCodeMap(codes)

// array of statuses codes
statuses.codes = createStatusCodeList(codes)

// statuses codes for redirects
statuses.redirect = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true
}

// statuses codes for empty bodies
statuses.empty = {
    204: true,
    205: true,
    304: true
}

// statuses codes for when you should retry the request
statuses.retry = {
    502: true,
    503: true,
    504: true
}

/**
 * Create a map of message to statuses code.
 * @private
 */

function createMessageToStatusCodeMap (codes) {
    var map = {}

    Object.keys(codes).forEach(function forEachCode (code) {
        var message = codes[code]
        var status = Number(code)

        // populate map
        map[message.toLowerCase()] = status
    })

    return map
}

/**
 * Create a list of all status codes.
 * @private
 */

function createStatusCodeList (codes) {
    return Object.keys(codes).map(function mapCode (code) {
        return Number(code)
    })
}

/**
 * Get the status code for given message.
 * @private
 */

function getStatusCode (message) {
    var msg = message.toLowerCase()

    if (!Object.prototype.hasOwnProperty.call(statuses.code, msg)) {
        throw new Error('invalid status message: "' + message + '"')
    }

    return statuses.code[msg]
}

/**
 * Get the status message for given code.
 * @private
 */

function getStatusMessage (code) {
    if (!Object.prototype.hasOwnProperty.call(statuses.message, code)) {
        throw new Error('invalid status code: ' + code)
    }

    return statuses.message[code]
}

/**
 * Get the status code.
 *
 * Given a number, this will throw if it is not a known status
 * code, otherwise the code will be returned. Given a string,
 * the string will be parsed for a number and return the code
 * if valid, otherwise will lookup the code assuming this is
 * the status message.
 *
 * @param {string|number} code
 * @returns {number}
 * @public
 */

function statuses (code) {
    if (typeof code === 'number') {
        return getStatusMessage(code)
    }

    if (typeof code !== 'string') {
        throw new TypeError('code must be a number or string')
    }

    // '403'
    var n = parseInt(code, 10)
    if (!isNaN(n)) {
        return getStatusMessage(n)
    }

    return getStatusCode(code)
}

/**
 * MIT License
 *
 * Copyright (c) 2016 Douglas Christopher Wilson <doug@somethingdoug.com>
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
 */
function toIdentifier (str) {
    return str
        .split(' ')
        .map(function (token) {
            return token.slice(0, 1).toUpperCase() + token.slice(1)
        })
        .join('')
        .replace(/[^ _0-9a-z]/gi, '')
}

// Populate exports for all constructors
populateConstructorExports(createError, statuses.codes, createHttpErrorConstructor())

/**
 * Get the code class of a status code.
 * @private
 */

function codeClass (status) {
    return Number(String(status).charAt(0) + '00')
}

/**
 * Create a new HTTP Error.
 *
 * @returns {Error}
 * @public
 */

function createError () {
    // so much arity going on ~_~
    var err
    var msg
    var status = 500
    var props = {}
    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i]
        var type = typeof arg
        if (type === 'object' && arg instanceof Error) {
            err = arg
            status = err.status || err.statusCode || status
        } else if (type === 'number' && i === 0) {
            status = arg
        } else if (type === 'string') {
            msg = arg
        } else if (type === 'object') {
            props = arg
        } else {
            throw new TypeError('argument #' + (i + 1) + ' unsupported type ' + type)
        }
    }

    if (typeof status === 'number' && (status < 400 || status >= 600)) {
        throw new Error('non-error status code; use only 4xx or 5xx status codes')
    }

    if (typeof status !== 'number' ||
        (!statuses.message[status] && (status < 400 || status >= 600))) {
        status = 500
    }

    // constructor
    var HttpError = createError[status] || createError[codeClass(status)]

    if (!err) {
        // create error
        err = HttpError
            ? new HttpError(msg)
            : new Error(msg || statuses.message[status])
        Error.captureStackTrace(err, createError)
    }

    if (!HttpError || !(err instanceof HttpError) || err.status !== status) {
        // add properties to generic error
        err.expose = status < 500
        err.status = err.statusCode = status
    }

    for (var key in props) {
        if (key !== 'status' && key !== 'statusCode') {
            err[key] = props[key]
        }
    }

    return err
}

/**
 * Create HTTP error abstract base class.
 * @private
 */

function createHttpErrorConstructor () {
    function HttpError () {
        throw new TypeError('cannot construct abstract class')
    }

    util.inherits(HttpError, Error)

    return HttpError
}

/**
 * Create a constructor for a client error.
 * @private
 */

function createClientErrorConstructor (HttpError, name, code) {
    var className = toClassName(name)

    function ClientError (message) {
        // create the error object
        var msg = message != null ? message : statuses.message[code]
        var err = new Error(msg)

        // capture a stack trace to the construction point
        Error.captureStackTrace(err, ClientError)

        // adjust the [[Prototype]]
        setPrototypeOf(err, ClientError.prototype)

        // redefine the error message
        Object.defineProperty(err, 'message', {
            enumerable: true,
            configurable: true,
            value: msg,
            writable: true
        })

        // redefine the error name
        Object.defineProperty(err, 'name', {
            enumerable: false,
            configurable: true,
            value: className,
            writable: true
        })

        return err
    }

    util.inherits(ClientError, HttpError)
    nameFunc(ClientError, className)

    ClientError.prototype.status = code
    ClientError.prototype.statusCode = code
    ClientError.prototype.expose = true

    return ClientError
}

/**
 * Create function to test is a value is a HttpError.
 * @private
 */

function createIsHttpErrorFunction (HttpError) {
    return function isHttpError (val) {
        if (!val || typeof val !== 'object') {
            return false
        }

        if (val instanceof HttpError) {
            return true
        }

        return val instanceof Error &&
            typeof val.expose === 'boolean' &&
            typeof val.statusCode === 'number' && val.status === val.statusCode
    }
}

/**
 * Create a constructor for a server error.
 * @private
 */

function createServerErrorConstructor (HttpError, name, code) {
    var className = toClassName(name)

    function ServerError (message) {
        // create the error object
        var msg = message != null ? message : statuses.message[code]
        var err = new Error(msg)

        // capture a stack trace to the construction point
        Error.captureStackTrace(err, ServerError)

        // adjust the [[Prototype]]
        setPrototypeOf(err, ServerError.prototype)

        // redefine the error message
        Object.defineProperty(err, 'message', {
            enumerable: true,
            configurable: true,
            value: msg,
            writable: true
        })

        // redefine the error name
        Object.defineProperty(err, 'name', {
            enumerable: false,
            configurable: true,
            value: className,
            writable: true
        })

        return err
    }

    util.inherits(ServerError, HttpError)
    nameFunc(ServerError, className)

    ServerError.prototype.status = code
    ServerError.prototype.statusCode = code
    ServerError.prototype.expose = false

    return ServerError
}

/**
 * Set the name of a function, if possible.
 * @private
 */

function nameFunc (func, name) {
    var desc = Object.getOwnPropertyDescriptor(func, 'name')

    if (desc && desc.configurable) {
        desc.value = name
        Object.defineProperty(func, 'name', desc)
    }
}

/**
 * Populate the exports object with constructors for every error class.
 * @private
 */

function populateConstructorExports (exports, codes, HttpError) {
    codes.forEach(function forEachCode (code) {
        var CodeError
        var name = toIdentifier(statuses.message[code])

        switch (codeClass(code)) {
            case 400:
                CodeError = createClientErrorConstructor(HttpError, name, code)
                break
            case 500:
                CodeError = createServerErrorConstructor(HttpError, name, code)
                break
        }

        if (CodeError) {
            // export the constructor
            exports[code] = CodeError
            exports[name] = CodeError
        }
    })
}

/**
 * Get a class name from a name identifier.
 *
 * @param {string} name
 * @returns {string}
 * @private
 */

function toClassName (name) {
    return name.slice(-5) === 'Error' ? name : name + 'Error'
}

/**
 * (The MIT License)
 *
 * Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Determine if there are Node.js pipe-like data listeners.
 * @private
 */

function hasPipeDataListeners (stream) {
    var listeners = stream.listeners('data')

    for (var i = 0; i < listeners.length; i++) {
        if (listeners[i].name === 'ondata') {
            return true
        }
    }

    return false
}

/**
 * Unpipe a stream from all destinations.
 *
 * @param {object} stream
 * @public
 */

function unpipe (stream) {
    if (!stream) {
        throw new TypeError('argument stream is required')
    }

    if (typeof stream.unpipe === 'function') {
        // new-style
        stream.unpipe()
        return
    }

    // Node.js 0.8 hack
    if (!hasPipeDataListeners(stream)) {
        return
    }

    var listener
    var listeners = stream.listeners('close')

    for (var i = 0; i < listeners.length; i++) {
        listener = listeners[i]

        if (listener.name !== 'cleanup' && listener.name !== 'onclose') {
            continue
        }

        // invoke the listener
        listener.call(stream)
    }
}

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2013-2014 Jonathan Ong <me@jongleberry.com>
 * Copyright (c) 2014-2022 Douglas Christopher Wilson <doug@somethingdoug.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Source: https://github.com/stream-utils/raw-body/
 */


/**
 * Module variables.
 * @private
 */

var ICONV_ENCODING_MESSAGE_REGEXP = /^Encoding not recognized: /

/**
 * Get the decoder for a given encoding.
 *
 * @param {string} encoding
 * @private
 */

function getDecoder (encoding) {
    if (!encoding) return null

    try {
        return iconv.getDecoder(encoding)
    } catch (e) {
        // error getting decoder
        if (!ICONV_ENCODING_MESSAGE_REGEXP.test(e.message)) throw e

        // the encoding was not found
        throw createError(415, 'specified encoding unsupported', {
            encoding: encoding,
            type: 'encoding.unsupported'
        })
    }
}

/**
 * Get the raw body of a stream (typically HTTP).
 *
 * @param {object} stream
 * @param {object|string|function} [options]
 * @param {function} [callback]
 * @public
 */

export function getRawBody (stream, options, callback) {
    var done = callback
    var opts = options || {}

    // light validation
    if (stream === undefined) {
        throw new TypeError('argument stream is required')
    } else if (typeof stream !== 'object' || stream === null || typeof stream.on !== 'function') {
        throw new TypeError('argument stream must be a stream')
    }

    if (options === true || typeof options === 'string') {
        // short cut for encoding
        opts = {
            encoding: options
        }
    }

    if (typeof options === 'function') {
        done = options
        opts = {}
    }

    // validate callback is a function, if provided
    if (done !== undefined && typeof done !== 'function') {
        throw new TypeError('argument callback must be a function')
    }

    // require the callback without promises
    if (!done && !global.Promise) {
        throw new TypeError('argument callback is required')
    }

    // get encoding
    var encoding = opts.encoding !== true
        ? opts.encoding
        : 'utf-8'

    // convert the limit to an integer
    var limit = parse(opts.limit)

    // convert the expected length to an integer
    var length = opts.length != null && !isNaN(opts.length)
        ? parseInt(opts.length, 10)
        : null

    if (done) {
        // classic callback style
        return readStream(stream, encoding, length, limit, wrap(done))
    }

    return new Promise(function executor (resolve, reject) {
        readStream(stream, encoding, length, limit, function onRead (err, buf) {
            if (err) return reject(err)
            resolve(buf)
        })
    })
}

/**
 * Halt a stream.
 *
 * @param {Object} stream
 * @private
 */

function halt (stream) {
    // unpipe everything from the stream
    unpipe(stream)

    // pause stream
    if (typeof stream.pause === 'function') {
        stream.pause()
    }
}

/**
 * Read the data from the stream.
 *
 * @param {object} stream
 * @param {string} encoding
 * @param {number} length
 * @param {number} limit
 * @param {function} callback
 * @public
 */

function readStream (stream, encoding, length, limit, callback) {
    var complete = false
    var sync = true

    // check the length and limit options.
    // note: we intentionally leave the stream paused,
    // so users should handle the stream themselves.
    if (limit !== null && length !== null && length > limit) {
        return done(createError(413, 'request entity too large', {
            expected: length,
            length: length,
            limit: limit,
            type: 'entity.too.large'
        }))
    }

    // streams1: assert request encoding is buffer.
    // streams2+: assert the stream encoding is buffer.
    //   stream._decoder: streams1
    //   state.encoding: streams2
    //   state.decoder: streams2, specifically < 0.10.6
    var state = stream._readableState
    if (stream._decoder || (state && (state.encoding || state.decoder))) {
        // developer error
        return done(createError(500, 'stream encoding should not be set', {
            type: 'stream.encoding.set'
        }))
    }

    if (typeof stream.readable !== 'undefined' && !stream.readable) {
        return done(createError(500, 'stream is not readable', {
            type: 'stream.not.readable'
        }))
    }

    var received = 0
    var decoder

    try {
        decoder = getDecoder(encoding)
    } catch (err) {
        return done(err)
    }

    var buffer = decoder
        ? ''
        : []

    // attach listeners
    stream.on('aborted', onAborted)
    stream.on('close', cleanup)
    stream.on('data', onData)
    stream.on('end', onEnd)
    stream.on('error', onEnd)

    // mark sync section complete
    sync = false

    function done () {
        var args = new Array(arguments.length)

        // copy arguments
        for (var i = 0; i < args.length; i++) {
            args[i] = arguments[i]
        }

        // mark complete
        complete = true

        if (sync) {
            process.nextTick(invokeCallback)
        } else {
            invokeCallback()
        }

        function invokeCallback () {
            cleanup()

            if (args[0]) {
                // halt the stream on error
                halt(stream)
            }

            callback.apply(null, args)
        }
    }

    function onAborted () {
        if (complete) return

        done(createError(400, 'request aborted', {
            code: 'ECONNABORTED',
            expected: length,
            length: length,
            received: received,
            type: 'request.aborted'
        }))
    }

    function onData (chunk) {
        if (complete) return

        received += chunk.length

        if (limit !== null && received > limit) {
            done(createError(413, 'request entity too large', {
                limit: limit,
                received: received,
                type: 'entity.too.large'
            }))
        } else if (decoder) {
            buffer += decoder.write(chunk)
        } else {
            buffer.push(chunk)
        }
    }

    function onEnd (err) {
        if (complete) return
        if (err) return done(err)

        if (length !== null && received !== length) {
            done(createError(400, 'request size did not match content length', {
                expected: length,
                length: length,
                received: received,
                type: 'request.size.invalid'
            }))
        } else {
            var string = decoder
                ? buffer + (decoder.end() || '')
                : Buffer.concat(buffer)
            done(null, string)
        }
    }

    function cleanup () {
        buffer = null

        stream.removeListener('aborted', onAborted)
        stream.removeListener('data', onData)
        stream.removeListener('end', onEnd)
        stream.removeListener('error', onEnd)
        stream.removeListener('close', cleanup)
    }
}

/**
 * Wrap function with async resource, if possible.
 * AsyncResource.bind static method backported.
 * @private
 */

function wrap (fn) {
    var res

    // incompatible node.js
    if (!res || !res.runInAsyncScope) {
        return fn
    }

    // return bound function
    return res.runInAsyncScope.bind(res, fn, null)
}
