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

describe('rebaseURL', () => {
  let rebaseURL, URL;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/htmlParser.mjs');
    rebaseURL = mod.default.rebaseURL;
    const urlMod = await import('../src/Meeko/URL.mjs');
    URL = urlMod.default;
  });

  test('returns url unchanged when no scope: prefix', () => {
    let base = URL('http://example.com/app/');
    expect(rebaseURL('page.html', base)).toBe('page.html');
  });

  test('strips scope: prefix and resolves against base', () => {
    let base = URL('http://example.com/app/');
    expect(rebaseURL('scope:page.html', base)).toBe('http://example.com/app/page.html');
  });

  test('handles scope: with relative path', () => {
    let base = URL('http://example.com/app/sub/');
    expect(rebaseURL('scope:../index.html', base)).toBe('http://example.com/app/index.html');
  });

  test('handles scope: with absolute path', () => {
    let base = URL('http://example.com/app/');
    expect(rebaseURL('scope:/root.html', base)).toBe('http://example.com/root.html');
  });

  test('is case-insensitive for scope: prefix', () => {
    let base = URL('http://example.com/app/');
    expect(rebaseURL('Scope:page.html', base)).toBe('http://example.com/app/page.html');
    expect(rebaseURL('SCOPE:page.html', base)).toBe('http://example.com/app/page.html');
  });

  test('returns absolute URLs unchanged', () => {
    let base = URL('http://example.com/app/');
    expect(rebaseURL('http://other.com/page.html', base)).toBe('http://other.com/page.html');
  });

  test('returns empty string unchanged', () => {
    let base = URL('http://example.com/app/');
    expect(rebaseURL('', base)).toBe('');
  });

  test('handles scope: with ./ prefix', () => {
    let base = URL('http://example.com/app/');
    expect(rebaseURL('scope:./page.html', base)).toBe('http://example.com/app/page.html');
  });
});

describe('rebase', () => {
  let rebase, URL;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/htmlParser.mjs');
    rebase = mod.default.rebase;
    const urlMod = await import('../src/Meeko/URL.mjs');
    URL = urlMod.default;
  });

  test('rewrites scope: href attributes', () => {
    let doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body><a href="scope:page.html">link</a></body></html>',
      'text/html'
    );
    let scopeURL = URL('http://example.com/app/');
    rebase(doc, scopeURL);
    expect(doc.querySelector('a').getAttribute('href')).toBe('http://example.com/app/page.html');
  });

  test('leaves non-scope URLs unchanged', () => {
    let doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body><a href="page.html">link</a></body></html>',
      'text/html'
    );
    let scopeURL = URL('http://example.com/app/');
    rebase(doc, scopeURL);
    expect(doc.querySelector('a').getAttribute('href')).toBe('page.html');
  });

  test('rewrites scope: src attributes', () => {
    let doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body><img src="scope:img.png"></body></html>',
      'text/html'
    );
    let scopeURL = URL('http://example.com/app/');
    rebase(doc, scopeURL);
    expect(doc.querySelector('img').getAttribute('src')).toBe('http://example.com/app/img.png');
  });

  test('rewrites multiple elements', () => {
    let doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body>' +
      '<a href="scope:a.html">A</a>' +
      '<a href="scope:b.html">B</a>' +
      '</body></html>',
      'text/html'
    );
    let scopeURL = URL('http://example.com/');
    rebase(doc, scopeURL);
    let links = doc.querySelectorAll('a');
    expect(links[0].getAttribute('href')).toBe('http://example.com/a.html');
    expect(links[1].getAttribute('href')).toBe('http://example.com/b.html');
  });

  test('handles document with no URL attributes', () => {
    let doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body><p>no links</p></body></html>',
      'text/html'
    );
    let scopeURL = URL('http://example.com/');
    rebase(doc, scopeURL); // should not throw
    expect(doc.querySelector('p').textContent).toBe('no links');
  });
});

describe('normalizeScopedStyles', () => {
  let normalizeScopedStyles;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/htmlParser.mjs');
    normalizeScopedStyles = mod.default.normalizeScopedStyles;
  });

  function makeDoc(bodyHTML) {
    return (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body>' + bodyHTML + '</body></html>',
      'text/html'
    );
  }

  test('moves scoped style to head with prefixed selectors', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.foo { color: red; }</style><p>content</p></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    // style should be in head now
    expect(doc.head.querySelectorAll('style').length).toBe(1);
    expect(doc.body.querySelectorAll('style').length).toBe(0);
    // selector should be prefixed with scope id
    let cssText = doc.head.querySelector('style').textContent;
    expect(cssText).toContain('#');
    expect(cssText).toContain('.foo');
  });

  test('sets scopeid attribute on scope element', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.x { color: blue; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    let scope = doc.body.querySelector('.allowed');
    expect(scope.hasAttribute('scopeid')).toBe(true);
  });

  test('preserves existing id on scope element', () => {
    let doc = makeDoc(
      '<div class="allowed" id="myid"><style scoped>.x { color: blue; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    let scope = doc.body.querySelector('.allowed');
    expect(scope.getAttribute('id')).toBe('myid');
    // scopeid is set but id stays as original
    expect(scope.hasAttribute('scopeid')).toBe(true);
  });

  test('assigns id from scopeid when no existing id', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.x { color: blue; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    let scope = doc.body.querySelector('.allowed');
    let scopeId = scope.getAttribute('scopeid');
    expect(scope.getAttribute('id')).toBe(scopeId);
  });

  test('removes scoped attribute from style element', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.x { color: red; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    let style = doc.head.querySelector('style');
    expect(style.hasAttribute('scoped')).toBe(false);
  });

  test('removes style from disallowed parent', () => {
    let doc = makeDoc(
      '<div class="notallowed"><style scoped>.x { color: red; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    expect(doc.querySelectorAll('style').length).toBe(0);
  });

  test('handles multiple scoped styles', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.a { color: red; }</style></div>' +
      '<div class="allowed"><style scoped>.b { color: blue; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    expect(doc.head.querySelectorAll('style').length).toBe(2);
    let scopes = doc.body.querySelectorAll('.allowed');
    // each should have a different scopeid
    expect(scopes[0].getAttribute('scopeid')).not.toBe(scopes[1].getAttribute('scopeid'));
  });

  test('prefixes comma-separated selectors', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.a, .b { color: red; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    let cssText = doc.head.querySelector('style').textContent;
    let scopeId = doc.body.querySelector('.allowed').getAttribute('scopeid');
    // both selectors should be prefixed
    let prefix = '#' + scopeId;
    let prefixCount = (cssText.match(new RegExp('#' + scopeId, 'g')) || []).length;
    expect(prefixCount).toBeGreaterThanOrEqual(2);
  });

  test('does nothing when no scoped styles exist', () => {
    let doc = makeDoc('<div class="allowed"><p>no styles</p></div>');
    normalizeScopedStyles(doc, '.allowed');
    expect(doc.head.querySelectorAll('style').length).toBe(0);
  });
});
