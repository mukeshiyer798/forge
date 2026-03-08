/**
 * Structured frontend logger — replaces raw console.* across the codebase.
 */


type LogPayload = Record<string, unknown>;

const IS_PROD = import.meta.env.PROD;

function formatMessage(module: string, event: string, data?: LogPayload): [string, LogPayload | undefined] {
    const prefix = `[FORGE:${module}]`;
    return [`${prefix} ${event}`, data];
}

export interface Logger {
    debug: (event: string, data?: LogPayload) => void;
    info: (event: string, data?: LogPayload) => void;
    warn: (event: string, data?: LogPayload) => void;
    error: (event: string, data?: LogPayload, error?: unknown) => void;
}

export function createLogger(module: string): Logger {
    return {
        debug(event: string, data?: LogPayload) {
            if (IS_PROD) return;
            const [msg, payload] = formatMessage(module, event, data);
            if (payload) {
                console.debug(msg, payload);
            } else {
                console.debug(msg);
            }
        },

        info(event: string, data?: LogPayload) {
            const [msg, payload] = formatMessage(module, event, data);
            if (payload) {
                console.info(msg, payload);
            } else {
                console.info(msg);
            }
        },

        warn(event: string, data?: LogPayload) {
            const [msg, payload] = formatMessage(module, event, data);
            if (payload) {
                console.warn(msg, payload);
            } else {
                console.warn(msg);
            }
        },

        error(event: string, data?: LogPayload, error?: unknown) {
            const [msg, payload] = formatMessage(module, event, data);
            if (payload) {
                console.error(msg, payload, error || '');
            } else {
                console.error(msg, error || '');
            }
        },
    };
}
