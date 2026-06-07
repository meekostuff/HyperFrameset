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
  let rebaseURL, URLux;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/htmlParser.mjs');
    rebaseURL = mod.default.rebaseURL;
    const urlMod = await import('../src/Meeko/URLux.mjs');
    URLux = urlMod.default;
  });

  test('returns url unchanged when no scope: prefix', () => {
    let base = URLux.create('http://example.com/app/');
    expect(rebaseURL('page.html', base)).toBe('page.html');
  });

  test('strips scope: prefix and resolves against base', () => {
    let base = URLux.create('http://example.com/app/');
    expect(rebaseURL('scope:page.html', base)).toBe('http://example.com/app/page.html');
  });

  test('handles scope: with relative path', () => {
    let base = URLux.create('http://example.com/app/sub/');
    expect(rebaseURL('scope:../index.html', base)).toBe('http://example.com/app/index.html');
  });

  test('handles scope: with absolute path', () => {
    let base = URLux.create('http://example.com/app/');
    expect(rebaseURL('scope:/root.html', base)).toBe('http://example.com/root.html');
  });

  test('is case-insensitive for scope: prefix', () => {
    let base = URLux.create('http://example.com/app/');
    expect(rebaseURL('Scope:page.html', base)).toBe('http://example.com/app/page.html');
    expect(rebaseURL('SCOPE:page.html', base)).toBe('http://example.com/app/page.html');
  });

  test('returns absolute URLs unchanged', () => {
    let base = URLux.create('http://example.com/app/');
    expect(rebaseURL('http://other.com/page.html', base)).toBe('http://other.com/page.html');
  });

  test('returns empty string unchanged', () => {
    let base = URLux.create('http://example.com/app/');
    expect(rebaseURL('', base)).toBe('');
  });

  test('handles scope: with ./ prefix', () => {
    let base = URLux.create('http://example.com/app/');
    expect(rebaseURL('scope:./page.html', base)).toBe('http://example.com/app/page.html');
  });
});

