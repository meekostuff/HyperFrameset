import { describe, test, expect, beforeEach } from 'vitest';

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isThenable = (v) => v != null && typeof v.then === 'function';

describe('Thenfu static methods', () => {
  let Thenfu;

  beforeEach(async () => {
    const mod = await import('./Thenfu.mjs');
    Thenfu = mod.default;
  });

  // --- resolve ---

  test('resolve delivers a value', async () => {
    let result;
    Thenfu.resolve(42).then(v => { result = v; });

    await timeout(50);
    expect(result).toBe(42);
  });

  test('resolve does not deliver in the same microtask loop', async () => {
    const order = [];
    Thenfu.resolve(42).then(() => order.push('resolved'));
    queueMicrotask(() => order.push('microtask'));

    await timeout(50);
    expect(order[0]).toBe('microtask');
  });

  // --- isThenable ---

  test('isThenable detects objects with .then', () => {
    expect(Thenfu.isThenable({ then: () => {} })).toBe(true);
    expect(Thenfu.isThenable(Thenfu.resolve(1))).toBe(true);
    expect(Thenfu.isThenable(Promise.resolve(1))).toBe(true);
    expect(Thenfu.isThenable(42)).toBe(false);
    expect(Thenfu.isThenable(null)).toBe(false);
    expect(Thenfu.isThenable('str')).toBe(false);
  });

  // --- Non-blocking behavior ---

  // --- asap ---

  test('asap with a function yields beyond the microtask queue', async () => {
    const order = [];
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
    Thenfu.resolve(Thenfu.asap(99)).then(v => { result = v; });

    await timeout(50);
    expect(result).toBe(99);
  });

  test('asap with a settled thenable delivers its value', async () => {
    let result;
    Thenfu.asap(Thenfu.resolve('val')).then(v => { result = v; });

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
      v => Thenfu.resolve(v + 10),
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
    Thenfu.reduce(0, [1, 2, 3, 4], (acc, val) => acc + val)
      .then(v => { result = v; });

    await timeout(100);
    expect(result).toBe(10);
  });

  test('reduce is non-blocking for large arrays', async () => {
    const arr = Array.from({ length: 10000 }, (_, i) => i);
    let result;

    Thenfu.reduce(0, arr, (acc, val) => acc + val)
      .then(v => { result = v; });

    await timeout(200);
    expect(result).toBe(49995000);
  });
});
