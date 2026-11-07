import path from 'node:path';

export type Config = {
    instanceUrl: string;
    appUrl?: string;
    artifactDirectory: string;
    operationTimeout: number;
    idleTimeout: number;
};

const positive = (value: string|undefined, fallback: number) => {
    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function readConfig(environment: NodeJS.ProcessEnv = process.env): Config {
    return {
        instanceUrl: (environment.PUTH_INSTANCE_URL ?? 'http://127.0.0.1:7345').replace(/\/$/, ''),
        appUrl: environment.PUTH_APP_URL?.replace(/\/$/, ''),
        artifactDirectory: path.resolve(environment.PUTH_ARTIFACT_DIR ?? '.puth/agent-artifacts'),
        operationTimeout: positive(environment.PUTH_MCP_OPERATION_TIMEOUT, 30 * 1000),
        idleTimeout: positive(environment.PUTH_MCP_IDLE_TIMEOUT, 30 * 60 * 1000),
    };
}
