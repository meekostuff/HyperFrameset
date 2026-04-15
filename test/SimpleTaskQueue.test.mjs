import { describe, test, expect, beforeEach } from 'vitest';

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('SimpleTaskQueue', () => {
  let SimpleTaskQueue, Thenfu;

  beforeEach(async () => {
    const sqMod = await import('../src/Meeko/SimpleTaskQueue.mjs');
    SimpleTaskQueue = sqMod.default;
    const tfMod = await import('../src/Meeko/Thenfu.mjs');
    Thenfu = tfMod.default;
  });

  test('constructor creates a queue with default maxSize of 1', () => {
    const q = new SimpleTaskQueue();
    expect(q).toBeInstanceOf(SimpleTaskQueue);
  });

  test('now() executes a task and resolves with its return value', async () => {
    const q = new SimpleTaskQueue();
    let result;
    q.now(() => 42).then(v => { result = v; });
    await timeout(100);
    expect(result).toBe(42);
  });

  test('now() rejects when a task is already processing and queue is full', async () => {
    const q = new SimpleTaskQueue();
    let rejected = false;

    q.now(() => 1);
    // now() uses max=0, so any call while processing overflows
    q.now(() => 2, () => {}).then(() => {}, () => {});
    q.now(() => 3, () => { rejected = true; });

    await timeout(200);
    expect(rejected).toBe(true);
  });

  test('now() calls fail callback when queue is full', async () => {
    const q = new SimpleTaskQueue();
    let failValue;

    q.now(() => 1);
    q.now(() => 2, () => {}).then(() => {}, () => {});
    q.now(() => 3, () => { failValue = 'called'; return failValue; }).then(v => { failValue = v; });

    await timeout(200);
    expect(failValue).toBe('called');
  });

  test('tasks execute serially', async () => {
    const q = new SimpleTaskQueue();
    const order = [];

    q.now(() => order.push('first'));
    q.whenever(() => order.push('second'));

    await timeout(200);
    expect(order).toEqual(['first', 'second']);
  });

  test('whenever() uses constructor maxSize by default', async () => {
    const q = new SimpleTaskQueue(2);
    const results = [];

    q.whenever(() => results.push('a'));
    q.whenever(() => results.push('b'));
    q.whenever(() => results.push('c'));

    await timeout(200);
    expect(results).toEqual(['a', 'b', 'c']);
  });

  test('whenever() calls fail when over max and fail is provided', async () => {
    const q = new SimpleTaskQueue(0);
    let failCalled = false;

    q.now(() => 1);
    q.whenever(() => 2, () => { failCalled = true; }, 0);

    await timeout(200);
    expect(failCalled).toBe(true);
  });

  test('reset() clears pending tasks and runs the new one', async () => {
    const q = new SimpleTaskQueue();
    const results = [];

    q.now(() => results.push('first'));
    q.whenever(() => results.push('should be cleared'));
    q.reset(() => results.push('after reset'));

    await timeout(200);
    expect(results).toContain('first');
    expect(results).toContain('after reset');
    expect(results).not.toContain('should be cleared');
  });

  test('task that throws still allows subsequent tasks to run', async () => {
    const q = new SimpleTaskQueue();
    let secondRan = false;

    // attach catch to prevent Thenfu reportError
    q.now(() => { throw new Error('boom'); }).catch(() => {});
    q.whenever(() => { secondRan = true; });

    await timeout(200);
    expect(secondRan).toBe(true);
  });

  test('now() rejects when task throws', async () => {
    const q = new SimpleTaskQueue();
    let error;

    q.now(() => { throw new Error('fail'); }).catch(e => { error = e; });

    await timeout(200);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('fail');
  });

  test('multiple sequential tasks resolve with correct values', async () => {
    const q = new SimpleTaskQueue(3);
    const results = [];

    q.whenever(() => 10).then(v => results.push(v));
    q.whenever(() => 20).then(v => results.push(v));
    q.whenever(() => 30).then(v => results.push(v));

    await timeout(300);
    expect(results).toEqual([10, 20, 30]);
  });
});
