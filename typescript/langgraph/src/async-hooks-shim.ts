/**
 * Stands in for `node:async_hooks` in the Workflow bundle. The sandbox
 * provides `AsyncLocalStorage` as a global.
 *
 * @module
 * @internal
 */

export const AsyncLocalStorage = (globalThis as Record<string, unknown>).AsyncLocalStorage;
