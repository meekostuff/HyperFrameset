import { describe, test, expect, beforeEach } from 'vitest';

describe('JSONDecoder', () => {
  let decoder;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/JSONDecoder.mjs');
    decoder = new mod.default();
  });

  test('init accepts an object', () => {
    expect(() => decoder.init({ a: 1 })).not.toThrow();
  });

  test('init rejects non-objects', () => {
    expect(() => decoder.init(null)).toThrow();
    expect(() => decoder.init('string')).toThrow();
    expect(() => decoder.init(42)).toThrow();
  });

  test('evaluate "." returns root object', () => {
    const obj = { a: 1 };
    decoder.init(obj);
    expect(decoder.evaluate('.')).toBe(obj);
  });

  test('evaluate "." with wantArray wraps in array', () => {
    const obj = { a: 1 };
    decoder.init(obj);
    expect(decoder.evaluate('.', null, null, true)).toEqual([obj]);
  });

  test('evaluate simple path', () => {
    decoder.init({ a: { b: 'hello' } });
    expect(decoder.evaluate('a.b')).toBe('hello');
  });

  test('evaluate nested path', () => {
    decoder.init({ a: { b: { c: 42 } } });
    expect(decoder.evaluate('a.b.c')).toBe(42);
  });

  test('evaluate missing path returns undefined', () => {
    decoder.init({ a: 1 });
    expect(decoder.evaluate('b.c')).toBeUndefined();
  });

  test('evaluate with wantArray returns array of results', () => {
    decoder.init({ a: { b: 'val' } });
    expect(decoder.evaluate('a.b', null, null, true)).toEqual(['val']);
  });

  test('evaluate flattens arrays in path', () => {
    decoder.init({ items: [{ name: 'x' }, { name: 'y' }] });
    expect(decoder.evaluate('items.name', null, null, true)).toEqual(['x', 'y']);
  });

  test('evaluate with ^ resets to root', () => {
    const obj = { a: { b: 1 }, c: 2 };
    decoder.init(obj);
    expect(decoder.evaluate('^c', obj.a)).toBe(2);
  });

  test('evaluate with explicit context', () => {
    decoder.init({ a: 1 });
    const ctx = { b: 'from-context' };
    expect(decoder.evaluate('b', ctx)).toBe('from-context');
  });
});
