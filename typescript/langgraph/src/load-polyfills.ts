/**
 * Global polyfills LangGraph.js needs in the Temporal Workflow sandbox.
 *
 * `LangGraphPlugin` puts this module first in `workflowInterceptorModules`, so
 * the Workflow runtime evaluates it in each Workflow context before the user's
 * Workflow module and therefore before any LangChain module. Outside a
 * Workflow context it does nothing.
 *
 * - `ReadableStream`, `WritableStream`, `TransformStream`: `@langchain/core`
 *   builds its stream utilities on them at module load.
 * - `queueMicrotask`: the Pregel loop schedules with it.
 * - `crypto`: `uuid` (task and checkpoint IDs) reads `crypto.getRandomValues`
 *   and `crypto.randomUUID`. The values come from a named Workflow random
 *   stream, so they replay identically without perturbing `Math.random()`.
 * - The LangChain `AsyncLocalStorage` singleton: the sandbox bundle resolves
 *   `@langchain/langgraph` to its web entry, which doesn't initialize it, and
 *   `interrupt()`, `getConfig()` and the Functional API need it.
 *
 * @module
 * @internal
 */

import { getRandomStream, inWorkflowContext } from '@temporalio/workflow';
import type { WorkflowInterceptorsFactory } from '@temporalio/workflow';

/** The interceptor-module contract; the module is listed for its side effects. */
export const interceptors: WorkflowInterceptorsFactory = () => ({});

const RANDOM_STREAM = '@temporalio/langgraph';

if (inWorkflowContext()) {
  const globals = globalThis as Record<string, unknown>;

  if (typeof globals.ReadableStream === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const streams = require('web-streams-polyfill') as Record<string, unknown>;
    for (const name of ['ReadableStream', 'WritableStream', 'TransformStream']) {
      if (typeof globals[name] === 'undefined') globals[name] = streams[name];
    }
  }

  if (typeof globals.queueMicrotask === 'undefined') {
    globals.queueMicrotask = (callback: () => void) => {
      void Promise.resolve().then(callback);
    };
  }

  globals.crypto = {
    randomUUID: () => getRandomStream(RANDOM_STREAM).uuid4(),
    getRandomValues<T extends ArrayBufferView>(view: T): T {
      getRandomStream(RANDOM_STREAM).fill(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
      return view;
    },
  };

  // Required after the globals above: `@langchain/core` reads them at module load.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AsyncLocalStorageProviderSingleton } = require('@langchain/core/singletons');
  const AsyncLocalStorage = globals.AsyncLocalStorage as new () => unknown;
  AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new AsyncLocalStorage());
}
