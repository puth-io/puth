import pino, {type Logger} from 'pino';
import {runtime} from "./Platform";

export function makeLogger(pretty: boolean = false, level?: string) {
    let conf: any = {
        level: level ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    };
    if (process.env.NODE_ENV === 'development' || pretty) {
        conf.transport = {
            target: 'pino-pretty',
                options: {
                translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
            },
        };
    }
    
    const logger = pino(conf);
    logger.debug({environment: process.env.NODE_ENV ?? 'undefined', node: process.versions.node, runtime});
    return logger
}

export function makeVoidLogger(): Logger {
    // @ts-ignore
    return {
        level: 'none',
        info: () => false,
        debug: () => false,
        fatal: () => false,
        error: () => false,
        warn: () => false,
        trace: () => false,
        silent: () => false,
    };
}
