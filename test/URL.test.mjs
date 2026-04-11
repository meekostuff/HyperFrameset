import { describe, test, expect } from 'vitest';
import URL from '../src/Meeko/URL.mjs';

describe('URL.mjs', () => {

  test('parses a full URL', () => {
    const url = URL('http://example.com:8080/path/to/page?q=1#hash');
    expect(url.protocol).toBe('http:');
    expect(url.hostname).toBe('example.com');
    expect(url.port).toBe('8080');
    expect(url.pathname).toBe('/path/to/page');
    expect(url.search).toBe('?q=1');
    expect(url.hash).toBe('#hash');
  });

  test('computes derived properties', () => {
    const url = URL('http://example.com/dir/file.html');
    expect(url.origin).toBe('http://example.com');
    expect(url.basepath).toBe('/dir/');
    expect(url.base).toBe('http://example.com/dir/');
    expect(url.filename).toBe('file.html');
    expect(url.nosearch).toBe('http://example.com/dir/file.html');
    expect(url.href).toBe('http://example.com/dir/file.html');
  });

  test('toString returns href', () => {
    const url = URL('http://example.com/page');
    expect(url.toString()).toBe('http://example.com/page');
  });

  test('defaults pathname to /', () => {
    const url = URL('http://example.com');
    expect(url.pathname).toBe('/');
  });

  test('lowercases protocol and hostname', () => {
    const url = URL('HTTP://EXAMPLE.COM/Path');
    expect(url.protocol).toBe('http:');
    expect(url.hostname).toBe('example.com');
    expect(url.pathname).toBe('/Path');
  });

  // --- resolve ---

  test('resolve absolute URL returns it unchanged', () => {
    const base = URL('http://example.com/dir/page.html');
    expect(base.resolve('http://other.com/x')).toBe('http://other.com/x');
  });

  test('resolve protocol-relative URL', () => {
    const base = URL('http://example.com/dir/page.html');
    expect(base.resolve('//other.com/x')).toBe('http://other.com/x');
  });

  test('resolve root-relative URL', () => {
    const base = URL('http://example.com/dir/page.html');
    expect(base.resolve('/other/page')).toBe('http://example.com/other/page');
  });

  test('resolve query-only URL', () => {
    const base = URL('http://example.com/dir/page.html');
    expect(base.resolve('?q=2')).toBe('http://example.com/dir/page.html?q=2');
  });

  test('resolve hash-only URL', () => {
    const base = URL('http://example.com/dir/page.html?q=1');
    expect(base.resolve('#top')).toBe('http://example.com/dir/page.html?q=1#top');
  });

  test('resolve relative URL', () => {
    const base = URL('http://example.com/dir/page.html');
    expect(base.resolve('other.html')).toBe('http://example.com/dir/other.html');
  });

  test('resolve ./ relative URL', () => {
    const base = URL('http://example.com/dir/page.html');
    expect(base.resolve('./other.html')).toBe('http://example.com/dir/other.html');
  });

  test('resolve ../ relative URL', () => {
    const base = URL('http://example.com/a/b/page.html');
    expect(base.resolve('../other.html')).toBe('http://example.com/a/other.html');
  });

  test('resolve multiple ../ levels', () => {
    const base = URL('http://example.com/a/b/c/page.html');
    expect(base.resolve('../../other.html')).toBe('http://example.com/a/other.html');
  });

  // --- constructor with base ---

  test('constructs with base URL', () => {
    const url = URL('other.html', 'http://example.com/dir/page.html');
    expect(url.href).toBe('http://example.com/dir/other.html');
  });

  // --- urlAttributes ---

  test('URL.attributes contains img srcset descriptor', () => {
    expect(URL.attributes['img']).toBeDefined();
    expect(URL.attributes['img']['srcset']).toBeDefined();
  });

  test('srcset resolveURL resolves each URL in set', () => {
    const base = URL('http://example.com/dir/page.html');
    const desc = URL.attributes['img']['srcset'];
    const result = desc.resolveURL('small.jpg 1x, large.jpg 2x', base);
    expect(result).toContain('http://example.com/dir/small.jpg 1x');
    expect(result).toContain('http://example.com/dir/large.jpg 2x');
  });

  test('ping resolveURL resolves space-separated URLs', () => {
    const base = URL('http://example.com/dir/page.html');
    const desc = URL.attributes['a']['ping'];
    const result = desc.resolveURL('/track1 /track2', base);
    expect(result).toContain('http://example.com/track1');
    expect(result).toContain('http://example.com/track2');
  });

  test('AttributeDescriptor resolve updates element attribute', () => {
    const base = URL('http://example.com/dir/page.html');
    const el = document.createElement('a');
    el.setAttribute('href', 'other.html');
    URL.attributes['a']['href'].resolve(el, base);
    expect(el.getAttribute('href')).toBe('http://example.com/dir/other.html');
  });

});
