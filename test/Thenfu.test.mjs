import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isThenable = (v) => v != null && typeof v.then === 'function';

describe('Thenfu static methods', () => {
  let Thenfu;
  let Task;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/Thenfu.mjs');
    const taskMod = await import('../src/Meeko/Task.mjs');
    Thenfu = mod.default;
    Task = taskMod.default;
  });

  // --- Error handling verification ---
  let unhandledRejections = [];
  let rejectionHandler;

  beforeEach(() => {
    unhandledRejections = [];
    rejectionHandler = (event) => {
      unhandledRejections.push(event.reason);
      event.preventDefault(); // Prevent Vitest from treating as test failure
    };
    window.addEventListener('unhandledrejection', rejectionHandler);
  });

  afterEach(() => {
    window.removeEventListener('unhandledrejection', rejectionHandler);
  });

  test('uncaught errors in then() are logged to console', async () => {
    Thenfu.asap(42).then(() => {
      throw new Error('uncaught error');
    });

    await timeout(100);
    expect(unhandledRejections).toHaveLength(1);
    expect(unhandledRejections[0].message).toBe('uncaught error');
  });

  test('errors caught with catch() do not reach console', async () => {
    let caughtError;
    
    Thenfu.asap(42)
      .then(() => { throw new Error('caught error'); })
      .catch(e => { caughtError = e; });

    await timeout(100);
    expect(caughtError.message).toBe('caught error');
    expect(unhandledRejections).toHaveLength(0); // Should not be unhandled
  });

  test('errors in try() without catch are logged to console', async () => {
    Thenfu.try(() => {
      throw new Error('try error');
    });

    await timeout(100);
    expect(unhandledRejections).toHaveLength(1);
    expect(unhandledRejections[0].message).toBe('try error');
  });

  test('nested promise chain errors are handled', async () => {
    Thenfu.asap(1)
      .then(() => Thenfu.asap(2))
      .then(() => {
        throw new Error('nested error');
      });

    await timeout(100);
    expect(unhandledRejections).toHaveLength(1);
    expect(unhandledRejections[0].message).toBe('nested error');
  });

  // --- resolve ---

  test('resolve delivers a value', async () => {
    let result;
    Thenfu.asap(42).then(v => { result = v; });

    await timeout(50);
    expect(result).toBe(42);
  });

  test('resolve does not deliver in the same microtask loop', async () => {
    const order = [];
    Thenfu.asap(42).then(() => order.push('resolved'));
    queueMicrotask(() => order.push('microtask'));

    await timeout(50);
    expect(order[0]).toBe('microtask');
  });

  // --- isThenable ---

  test('isThenable detects objects with .then', () => {
    expect(Thenfu.isThenable({ then: () => {} })).toBe(true);
    expect(Thenfu.isThenable(Thenfu.asap(1))).toBe(true);
    expect(Thenfu.isThenable(Promise.resolve(1))).toBe(true);
    expect(Thenfu.isThenable(42)).toBe(false);
    expect(Thenfu.isThenable(null)).toBe(false);
    expect(Thenfu.isThenable('str')).toBe(false);
  });

  // --- try ---

  test('try executes function and returns result', async () => {
    let result;
    Thenfu.try(() => 42).then(v => { result = v; });

    await timeout(50);
    expect(result).toBe(42);
  });

  test('try catches thrown errors', async () => {
    let error;
    Thenfu.try(() => { throw new Error('test error'); })
      .catch(e => { error = e; });

    await timeout(50);
    expect(error.message).toBe('test error');
  });

  test('try returns thenable', () => {
    const result = Thenfu.try(() => 42);
    expect(Thenfu.isThenable(result)).toBe(true);
  });

  test('try accepts parameters', async () => {
    const result = await Thenfu.try((a, b) => a + b, 5, 3);
    expect(result).toBe(8);
  });

  test('try waits for promise parameters', async () => {
    const p1 = Promise.resolve(10);
    const p2 = Promise.resolve(20);
    const result = await Thenfu.try((a, b) => a * b, p1, p2);
    expect(result).toBe(200);
  });

  test('try rejects if parameter promise rejects', async () => {
    const p1 = Promise.resolve(5);
    const p2 = Promise.reject(new Error('param error'));
    
    try {
      await Thenfu.try((a, b) => a + b, p1, p2);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error.message).toBe('param error');
    }
  });

  test('try rejects if function throws', async () => {
    try {
      await Thenfu.try(() => { throw new Error('fn error'); });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error.message).toBe('fn error');
    }
  });

  test('settle resolves with values', () => {
    const resolver = Promise.withResolvers();
    Thenfu.settle(resolver, 42);
    return expect(resolver.promise).resolves.toBe(42);
  });

  test('settle rejects with Error objects', () => {
    const resolver = Promise.withResolvers();
    const error = new Error('test error');
    Thenfu.settle(resolver, error);
    return expect(resolver.promise).rejects.toBe(error);
  });

  test('settle executes functions', () => {
    const resolver = Promise.withResolvers();
    Thenfu.settle(resolver, () => 'result');
    return expect(resolver.promise).resolves.toBe('result');
  });

  test('settle catches function errors', () => {
    const resolver = Promise.withResolvers();
    const error = new Error('function error');
    Thenfu.settle(resolver, () => { throw error; });
    return expect(resolver.promise).rejects.toBe(error);
  });

  test('settle resolves with thenables', async () => {
    const resolver = Promise.withResolvers();
    const thenable = Thenfu.asap(123);
    Thenfu.settle(resolver, thenable);
    const result = await resolver.promise;
    expect(result).toBe(123);
  });

  // --- Non-blocking behavior ---

  // --- asap ---

  test('asap with a function yields beyond the microtask queue', async () => {
    const order = [];
    
    // Poll until frame time is low, then force Task.asap to consume remaining time
    Task.asap(() => {});
    while (Task.getTime(true) >= 0) {}
    
    Thenfu.asap(() => 'result').then(() => order.push('asap'));
    queueMicrotask(() => order.push('microtask'));

    await timeout(50);
    expect(order[0]).toBe('microtask');
  });

  test('asap with a function executes and delivers result', async () => {
    let result;
    const p = Thenfu.asap(() => 'result');
    expect(isThenable(p)).toBe(true);
    p.then(v => { result = v; });

    await timeout(50);
    expect(result).toBe('result');
  });

  test('asap with a value delivers that value', async () => {
    let result;
    Thenfu.asap(Thenfu.asap(99)).then(v => { result = v; });

    await timeout(50);
    expect(result).toBe(99);
  });

  test('asap with a settled thenable delivers its value', async () => {
    let result;
    Thenfu.asap(Thenfu.asap('val')).then(v => { result = v; });

    await timeout(50);
    expect(result).toBe('val');
  });

  // --- defer ---

  test('defer with a value yields beyond the microtask queue', async () => {
    const order = [];

    Thenfu.defer('deferred').then(v => order.push(v));
    queueMicrotask(() => order.push('microtask'));

    await timeout(50);
    expect(order).toEqual(['microtask', 'deferred']);
  });

  test('defer with a function yields beyond the microtask queue', async () => {
    const order = [];

    Thenfu.defer(() => { order.push('fn'); return 'ok'; })
      .then(v => { order.push(v); });
    queueMicrotask(() => order.push('microtask'));

    await timeout(50);
    expect(order).toEqual(['microtask', 'fn', 'ok']);
  });

  // --- delay ---

  test('delay resolves after at least the specified timeout', async () => {
    const t0 = performance.now();
    let elapsed;

    Thenfu.delay(50).then(() => { elapsed = performance.now() - t0; });

    await timeout(100);
    expect(elapsed).toBeGreaterThanOrEqual(49);
  });

  test('delay with zero timeout yields beyond the microtask queue', async () => {
    const order = [];

    Thenfu.delay(0).then(() => order.push('delay-0'));
    queueMicrotask(() => order.push('microtask'));

    await timeout(50);
    expect(order).toEqual(['microtask', 'delay-0']);
  });

  // --- pipe ---

  test('pipe chains functions sequentially', async () => {
    const order = [];
    Thenfu.pipe(1, [
      v => v + 1,
      v => v * 3,
      v => v + 10,
    ]).then(v => { order.push(v); });
    queueMicrotask(() => order.push('microtask'));

    await timeout(100);
    expect(order).toEqual(['microtask', 16]); // (1+1)*3+10
  });

  test('pipe chains steps that return promises', async () => {
    let result;
    Thenfu.pipe(1, [
      v => Thenfu.delay(10).then(() => v + 1),
      v => Promise.resolve(v * 3),
      v => Thenfu.asap(v + 10),
    ]).then(v => { result = v; });

    await timeout(200);
    expect(result).toBe(16); // (1+1)*3+10
  });

  test('pipe propagates errors', async () => {
    const order = [];
    Thenfu.pipe('x', [
      () => { throw new Error('boom'); },
      () => 'should not run',
    ]).catch(e => { order.push(e.message); });
    queueMicrotask(() => order.push('microtask'));

    await timeout(100);
    expect(order).toEqual(['microtask', 'boom']);
  });

  // --- wait ---

  test('wait yields beyond the microtask queue', async () => {
    const order = [];
    Thenfu.wait(() => true).then(() => order.push('wait'));
    queueMicrotask(() => order.push('microtask'));

    await timeout(50);
    expect(order[0]).toBe('microtask');
  });

  test('wait resolves when test function returns true', async () => {
    let count = 0;
    let resolved = false;
    Thenfu.wait(() => {
      count++;
      return count >= 3;
    }).then(() => { resolved = true; });

    await timeout(200);
    expect(resolved).toBe(true);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // --- reduce ---

  test('reduce yields beyond the microtask queue', async () => {
    const order = [];
    Thenfu.reduce(0, [1, 2], (acc, val) => acc + val)
      .then(() => order.push('reduce'));
    queueMicrotask(() => order.push('microtask'));

    await timeout(50);
    expect(order[0]).toBe('microtask');
  });

  test('reduce accumulates values sequentially', async () => {
    let result;
    let order = [];
    Thenfu.reduce(0, [1, 2, 3, 4], (acc, val) => { order.push(val); return acc + val; })
      .then(v => { result = v; });

    await timeout(50);
    expect(order).toStrictEqual([1, 2, 3, 4]);
    expect(result).toBe(10);
  });

  // Test that reduce doesn't block requestAnimationFrame by counting frames during processing
  test('reduce does not block animation frames', async () => {
    let frameCount = 0;
    let rafHandle;
    
    function countFrames() {
      frameCount++;
      if (frameCount < 10) rafHandle = requestAnimationFrame(countFrames);
    }
    rafHandle = requestAnimationFrame(countFrames);
    
    const fragment = document.createDocumentFragment();
    const arr = new Array(100).fill(1);
    
    const result = await Thenfu.reduce(fragment, arr, (frag, val) => {
      const start = performance.now();
      while (performance.now() - start < 1) { /* busy wait 1ms */ }
      const div = document.createElement('div');
      div.textContent = performance.now();
      frag.appendChild(div);
      return frag;
    });
    
    cancelAnimationFrame(rafHandle);
    expect(result.children.length).toBe(100);
    expect(frameCount).toBeGreaterThanOrEqual(2);
  });

  // Test that reduce progresses at least one element per frame even with slow callbacks
  test('reduce progresses at least one element per frame', async () => {
    let frameCount = 0;
    let processedCount = 0;
    let rafHandle;
    
    function countFrames() {
      frameCount++;
      if (frameCount < 5) rafHandle = requestAnimationFrame(countFrames);
    }
    rafHandle = requestAnimationFrame(countFrames);

    const arr = new Array(3).fill(1);
    
    const result = await Thenfu.reduce(0, arr, (acc, val) => {
      processedCount++;
      const start = performance.now();
      while (performance.now() - start < 50) { /* busy wait 50ms */ }
      return acc + val;
    });
    
    cancelAnimationFrame(rafHandle);
    expect(result).toBe(3);
    expect(processedCount).toBe(3);
    expect(frameCount).toBeLessThanOrEqual(4); // There may have been a frame before processing started.
  });

  test('reduce handles callbacks that return thenables', async () => {
    let result;
    let order = [];
    
    Thenfu.reduce(0, [1, 2, 3], (acc, val) => {
      order.push(`start-${val}`);
      return Thenfu.asap(acc + val).then(sum => {
        order.push(`end-${val}`);
        return sum;
      });
    }).then(v => { result = v; });

    expect(order).toHaveLength(0);

    await timeout(50);
    expect(result).toBe(6);
    expect(order).toStrictEqual([ 'start-1', 'end-1', 'start-2', 'end-2', 'start-3', 'end-3']);
  });

  test('reject delivers error via catch', async () => {
    let caught;
    // Use defer to reject after catch is attached
    Thenfu.defer(() => { throw 'reject-error'; })
      .catch(e => { caught = e; });

    await timeout(50);
    expect(caught).toBeDefined();
  });

  // --- create ---

});
