import { describe, test, expect } from 'vitest';
import * as _ from '../src/Meeko/stuff.mjs';

describe('stuff.mjs', () => {

  // --- string utils ---

  test('uc uppercases a string', () => {
    expect(_.uc('hello')).toBe('HELLO');
    expect(_.uc('')).toBe('');
    expect(_.uc(null)).toBe('');
  });

  test('lc lowercases a string', () => {
    expect(_.lc('HELLO')).toBe('hello');
    expect(_.lc('')).toBe('');
    expect(_.lc(null)).toBe('');
  });

  test('ucFirst capitalizes first character', () => {
    expect(_.ucFirst('hello')).toBe('Hello');
    expect(_.ucFirst('')).toBe('');
    expect(_.ucFirst(null)).toBe('');
  });

  test('camelCase converts kebab to camel', () => {
    expect(_.camelCase('foo-bar-baz')).toBe('fooBarBaz');
    expect(_.camelCase('single')).toBe('single');
    expect(_.camelCase('')).toBe('');
  });

  test('kebabCase converts camel to kebab', () => {
    expect(_.kebabCase('fooBarBaz')).toBe('foo-bar-baz');
    expect(_.kebabCase('single')).toBe('single');
    expect(_.kebabCase('')).toBe('');
  });

  test('words splits on whitespace', () => {
    expect(_.words('a b c')).toEqual(['a', 'b', 'c']);
    expect(_.words('one')).toEqual(['one']);
  });

  // --- array utils ---

  test('includes checks array membership', () => {
    expect(_.includes([1, 2, 3], 2)).toBe(true);
    expect(_.includes([1, 2, 3], 4)).toBe(false);
  });

  test('forEach iterates all elements', () => {
    const result = [];
    _.forEach([1, 2, 3], v => result.push(v));
    expect(result).toEqual([1, 2, 3]);
  });

  test('some returns true if any match', () => {
    expect(_.some([1, 2, 3], v => v === 2)).toBe(true);
    expect(_.some([1, 2, 3], v => v === 4)).toBe(false);
  });

  test('every returns true if all match', () => {
    expect(_.every([2, 4, 6], v => v % 2 === 0)).toBe(true);
    expect(_.every([2, 3, 6], v => v % 2 === 0)).toBe(false);
  });

  test('map transforms elements', () => {
    expect(_.map([1, 2, 3], v => v * 2)).toEqual([2, 4, 6]);
  });

  test('filter selects matching elements', () => {
    expect(_.filter([1, 2, 3, 4], v => v % 2 === 0)).toEqual([2, 4]);
  });

  test('find returns first match', () => {
    expect(_.find([1, 2, 3], v => v > 1)).toBe(2);
    expect(_.find([1, 2, 3], v => v > 5)).toBeUndefined();
  });

  test('findIndex returns index of first match', () => {
    expect(_.findIndex([1, 2, 3], v => v > 1)).toBe(1);
    expect(_.findIndex([1, 2, 3], v => v > 5)).toBe(-1);
  });

  test('without removes items in second array', () => {
    expect(_.without([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
  });

  test('difference returns symmetric difference', () => {
    expect(_.difference([1, 2, 3], [2, 3, 4])).toEqual([1, 4]);
  });

  // --- object utils ---

  test('forIn iterates own and inherited properties', () => {
    const parent = { a: 1 };
    const child = Object.create(parent);
    child.b = 2;
    const result = {};
    _.forIn(child, (val, key) => { result[key] = val; });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test('forOwn iterates own properties', () => {
    const result = {};
    _.forOwn({ a: 1, b: 2 }, (val, key) => { result[key] = val; });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test('isEmpty checks for empty objects', () => {
    expect(_.isEmpty({})).toBe(true);
    expect(_.isEmpty({ a: 1 })).toBe(false);
    expect(_.isEmpty(null)).toBe(true);
  });

  test('defaults only sets undefined properties', () => {
    const dest = { a: 1 };
    _.defaults(dest, { a: 99, b: 2 });
    expect(dest).toEqual({ a: 1, b: 2 });
  });

  test('assign overwrites all properties', () => {
    const dest = { a: 1 };
    _.assign(dest, { a: 99, b: 2 });
    expect(dest).toEqual({ a: 99, b: 2 });
  });

  test('map without callback copies array', () => {
    const a = [1, 2, 3];
    const copy = _.map(a);
    expect(copy).toEqual([1, 2, 3]);
    expect(copy).not.toBe(a);
  });

  test('forEach passes context as this', () => {
    const ctx = { count: 0 };
    _.forEach([1, 2], function() { this.count++; }, ctx);
    expect(ctx.count).toBe(2);
  });

  test('some passes context as this', () => {
    const ctx = { target: 2 };
    const result = _.some([1, 2, 3], function(v) { return v === this.target; }, ctx);
    expect(result).toBe(true);
  });

  test('every passes context as this', () => {
    const ctx = { min: 0 };
    const result = _.every([1, 2, 3], function(v) { return v > this.min; }, ctx);
    expect(result).toBe(true);
  });

  test('map passes context as this', () => {
    const ctx = { mult: 10 };
    const result = _.map([1, 2], function(v) { return v * this.mult; }, ctx);
    expect(result).toEqual([10, 20]);
  });

  test('filter passes context as this', () => {
    const ctx = { min: 2 };
    const result = _.filter([1, 2, 3], function(v) { return v >= this.min; }, ctx);
    expect(result).toEqual([2, 3]);
  });

});
