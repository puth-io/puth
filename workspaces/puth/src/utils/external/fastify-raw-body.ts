// @ts-nocheck
/**
 * MIT License
 *
 * Copyright (c) 2020 Manuel Spigolon
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
 * Source: https://github.com/Eomm/fastify-raw-body/
 */

import fp from 'fastify-plugin';
import { getRawBody } from './raw-body';

const kRawBodyHook = Symbol('fastify-raw-body:rawBodyHook')

function rawBody (fastify, opts, next) {
    if (fastify[kRawBodyHook] === true) {
        next(new Error('Cannot register fastify-raw-body twice'))
        return
    }

    const { field, encoding, global, runFirst, routes, jsonContentTypes } = Object.assign({
        field: 'rawBody',
        encoding: 'utf8',
        global: false,
        runFirst: true,
        routes: [],
    }, opts)

    fastify.addHook('onRoute', (routeOptions) => {
        const wantSkip = routeOptions.method === 'GET' || (routeOptions.config && routeOptions.config.rawBody === false)

        if (
            (global && !wantSkip && !routes.length) ||
            (routeOptions.config && routeOptions.config.rawBody === true) ||
            routes.includes(routeOptions.path)
        ) {
            if (!routeOptions.preParsing) {
                routeOptions.preParsing = [preparsingRawBody]
            } else if (Array.isArray(routeOptions.preParsing)) {
                if (runFirst) {
                    routeOptions.preParsing.unshift(preparsingRawBody)
                } else {
                    routeOptions.preParsing.push(preparsingRawBody)
                }
            } else {
                if (runFirst) {
                    routeOptions.preParsing = [preparsingRawBody, routeOptions.preParsing]
                } else {
                    routeOptions.preParsing = [routeOptions.preParsing, preparsingRawBody]
                }
            }
        }
    })

    fastify[kRawBodyHook] = true
    next()

    function preparsingRawBody (request, reply, payload, done) {
        const applyLimit = request.routeOptions.bodyLimit

        getRawBody(runFirst ? request.raw : payload, {
            length: null, // avoid content lenght check: fastify will do it
            limit: applyLimit, // limit to avoid memory leak or DoS
            encoding
        }, function (err, string) {
            if (err) {
                /**
                 * the error is managed by fastify server
                 * so the request object will not have any
                 * `body` parsed.
                 *
                 * The preparsingRawBody decorates the request
                 * meanwhile the `payload` is processed by
                 * the fastify server.
                 */
                return
            }

            request[field] = string
        })

        done(null, payload)
    }
}

export const FastifyRawBodyPlugin = fp(rawBody, {
    fastify: '^5.x',
    name: 'fastify-raw-body'
})