describe('rebase', () => {
  let rebase, URLux;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/htmlParser.mjs');
    rebase = mod.default.rebase;
    const urlMod = await import('../src/Meeko/URLux.mjs');
    URLux = urlMod.default;
  });

  test('rewrites scope: href attributes', () => {
    let doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body><a href="scope:page.html">link</a></body></html>',
      'text/html'
    );
    let scopeURL = URLux.create('http://example.com/app/');
    rebase(doc, scopeURL);
    expect(doc.querySelector('a').getAttribute('href')).toBe('http://example.com/app/page.html');
  });

  test('leaves non-scope URLs unchanged', () => {
    let doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body><a href="page.html">link</a></body></html>',
      'text/html'
    );
    let scopeURL = URLux.create('http://example.com/app/');
    rebase(doc, scopeURL);
    expect(doc.querySelector('a').getAttribute('href')).toBe('page.html');
  });

  test('rewrites scope: src attributes', () => {
    let doc = (new DOMParser).parseFromString(
      '<!DOCTYPE html><html><head></head><body><img src="scope:img.png"></body></html>',
      'text/html'
    );
    let scopeURL = URLux.create('http://example.com/app/');
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
    let scopeURL = URLux.create('http://example.com/');
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
    let scopeURL = URLux.create('http://example.com/');
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
      `<!DOCTYPE html><html><head></head><body>${bodyHTML}</body></html>`,
      'text/html'
    );
  }

  test('moves scoped style to head with @scope wrapper', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.foo { color: red; }</style><p>content</p></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    // style should be in head now
    expect(doc.head.querySelectorAll('style').length).toBe(1);
    expect(doc.body.querySelectorAll('style').length).toBe(0);
    // should be wrapped in @scope with scopeid attribute selector
    let cssText = doc.head.querySelector('style').textContent;
    expect(cssText).toContain('@scope');
    expect(cssText).toContain('scopeid');
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

  test('does not set id on scope element', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.x { color: blue; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    let scope = doc.body.querySelector('.allowed');
    expect(scope.hasAttribute('id')).toBe(false);
  });

  test('preserves existing id on scope element', () => {
    let doc = makeDoc(
      '<div class="allowed" id="myid"><style scoped>.x { color: blue; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    let scope = doc.body.querySelector('.allowed');
    expect(scope.getAttribute('id')).toBe('myid');
    expect(scope.hasAttribute('scopeid')).toBe(true);
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

  test('wraps comma-separated selectors in @scope', () => {
    let doc = makeDoc(
      '<div class="allowed"><style scoped>.a, .b { color: red; }</style></div>'
    );
    normalizeScopedStyles(doc, '.allowed');
    let cssText = doc.head.querySelector('style').textContent;
    let scopeId = doc.body.querySelector('.allowed').getAttribute('scopeid');
    expect(cssText).toContain(`@scope ([scopeid="${scopeId}"])`);
    expect(cssText).toContain('.a, .b');
  });

  test('does nothing when no scoped styles exist', () => {
    let doc = makeDoc('<div class="allowed"><p>no styles</p></div>');
    normalizeScopedStyles(doc, '.allowed');
    expect(doc.head.querySelectorAll('style').length).toBe(0);
  });
});

describe('browser assumptions: style.sheet in parsed documents', () => {

  const testHTML = '<!DOCTYPE html><html><head></head><body><div><style>.x { color: red; }</style></div></body></html>';

  /**
   * Detect whether the browser fails to instantiate .sheet on style elements
   * dynamically added to DOMParser-produced documents. Returns true if workaround is needed.
   */
  function DOMPARSER_STYLE_NEEDS_DUMMY_DOC() {
    let doc = (new DOMParser).parseFromString(testHTML, 'text/html');
    let style = doc.createElement('style');
    style.textContent = '.dynamic { color: green; }';
    doc.head.appendChild(style);
    return !style.sheet;
  }

  /**
   * Detect whether the browser fails to instantiate .sheet on style elements
   * dynamically added to XHR-fetched documents. Returns a promise resolving to
   * true if workaround is needed.
   */
  function XHR_STYLE_NEEDS_DUMMY_DOC() {
    return new Promise(function(resolve, reject) {
      let blob = new Blob([testHTML], { type: 'text/html' });
      let url = URL.createObjectURL(blob);
      let xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'document';
      xhr.onload = function() {
        URL.revokeObjectURL(url);
        let doc = xhr.responseXML;
        // Test a style element dynamically created and appended to the XHR document
        let style = doc.createElement('style');
        style.textContent = '.dynamic { color: green; }';
        doc.head.appendChild(style);
        resolve(!style.sheet);
      };
      xhr.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('XHR failed'));
      };
      xhr.send();
    });
  }

  /**
   * The dummy document workaround: create a style element in a separate document
   * to force the browser to instantiate a stylesheet.
   */
  function dummyDocWorkaround(cssText) {
    let dummyDoc = document.implementation.createHTMLDocument('');
    let dummyEl = dummyDoc.createElement('style');
    dummyEl.textContent = cssText;
    dummyDoc.head.appendChild(dummyEl);
    return dummyEl.sheet;
  }

  test('style.sheet is available in DOMParser documents (no dummy doc needed)', () => {
    expect(DOMPARSER_STYLE_NEEDS_DUMMY_DOC()).toBe(false);
  });

  test('style.sheet is available in XHR-fetched documents (no dummy doc needed)', async () => {
    let needsDummy = await XHR_STYLE_NEEDS_DUMMY_DOC();
    expect(needsDummy).toBe(false);
  });

  test('dummy document workaround produces a valid stylesheet', () => {
    let sheet = dummyDocWorkaround('.test { color: red; }');
    expect(sheet).not.toBeNull();
    expect(sheet.cssRules.length).toBe(1);
  });
});

describe('browser assumptions: CSS @scope', () => {

  test('@scope is supported', () => {
    expect(CSS.supports('selector(:scope)')).toBe(true);
  });

  test('@scope rule scopes styles to a subtree', () => {
    let doc = document.implementation.createHTMLDocument('');
    let style = doc.createElement('style');
    style.textContent = '@scope (#target) { .inner { color: red; } }';
    doc.head.appendChild(style);
    let sheet = style.sheet;
    expect(sheet.cssRules.length).toBe(1);
    expect(sheet.cssRules[0].cssText).toContain('@scope');
  });

});
