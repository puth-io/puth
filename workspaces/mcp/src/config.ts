import path from 'node:path';

export type App = { name: string; url: string };

export type Config = {
    instanceUrl: string;
    // The first application is the default.
    apps: App[];
    artifactDirectory: string;
    operationTimeout: number;
    idleTimeout: number;
    startHint: string;
    // Only used by puth-mcp --http.
    http: { host: string, port: number, allowedOrigins: string[] };
};

const positive = (value: string|undefined, fallback: number) => {
    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const port = (value: string|undefined, fallback: number) => {
    const parsed = Number(value);

    return value !== undefined && value !== '' && Number.isInteger(parsed) && parsed >= 0 && parsed < 65536 ? parsed : fallback;
};

const withoutSlash = (url: string) => url.replace(/\/$/, '');

/**
 * PUTH_APP_URL is the application named default. PUTH_APP_URLS adds named ones: "shop=http://shop:8080 admin=http://admin:8080".
 */
export function readApps(environment: NodeJS.ProcessEnv = process.env): App[] {
    const apps: App[] = [];

    if (environment.PUTH_APP_URL) {
        apps.push({ name: 'default', url: withoutSlash(environment.PUTH_APP_URL) });
    }

    for (const entry of (environment.PUTH_APP_URLS ?? '').split(/[\s,]+/).filter(Boolean)) {
        const match = entry.match(/^([a-z0-9_-]+)=(.+)$/);
        if (match === null || ! URL.canParse(match[2])) {
            throw new Error(`PUTH_APP_URLS: [${entry}] is not name=url, with a name of a-z, 0-9, _ and -.`);
        }
        if (apps.some(({ name }) => name === match[1])) {
            throw new Error(`PUTH_APP_URLS: the application [${match[1]}] is defined twice.`);
        }

        apps.push({ name: match[1], url: withoutSlash(match[2]) });
    }

    return apps;
}

export function readConfig(environment: NodeJS.ProcessEnv = process.env): Config {
    return {
        instanceUrl: withoutSlash(environment.PUTH_INSTANCE_URL ?? 'http://127.0.0.1:7345'),
        apps: readApps(environment),
        artifactDirectory: path.resolve(environment.PUTH_ARTIFACT_DIR ?? '.puth/agent-artifacts'),
        operationTimeout: positive(environment.PUTH_MCP_OPERATION_TIMEOUT, 30 * 1000),
        idleTimeout: positive(environment.PUTH_MCP_IDLE_TIMEOUT, 30 * 60 * 1000),
        startHint: environment.PUTH_START_HINT || 'puth start',
        http: {
            host: environment.PUTH_MCP_HOST || '127.0.0.1',
            // 0 lets the system pick a free port, which puth-mcp reports.
            port: port(environment.PUTH_MCP_PORT, 7346),
            allowedOrigins: (environment.PUTH_MCP_ORIGINS ?? '').split(/[\s,]+/).filter(Boolean).map(withoutSlash),
        },
    };
}

/**
 * The application whose URL the given one starts with, the longest if several do.
 */
export function appOf(apps: App[], url: string): App|undefined {
    return apps
        .filter(app => url === app.url || ['/', '?', '#'].includes(url.charAt(app.url.length)) && url.startsWith(app.url))
        .sort((a, b) => b.url.length - a.url.length)[0];
}
