import { describe, it, expect, test } from 'vitest';
import Registry from '../src/Meeko/Registry.mjs';

describe('Registry', () => {
  it('stores and retrieves values', () => {
    const reg = new Registry();
    reg.set('foo', 'bar');
    expect(reg.get('foo')).toBe('bar');
    expect(reg.has('foo')).toBe(true);
  });

  it('prevents overwriting in write-once mode', () => {
    const reg = new Registry({ writeOnce: true });
    reg.set('key', 'value');
    expect(() => reg.set('key', 'other')).toThrow('Attempted to rewrite key');
  });

  it('validates keys with keyValidator', () => {
    const reg = new Registry({ keyValidator: (k) => typeof k === 'string' && /^[a-z]+$/.test(k) });
    reg.set('valid', 1);
    expect(() => reg.set('INVALID', 1)).toThrow('Invalid key');
  });

  it('validates values with valueValidator', () => {
    const reg = new Registry({ valueValidator: (v) => typeof v === 'function' });
    reg.set('fn', () => {});
    expect(() => reg.set('fn', 'not a function')).toThrow('Invalid value');
  });

  it('register is an alias for set', () => {
    const reg = new Registry();
    reg.register('a', 1);
    expect(reg.get('a')).toBe(1);
  });

  test('has returns true for registered keys', () => {
    const reg = new Registry();
    reg.register('a', 'value');
    expect(reg.has('a')).toBe(true);
    expect(reg.has('b')).toBe(false);
  });

  test('writeOnce prevents duplicate registration', () => {
    const reg = new Registry({ writeOnce: true });
    reg.register('a', 'first');
    expect(() => reg.register('a', 'second')).toThrow();
    expect(reg.get('a')).toBe('first');
  });
});
