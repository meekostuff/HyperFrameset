import { describe, test, expect, beforeEach } from 'vitest';

describe('CSSDecoder', () => {
  let decoder;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/CSSDecoder.mjs');
    decoder = new mod.default();
  });

  test('init accepts a DOM node', () => {
    const div = document.createElement('div');
    expect(() => decoder.init(div)).not.toThrow();
  });

  test('evaluate empty selector returns context', () => {
    const div = document.createElement('div');
    decoder.init(div);
    expect(decoder.evaluate('', div)).toBe(div);
  });

  test('evaluate finds child element', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span class="target">hello</span>';
    decoder.init(div);
    const result = decoder.evaluate('span.target', div);
    expect(result.textContent).toBe('hello');
  });

  test('evaluate with attribute accessor {_text}', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>content</p>';
    decoder.init(div);
    expect(decoder.evaluate('p { _text }', div)).toBe('content');
  });

  test('evaluate with @attribute accessor', () => {
    const div = document.createElement('div');
    div.innerHTML = '<a href="/link">text</a>';
    decoder.init(div);
    expect(decoder.evaluate('a { @href }', div)).toBe('/link');
  });

  test('evaluate with wantArray returns all matches', () => {
    const div = document.createElement('div');
    div.innerHTML = '<li>a</li><li>b</li><li>c</li>';
    decoder.init(div);
    const results = decoder.evaluate('li', div, null, true);
    expect(results).toHaveLength(3);
  });

  test('evaluate with wantArray and attribute', () => {
    const div = document.createElement('div');
    div.innerHTML = '<li>a</li><li>b</li>';
    decoder.init(div);
    const results = decoder.evaluate('li { _text }', div, null, true);
    expect(results).toEqual(['a', 'b']);
  });

  test('matches returns result for matching element', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span class="x">hi</span>';
    decoder.init(div);
    const span = div.querySelector('span');
    expect(decoder.matches(span, 'span.x')).toBeTruthy();
  });

  test('matches returns undefined for non-matching element', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>hi</span>';
    decoder.init(div);
    const span = div.querySelector('span');
    expect(decoder.matches(span, 'div')).toBeUndefined();
  });

  test('evaluate with > child combinator', () => {
    const div = document.createElement('div');
    div.innerHTML = '<ul><li>direct</li></ul>';
    decoder.init(div);
    const result = decoder.evaluate('> ul > li', div);
    expect(result.textContent).toBe('direct');
  });

  test('evaluate with {_html} returns DocumentFragment', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p><em>rich</em> content</p>';
    decoder.init(div);
    const result = decoder.evaluate('p { _html }', div);
    expect(result.nodeType).toBe(11); // DocumentFragment
    expect(result.querySelector('em').textContent).toBe('rich');
  });

});
