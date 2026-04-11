import { describe, test, expect, beforeEach } from 'vitest';

describe('builtin-filters', () => {
  let filters;

  beforeEach(async () => {
    await import('../src/Meeko/builtin-filters.mjs');
    const mod = await import('../src/Meeko/filters.mjs');
    filters = mod.default;
  });

  function evaluate(name, value, ...params) {
    return filters.evaluate(name, value, params);
  }

  test('lowercase', () => {
    expect(evaluate('lowercase', 'Hello World')).toBe('hello world');
  });

  test('uppercase', () => {
    expect(evaluate('uppercase', 'Hello World')).toBe('HELLO WORLD');
  });

  test('if returns yep when truthy', () => {
    expect(evaluate('if', 'truthy', 'yes')).toBe('yes');
    expect(evaluate('if', 1, 'yes')).toBe('yes');
  });

  test('if returns original value when falsy', () => {
    expect(evaluate('if', '', 'yes')).toBe('');
    expect(evaluate('if', 0, 'yes')).toBe(0);
    expect(evaluate('if', null, 'yes')).toBe(null);
  });

  test('unless returns nope when falsy', () => {
    expect(evaluate('unless', '', 'no')).toBe('no');
    expect(evaluate('unless', 0, 'no')).toBe('no');
    expect(evaluate('unless', null, 'no')).toBe('no');
  });

  test('unless returns original value when truthy', () => {
    expect(evaluate('unless', 'truthy', 'no')).toBe('truthy');
    expect(evaluate('unless', 1, 'no')).toBe(1);
  });

  test('if_unless returns yep when truthy, nope when falsy', () => {
    expect(evaluate('if_unless', true, 'yes', 'no')).toBe('yes');
    expect(evaluate('if_unless', false, 'yes', 'no')).toBe('no');
    expect(evaluate('if_unless', 1, 'yes', 'no')).toBe('yes');
    expect(evaluate('if_unless', 0, 'yes', 'no')).toBe('no');
  });

  test('map with object dict', () => {
    const dict = { a: 'alpha', b: 'bravo' };
    expect(evaluate('map', 'a', dict)).toBe('alpha');
    expect(evaluate('map', 'b', dict)).toBe('bravo');
    expect(evaluate('map', 'c', dict)).toBe('c');
  });

  test('map with array dict', () => {
    const dict = ['foo', 'FOO', 'bar', 'BAR'];
    expect(evaluate('map', 'foo', dict)).toBe('FOO');
    expect(evaluate('map', 'bar', dict)).toBe('BAR');
    expect(evaluate('map', 'baz', dict)).toBe('baz');
  });

  test('map with regex patterns in array', () => {
    const dict = [/^f.*/, 'matched-f', /^b.*/, 'matched-b'];
    expect(evaluate('map', 'foo', dict)).toBe('matched-f');
    expect(evaluate('map', 'bar', dict)).toBe('matched-b');
    expect(evaluate('map', 'xyz', dict)).toBe('xyz');
  });

  test('match returns boolean by default', () => {
    expect(evaluate('match', 'hello', 'hello')).toBe(true);
    expect(evaluate('match', 'hello', 'world')).toBe(false);
  });

  test('match returns yep/nope when provided', () => {
    expect(evaluate('match', 'hello', 'hello', 'yes', 'no')).toBe('yes');
    expect(evaluate('match', 'hello', 'world', 'yes', 'no')).toBe('no');
  });

  test('match with regex', () => {
    expect(evaluate('match', 'hello', /^hel/)).toBe(true);
    expect(evaluate('match', 'hello', /^world/)).toBe(false);
  });

  test('replace with string', () => {
    expect(evaluate('replace', 'hello world', 'world', 'there')).toBe('hello there');
  });

  test('replace with regex', () => {
    expect(evaluate('replace', 'aabaa', /a/g, 'x')).toBe('xxbxx');
  });

  test('date formats a date', () => {
    const d = new Date(2026, 0, 15);
    const result = evaluate('date', d, 'yyyy-mm-dd');
    expect(result).toBe('2026-01-15');
  });
});
