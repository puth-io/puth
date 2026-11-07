import { ExpectationFailedError } from '@puth/client';

export type ErrorCode =
    | 'ACTION_FAILED'
    | 'ASSERTION_FAILED'
    | 'CONTEXT_NOT_FOUND'
    | 'DIALOG_OPEN'
    | 'HANDOFF_UNAVAILABLE'
    | 'INSTANCE_UNAVAILABLE'
    | 'INVALID_REQUEST'
    | 'OPERATION_FAILED'
    | 'OPERATION_TIMEOUT'
    | 'PAGE_CLOSED'
    | 'SESSION_CLOSED'
    | 'SESSION_INVALIDATED'
    | 'SESSION_LOST'
    | 'SESSION_NOT_FOUND'
    | 'WAIT_FAILED';

export class ToolError extends Error {
    constructor(readonly code: ErrorCode, message: string) {
        super(message);
    }
}

const STARTUP_HINT = 'Start it with: docker compose up --build --wait puth laravel';

export const instanceUnavailable = (url: string) =>
    new ToolError('INSTANCE_UNAVAILABLE', `No Puth instance answers at ${url}. ${STARTUP_HINT}`);

/**
 * Failed expectations get the code of what was attempted, everything else depends on what went wrong.
 */
export function toToolError(error: any, instanceUrl: string, expectationCode: ErrorCode = 'OPERATION_FAILED'): ToolError {
    if (error instanceof ToolError) {
        return error;
    }

    const message = String(error?.message ?? error);

    if (message.includes('fetch failed') || error?.cause?.code === 'ECONNREFUSED') {
        return instanceUnavailable(instanceUrl);
    }
    if (message.includes('ContextNotFound')) {
        return new ToolError('SESSION_LOST', 'The Puth instance does not know this session anymore, it probably restarted. Create a new session.');
    }
    if (message.includes('PageClosed') || message.includes('PageUnavailable')) {
        return new ToolError('PAGE_CLOSED', message);
    }
    if (message.includes('open dialog')) {
        return new ToolError('DIALOG_OPEN', 'A dialog blocks the page, answer it with the dialog operation.');
    }
    if (error instanceof ExpectationFailedError) {
        return new ToolError(expectationCode, message);
    }

    return new ToolError('OPERATION_FAILED', message);
}
