import pino from 'pino';

export const makeLogger = (pretty = false) => {
    let conf: any = {
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
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
    logger.debug({environment: process.env.NODE_ENV ?? 'undefined', node: process.versions.node});
    return logger
}
