import { describe, test, expect } from 'vitest';
import { compile, evaluate, Scope } from '../src/Meeko/expressions.mjs';

describe('expressions', () => {

  describe('compile', () => {
    test('returns a function', () => {
      let fn = compile('1 + 2');
      expect(typeof fn).toBe('function');
    });

    test('caches repeated compilations', () => {
      let fn1 = compile('x + 1');
      let fn2 = compile('x + 1');
      expect(fn1).toBe(fn2);
    });

    test('invalid expression returns function that returns undefined', () => {
      let fn = compile('!!!{{{');
      expect(fn({})).toBeUndefined();
    });
  });

  describe('evaluate - simple expressions', () => {
    test('property access', () => {
      expect(evaluate('user.name', { user: { name: 'Alice' } })).toBe('Alice');
    });

    test('nested property access', () => {
      expect(evaluate('user.address.city', { user: { address: { city: 'Sydney' } } })).toBe('Sydney');
    });

    test('array length', () => {
      expect(evaluate('items.length', { items: [1, 2, 3] })).toBe(3);
    });

    test('arithmetic', () => {
      expect(evaluate('a + b', { a: 2, b: 3 })).toBe(5);
    });

    test('comparison - truthy', () => {
      expect(evaluate('count > 0', { count: 5 })).toBe(true);
    });

    test('comparison - falsy', () => {
      expect(evaluate('count > 0', { count: 0 })).toBe(false);
    });

    test('equality', () => {
      expect(evaluate("role === 'admin'", { role: 'admin' })).toBe(true);
    });

    test('ternary', () => {
      expect(evaluate("active ? 'yes' : 'no'", { active: true })).toBe('yes');
      expect(evaluate("active ? 'yes' : 'no'", { active: false })).toBe('no');
    });

    test('logical operators', () => {
      expect(evaluate('a && b', { a: true, b: false })).toBe(false);
      expect(evaluate('a || b', { a: false, b: true })).toBe(true);
    });

    test('nullish coalescing', () => {
      expect(evaluate('x ?? "default"', { x: null })).toBe('default');
      expect(evaluate('x ?? "default"', { x: 'value' })).toBe('value');
    });

    test('optional chaining', () => {
      expect(evaluate('user?.address?.city', { user: {} })).toBeUndefined();
      expect(evaluate('user?.address?.city', { user: { address: { city: 'Perth' } } })).toBe('Perth');
    });
  });

  describe('evaluate - template literals', () => {
    test('simple interpolation', () => {
      expect(evaluate('`Hello ${name}`', { name: 'Alice' })).toBe('Hello Alice');
    });

    test('multiple interpolations', () => {
      expect(evaluate('`${greeting} ${name}, you have ${count} items`', {
        greeting: 'Hi', name: 'Bob', count: 5
      })).toBe('Hi Bob, you have 5 items');
    });

    test('expression inside interpolation', () => {
      expect(evaluate('`${count * 2} items`', { count: 3 })).toBe('6 items');
    });

    test('method call in interpolation', () => {
      expect(evaluate('`${name.toUpperCase()}`', { name: 'alice' })).toBe('ALICE');
    });
  });

  describe('evaluate - function calls', () => {
    test('custom helper function', () => {
      let scope = { name: 'hello', upper: (s) => s.toUpperCase() };
      expect(evaluate('upper(name)', scope)).toBe('HELLO');
    });

    test('multiple helper functions', () => {
      let scope = {
        value: '  hello  ',
        trim: (s) => s.trim(),
        upper: (s) => s.toUpperCase()
      };
      expect(evaluate('upper(trim(value))', scope)).toBe('HELLO');
    });

    test('arrow function in expression', () => {
      let scope = { items: [1, 2, 3, 4, 5] };
      expect(evaluate('items.filter(x => x > 3)', scope)).toEqual([4, 5]);
    });

    test('array methods', () => {
      let scope = { items: ['a', 'b', 'c'] };
      expect(evaluate('items.join(", ")', scope)).toBe('a, b, c');
    });
  });

  describe('evaluate - DOM access', () => {
    test('querySelector', () => {
      let div = document.createElement('div');
      div.innerHTML = '<h1>Title</h1><p>Content</p>';
      expect(evaluate('root.querySelector("h1").textContent', { root: div })).toBe('Title');
    });

    test('querySelectorAll returns NodeList', () => {
      let div = document.createElement('div');
      div.innerHTML = '<li>a</li><li>b</li><li>c</li>';
      expect(evaluate('[...root.querySelectorAll("li")].length', { root: div })).toBe(3);
    });

    test('querySelector returns null for no match', () => {
      let div = document.createElement('div');
      div.innerHTML = '<p>hello</p>';
      expect(evaluate('root.querySelector("h1")', { root: div })).toBeNull();
    });

    test('optional chaining with querySelector', () => {
      let div = document.createElement('div');
      div.innerHTML = '<p>hello</p>';
      expect(evaluate('root.querySelector("h1")?.textContent', { root: div })).toBeUndefined();
    });

    test('getAttribute', () => {
      let div = document.createElement('div');
      div.innerHTML = '<a href="/page">link</a>';
      expect(evaluate('root.querySelector("a").getAttribute("href")', { root: div })).toBe('/page');
    });
  });

  describe('evaluate - edge cases', () => {
    test('undefined variable returns undefined', () => {
      expect(evaluate('missing', {})).toBeUndefined();
    });

    test('null value', () => {
      expect(evaluate('x', { x: null })).toBeNull();
    });

    test('empty string', () => {
      expect(evaluate('x', { x: '' })).toBe('');
    });

    test('zero', () => {
      expect(evaluate('x', { x: 0 })).toBe(0);
    });

    test('boolean false', () => {
      expect(evaluate('x', { x: false })).toBe(false);
    });

    test('array value', () => {
      expect(evaluate('x', { x: [1, 2] })).toEqual([1, 2]);
    });

    test('object value', () => {
      expect(evaluate('x', { x: { a: 1 } })).toEqual({ a: 1 });
    });
  });

  describe('Scope', () => {
    test('set and get a variable', () => {
      let scope = new Scope();
      scope.set('x', 42);
      expect(scope.get('x')).toBe(42);
    });

    test('constructor initial values become globalParams', () => {
      let scope = new Scope({ a: 1, b: 2 });
      expect(scope.get('a')).toBe(1);
      expect(scope.get('b')).toBe(2);
    });

    test('has returns true for existing variable', () => {
      let scope = new Scope({ x: 'hello' });
      expect(scope.has('x')).toBe(true);
      expect(scope.has('y')).toBe(false);
    });

    test('localVars shadows globalParams', () => {
      let scope = new Scope({ x: 'global' });
      scope.set('x', 'local');
      expect(scope.get('x')).toBe('local');
    });

    test('localParams shadows globalVars', () => {
      let scope = new Scope();
      scope.set('x', 'globalVar', { global: true });
      scope.set('x', 'localParam', { param: true });
      expect(scope.get('x')).toBe('localParam');
    });

    test('localVars shadows localParams', () => {
      let scope = new Scope();
      scope.set('x', 'param', { param: true });
      scope.set('x', 'var');
      expect(scope.get('x')).toBe('var');
    });

    test('global var', () => {
      let scope = new Scope();
      scope.set('x', 'gvar', { global: true });
      expect(scope.get('x')).toBe('gvar');
    });

    test('global param', () => {
      let scope = new Scope();
      scope.set('x', 'gparam', { global: true, param: true });
      expect(scope.get('x')).toBe('gparam');
    });

    test('push creates new local scope', () => {
      let scope = new Scope({ outer: 'yes' });
      scope.set('x', 'before');
      scope.push({ arg: 'hello' });
      expect(scope.get('arg')).toBe('hello');
      expect(scope.get('x')).toBeUndefined(); // localVars reset
      expect(scope.get('outer')).toBe('yes'); // globalParams still visible
    });

    test('pop restores previous local scope', () => {
      let scope = new Scope();
      scope.set('x', 'outer');
      scope.push();
      scope.set('x', 'inner');
      expect(scope.get('x')).toBe('inner');
      scope.pop();
      expect(scope.get('x')).toBe('outer');
    });

    test('nested push/pop', () => {
      let scope = new Scope();
      scope.set('a', 1);
      scope.push({ b: 2 });
      scope.set('c', 3);
      scope.push({ d: 4 });
      expect(scope.get('d')).toBe(4);
      expect(scope.get('c')).toBeUndefined(); // lost in inner push
      expect(scope.get('b')).toBeUndefined(); // lost in inner push
      expect(scope.get('a')).toBeUndefined(); // was localVar in outer
      scope.pop();
      expect(scope.get('b')).toBe(2);
      expect(scope.get('c')).toBe(3);
      scope.pop();
      expect(scope.get('a')).toBe(1);
    });

    test('global vars persist across push/pop', () => {
      let scope = new Scope();
      scope.set('g', 'global', { global: true });
      scope.push();
      expect(scope.get('g')).toBe('global');
      scope.pop();
      expect(scope.get('g')).toBe('global');
    });

    test('values proxy works with evaluate', () => {
      let scope = new Scope({ name: 'Alice', greeting: 'Hello' });
      expect(evaluate('`${greeting} ${name}`', scope.values)).toBe('Hello Alice');
    });

    test('values proxy respects precedence', () => {
      let scope = new Scope({ x: 'global' });
      scope.set('x', 'local');
      expect(evaluate('x', scope.values)).toBe('local');
    });

    test('values proxy returns undefined for missing', () => {
      let scope = new Scope();
      expect(evaluate('missing', scope.values)).toBeUndefined();
    });

    test('values proxy after push', () => {
      let scope = new Scope({ base: 'yes' });
      scope.push({ item: 'hello' });
      expect(evaluate('item', scope.values)).toBe('hello');
      expect(evaluate('base', scope.values)).toBe('yes');
    });

    test('evaluate resolves from globalParams', () => {
      let scope = new Scope({ gp: 'from-global-params' });
      expect(evaluate('gp', scope.values)).toBe('from-global-params');
    });

    test('evaluate resolves from globalVars', () => {
      let scope = new Scope();
      scope.set('gv', 'from-global-vars', { global: true });
      expect(evaluate('gv', scope.values)).toBe('from-global-vars');
    });

    test('evaluate resolves from localParams', () => {
      let scope = new Scope();
      scope.set('lp', 'from-local-params', { param: true });
      expect(evaluate('lp', scope.values)).toBe('from-local-params');
    });

    test('evaluate resolves from localVars', () => {
      let scope = new Scope();
      scope.set('lv', 'from-local-vars');
      expect(evaluate('lv', scope.values)).toBe('from-local-vars');
    });

    test('evaluate respects full precedence: localVars > localParams > globalVars > globalParams', () => {
      let scope = new Scope({ x: 'gp' });
      scope.set('x', 'gv', { global: true });
      scope.set('x', 'lp', { param: true });
      scope.set('x', 'lv');
      expect(evaluate('x', scope.values)).toBe('lv');
    });

    test('evaluate falls through layers when higher layers lack the key', () => {
      let scope = new Scope({ a: 'gp' });
      scope.set('b', 'gv', { global: true });
      scope.set('c', 'lp', { param: true });
      scope.set('d', 'lv');
      expect(evaluate('a', scope.values)).toBe('gp');
      expect(evaluate('b', scope.values)).toBe('gv');
      expect(evaluate('c', scope.values)).toBe('lp');
      expect(evaluate('d', scope.values)).toBe('lv');
    });

    test('evaluate after push sees new localParams and globalParams', () => {
      let scope = new Scope({ g: 'global-param' });
      scope.push({ p: 'pushed-param' });
      expect(evaluate('p', scope.values)).toBe('pushed-param');
      expect(evaluate('g', scope.values)).toBe('global-param');
    });

    test('evaluate after push and set sees localVar', () => {
      let scope = new Scope();
      scope.push({ p: 'param' });
      scope.set('v', 'var');
      expect(evaluate('`${p} ${v}`', scope.values)).toBe('param var');
    });

    test('evaluate after pop restores previous scope', () => {
      let scope = new Scope();
      scope.set('x', 'outer');
      scope.push({ x: 'inner-param' });
      expect(evaluate('x', scope.values)).toBe('inner-param');
      scope.pop();
      expect(evaluate('x', scope.values)).toBe('outer');
    });
  });

});
