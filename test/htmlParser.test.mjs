import { describe, test, expect, beforeEach } from 'vitest';

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('htmlParser.mjs', () => {
  let htmlParser;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/htmlParser.mjs');
    htmlParser = mod.default;
  });

  test('parse returns a thenable', () => {
    const html = '<!DOCTYPE html><html><head><title>Test</title></head><body><p>Hello</p></body></html>';
    const result = htmlParser.parse(html, { url: 'http://example.com/page.html' });
    expect(typeof result.then).toBe('function');
  });

  test('parse produces a document with body content', async () => {
    const html = '<!DOCTYPE html><html><head><title>Test</title></head><body><p>Hello</p></body></html>';
    let doc;
    htmlParser.parse(html, { url: 'http://example.com/page.html' })
      .then(d => { doc = d; });

    await timeout(200);
    expect(doc).toBeDefined();
    expect(doc.querySelector('p').textContent).toBe('Hello');
  });

  test('parse resolves relative URLs in href attributes', async () => {
    const html = '<!DOCTYPE html><html><head></head><body><a href="other.html">link</a></body></html>';
    let doc;
    htmlParser.parse(html, { url: 'http://example.com/dir/page.html' })
      .then(d => { doc = d; });

    await timeout(200);
    expect(doc.querySelector('a').getAttribute('href')).toBe('http://example.com/dir/other.html');
  });

  test('parse resolves relative URLs in src attributes', async () => {
    const html = '<!DOCTYPE html><html><head></head><body><img src="img.png"></body></html>';
    let doc;
    htmlParser.parse(html, { url: 'http://example.com/dir/page.html' })
      .then(d => { doc = d; });

    await timeout(200);
    expect(doc.querySelector('img').getAttribute('src')).toBe('http://example.com/dir/img.png');
  });

  test('parse moves body styles to head', async () => {
    const html = '<!DOCTYPE html><html><head></head><body><style>.x { color: red; }</style><p>Hi</p></body></html>';
    let doc;
    htmlParser.parse(html, { url: 'http://example.com/page.html' })
      .then(d => { doc = d; });

    await timeout(200);
    expect(doc.head.querySelectorAll('style').length).toBeGreaterThan(0);
    expect(doc.body.querySelectorAll('style').length).toBe(0);
  });

  test('normalize resolves URLs in a document', async () => {
    const doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body><a href="page.html">link</a></body></html>',
      'text/html'
    );
    let result;
    htmlParser.normalize(doc, { url: 'http://example.com/dir/index.html' })
      .then(d => { result = d; });

    await timeout(200);
    expect(result.querySelector('a').getAttribute('href')).toBe('http://example.com/dir/page.html');
  });

  test('normalize rewrites URLs in style elements', async () => {
    const doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head><style>.bg { background: url("img.png"); }</style></head><body></body></html>',
      'text/html'
    );
    let result;
    htmlParser.normalize(doc, { url: 'http://example.com/dir/page.html' })
      .then(d => { result = d; });

    await timeout(200);
    const style = result.querySelector('style').textContent;
    expect(style).toContain('http://example.com/dir/img.png');
  });

});
