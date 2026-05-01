import { describe, test, expect } from 'vitest';
import URLux from '../src/Meeko/URLux.mjs';

describe('URLux.mjs', () => {

  test('parses a full URL', () => {
    const url = URLux.create('http://example.com:8080/path/to/page?q=1#hash');
    expect(url.protocol).toBe('http:');
    expect(url.hostname).toBe('example.com');
    expect(url.port).toBe('8080');
    expect(url.pathname).toBe('/path/to/page');
    expect(url.search).toBe('?q=1');
    expect(url.hash).toBe('#hash');
  });

  test('computes derived properties', () => {
    const url = URLux.create('http://example.com/dir/file.html');
    expect(url.origin).toBe('http://example.com');
    expect(url.basepath).toBe('/dir/');
    expect(url.base).toBe('http://example.com/dir/');
    expect(url.filename).toBe('file.html');
    expect(url.nosearch).toBe('http://example.com/dir/file.html');
    expect(url.href).toBe('http://example.com/dir/file.html');
  });

  test('toString returns href', () => {
    const url = URLux.create('http://example.com/page');
    expect(url.toString()).toBe('http://example.com/page');
  });

  test('defaults pathname to /', () => {
    const url = URLux.create('http://example.com');
    expect(url.pathname).toBe('/');
  });

  test('lowercases protocol and hostname', () => {
    const url = URLux.create('HTTP://EXAMPLE.COM/Path');
    expect(url.protocol).toBe('http:');
    expect(url.hostname).toBe('example.com');
    expect(url.pathname).toBe('/Path');
  });

  // --- resolve ---

  test('resolve absolute URL returns it unchanged', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    expect(base.resolve('http://other.com/x')).toBe('http://other.com/x');
  });

  test('resolve protocol-relative URL', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    expect(base.resolve('//other.com/x')).toBe('http://other.com/x');
  });

  test('resolve root-relative URL', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    expect(base.resolve('/other/page')).toBe('http://example.com/other/page');
  });

  test('resolve query-only URL', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    expect(base.resolve('?q=2')).toBe('http://example.com/dir/page.html?q=2');
  });

  test('resolve hash-only URL', () => {
    const base = URLux.create('http://example.com/dir/page.html?q=1');
    expect(base.resolve('#top')).toBe('http://example.com/dir/page.html?q=1#top');
  });

  test('resolve relative URL', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    expect(base.resolve('other.html')).toBe('http://example.com/dir/other.html');
  });

  test('resolve ./ relative URL', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    expect(base.resolve('./other.html')).toBe('http://example.com/dir/other.html');
  });

  test('resolve ../ relative URL', () => {
    const base = URLux.create('http://example.com/a/b/page.html');
    expect(base.resolve('../other.html')).toBe('http://example.com/a/other.html');
  });

  test('resolve multiple ../ levels', () => {
    const base = URLux.create('http://example.com/a/b/c/page.html');
    expect(base.resolve('../../other.html')).toBe('http://example.com/a/other.html');
  });

  // --- constructor with base ---

  test('constructs with base URL', () => {
    const url = URLux.create('other.html', 'http://example.com/dir/page.html');
    expect(url.href).toBe('http://example.com/dir/other.html');
  });

  // --- urlAttributes ---

  test('URLux.attributes contains img srcset descriptor', () => {
    expect(URLux.attributes['img']).toBeDefined();
    expect(URLux.attributes['img']['srcset']).toBeDefined();
  });

  test('srcset resolveURL resolves each URL in set', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    const desc = URLux.attributes['img']['srcset'];
    const result = desc.resolveURL('small.jpg 1x, large.jpg 2x', base);
    expect(result).toContain('http://example.com/dir/small.jpg 1x');
    expect(result).toContain('http://example.com/dir/large.jpg 2x');
  });

  test('ping resolveURL resolves space-separated URLs', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    const desc = URLux.attributes['a']['ping'];
    const result = desc.resolveURL('/track1 /track2', base);
    expect(result).toContain('http://example.com/track1');
    expect(result).toContain('http://example.com/track2');
  });

  test('AttributeDescriptor resolve updates element attribute', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    const el = document.createElement('a');
    el.setAttribute('href', 'other.html');
    URLux.attributes['a']['href'].resolve(el, base);
    expect(el.getAttribute('href')).toBe('http://example.com/dir/other.html');
  });

  test('source srcset resolveURL resolves each URL in set', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    const desc = URLux.attributes['source']['srcset'];
    const result = desc.resolveURL('sm.jpg 100w, lg.jpg 200w', base);
    expect(result).toContain('http://example.com/dir/sm.jpg 100w');
    expect(result).toContain('http://example.com/dir/lg.jpg 200w');
  });

  test('resolve skips element when attribute is absent', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    const el = document.createElement('a');
    // no href set
    URLux.attributes['a']['href'].resolve(el, base);
    expect(el.getAttribute('href')).toBeNull();
  });

  test('resolveURL returns empty string unchanged', () => {
    const base = URLux.create('http://example.com/dir/page.html');
    const desc = URLux.attributes['a']['href'];
    expect(desc.resolveURL('', base)).toBe('');
  });

  test('loads flag is true for download-triggering attributes', () => {
    expect(URLux.attributes['script']['src'].loads).toBe(true);
    expect(URLux.attributes['img']['src'].loads).toBe(true);
    expect(URLux.attributes['iframe']['src'].loads).toBe(true);
  });

  test('loads flag is false for non-downloading attributes', () => {
    expect(URLux.attributes['a']['href'].loads).toBe(false);
    expect(URLux.attributes['form']['action'].loads).toBe(false);
  });

  test('compound flag is true for multi-URL attributes', () => {
    expect(URLux.attributes['img']['srcset'].compound).toBe(true);
    expect(URLux.attributes['source']['srcset'].compound).toBe(true);
    expect(URLux.attributes['a']['ping'].compound).toBe(true);
  });

  test('compound flag is false for single-URL attributes', () => {
    expect(URLux.attributes['a']['href'].compound).toBe(false);
    expect(URLux.attributes['script']['src'].compound).toBe(false);
  });

  describe('URLux.attributes registry completeness', () => {
    const expected = {
      link:       { href: { loads: true, compound: false } },
      script:     { src: { loads: true, compound: false } },
      img:        { longDesc: { loads: true, compound: false }, src: { loads: true, compound: false }, srcset: { loads: false, compound: true } },
      iframe:     { longDesc: { loads: true, compound: false }, src: { loads: true, compound: false } },
      object:     { data: { loads: true, compound: false } },
      embed:      { src: { loads: true, compound: false } },
      video:      { poster: { loads: true, compound: false }, src: { loads: true, compound: false } },
      audio:      { src: { loads: true, compound: false } },
      source:     { src: { loads: true, compound: false }, srcset: { loads: false, compound: true } },
      input:      { formAction: { loads: false, compound: false }, src: { loads: true, compound: false } },
      button:     { formAction: { loads: false, compound: false }, src: { loads: true, compound: false } },
      a:          { ping: { loads: false, compound: true }, href: { loads: false, compound: false } },
      area:       { href: { loads: false, compound: false } },
      q:          { cite: { loads: false, compound: false } },
      blockquote: { cite: { loads: false, compound: false } },
      ins:        { cite: { loads: false, compound: false } },
      del:        { cite: { loads: false, compound: false } },
      form:       { action: { loads: false, compound: false } },
    };

    for (const [tag, attrs] of Object.entries(expected)) {
      for (const [attr, flags] of Object.entries(attrs)) {
        test(`${tag}@${attr} exists with loads=${flags.loads}, compound=${flags.compound}`, () => {
          const desc = URLux.attributes[tag]?.[attr];
          expect(desc).toBeDefined();
          expect(desc.loads).toBe(flags.loads);
          expect(desc.compound).toBe(flags.compound);
        });
      }
    }
  });

});
