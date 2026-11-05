import test from 'ava';
import { LangGraphPlugin } from '../index';
import { registry } from './graphs';
import { execute, replay, setupTestEnv, uid, withWorker } from './helpers';
import { interruptWorkflow, runGraph } from './workflows';

const env = setupTestEnv(test);

for (const [kind, context] of [
  ['none', undefined],
  ['object', { userId: 'alice' }],
  ['nested', { userId: 'bob', tenant: { name: 'acme' } }],
] as const) {
  test(`a two-node run replays, context: ${kind}`, async (t) => {
    const plugin = new LangGraphPlugin(registry['twoNodes.activity']!);
    const taskQueue = uid('my-graph');
    const workflowId = uid('test-workflow');
    await withWorker(env(), { taskQueue, plugin }, () =>
      execute(env(), runGraph, {
        taskQueue,
        workflowId,
        args: ['twoNodes.activity', 'my-graph', { value: '' }, { context }],
      })
    );
    await replay(env(), plugin, workflowId);
    t.pass();
  });
}

test('an interrupted and resumed run replays', async (t) => {
  const plugin = new LangGraphPlugin(registry.interruptGraph!);
  const taskQueue = uid('interrupt-replay');
  const workflowId = uid('test-interrupt-replay');
  await withWorker(env(), { taskQueue, plugin }, () =>
    execute(env(), interruptWorkflow, { taskQueue, workflowId, args: ['', 'result'] })
  );
  await replay(env(), plugin, workflowId);
  t.pass();
});
