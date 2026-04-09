import { describe, test, expect, beforeEach } from 'vitest';

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Task.mjs tests', () => {
  let Task;

  beforeEach(async () => {
    const taskModule = await import('./Task.mjs');
    Task = taskModule.default;
    Task.resetStats();
  });

  test('asap executes within a frame interval', async () => {
    const results = [];
    const t0 = performance.now();

    Task.asap(() => results.push(performance.now() - t0));

    await timeout(50);

    expect(results).toHaveLength(1);
    expect(results[0]).toBeLessThan(20);
  });

  test('defer executes after asap tasks', async () => {
    const results = [];

    Task.asap(() => results.push('asap'));
    Task.defer(() => results.push('defer'));

    await timeout(50);

    expect(results).toEqual(['asap', 'defer']);
  });

  test('delay waits at least the specified timeout', async () => {
    const results = [];
    const t0 = performance.now();

    Task.delay(() => results.push(performance.now() - t0), 50);

    await timeout(100);

    expect(results).toHaveLength(1);
    expect(results[0]).toBeGreaterThanOrEqual(49);
  });

  test('delay with zero timeout behaves like defer', async () => {
    const results = [];

    Task.asap(() => results.push('asap'));
    Task.delay(() => results.push('delay-0'), 0);

    await timeout(50);

    expect(results).toEqual(['asap', 'delay-0']);
  });

  test('multiple asap tasks execute in order within one frame', async () => {
    const results = [];

    Task.asap(() => results.push(1));
    Task.asap(() => results.push(2));
    Task.asap(() => results.push(3));

    await timeout(50);

    expect(results).toEqual([1, 2, 3]);
  });

  test('getTime returns elapsed time, getTime(true) returns remaining', () => {
    const elapsed = Task.getTime();
    const remaining = Task.getTime(true);

    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(12.5); // frameExecutionTimeout
    expect(elapsed + remaining).toBeCloseTo(12.5, 0);
  });

  test('getStats tracks execution after asap and defer tasks', async () => {
    // Use a busy-wait to ensure measurable exec time so currTime > 0
    function busyWait() {
      const end = performance.now() + 1;
      while (performance.now() < end) {}
    }

    Task.asap(busyWait);
    Task.defer(busyWait);

    await timeout(100);

    const stats = Task.getStats();
    // exec stats track time spent running tasks in a frame
    expect(stats.exec.count).toBeGreaterThan(0);
    expect(stats.exec.totalTime).toBeGreaterThan(0);
  });

  test('resetStats zeroes all counters', async () => {
    Task.asap(() => {});
    await timeout(50);

    Task.resetStats();
    const stats = Task.getStats();

    expect(stats.exec.count).toBe(0);
    expect(stats.exec.totalTime).toBe(0);
  });
});
