import { test, expect } from '@playwright/test';

test.describe('DOM document creation', () => {

  async function loadDOM(page) {
    await page.goto('/test/fixtures/test-DOM.html');
    await page.waitForFunction(() => window.__ready);
  }

  test('createDocument returns an empty document with page URL', async ({ page }) => {
    await loadDOM(page);
    const result = await page.evaluate(() => {
      const doc = DOM.createDocument();
      return { nodeType: doc.nodeType, hasDocEl: !!doc.documentElement, url: doc.URL, pageURL: document.URL };
    });
    expect(result.nodeType).toBe(9);
    expect(result.hasDocEl).toBe(false);
    expect(result.url).not.toMatch(/^about:/);
    expect(result.url).toBe(result.pageURL);
  });

  test('createDocument with srcDoc uses srcDoc', async ({ page }) => {
    await loadDOM(page);
    const result = await page.evaluate(async () => {
      // get a document with a different URL via iframe
      const iframe = document.createElement('iframe');
      iframe.src = '/test/fixtures/test-DOM-other.html';
      document.body.appendChild(iframe);
      await new Promise(resolve => iframe.onload = resolve);
      const srcDoc = iframe.contentDocument;
      const doc = DOM.createDocument(srcDoc);
      const r = { nodeType: doc.nodeType, hasDocEl: !!doc.documentElement, url: doc.URL, srcURL: srcDoc.URL, pageURL: document.URL };
      iframe.remove();
      return r;
    });
    expect(result.nodeType).toBe(9);
    expect(result.hasDocEl).toBe(false);
    expect(result.url).not.toMatch(/^about:/);
    // srcDoc URL differs from page URL
    expect(result.srcURL).not.toBe(result.pageURL);
    // created doc inherits srcDoc URL, not page URL
    expect(result.url).toBe(result.srcURL);
  });

  test('createHTMLDocument returns a document with head, body, title and page URL', async ({ page }) => {
    await loadDOM(page);
    const result = await page.evaluate(() => {
      const doc = DOM.createHTMLDocument('Test');
      return { nodeType: doc.nodeType, hasHead: !!doc.head, hasBody: !!doc.body, title: doc.title, url: doc.URL, pageURL: document.URL };
    });
    expect(result.nodeType).toBe(9);
    expect(result.hasHead).toBe(true);
    expect(result.hasBody).toBe(true);
    expect(result.title).toBe('Test');
    expect(result.url).not.toMatch(/^about:/);
    expect(result.url).toBe(result.pageURL);
  });

  test('createHTMLDocument with srcDoc uses srcDoc', async ({ page }) => {
    await loadDOM(page);
    const result = await page.evaluate(async () => {
      const iframe = document.createElement('iframe');
      iframe.src = '/test/fixtures/test-DOM-other.html';
      document.body.appendChild(iframe);
      await new Promise(resolve => iframe.onload = resolve);
      const srcDoc = iframe.contentDocument;
      const doc = DOM.createHTMLDocument('child', srcDoc);
      const r = { title: doc.title, hasHead: !!doc.head, hasBody: !!doc.body, url: doc.URL, srcURL: srcDoc.URL, pageURL: document.URL };
      iframe.remove();
      return r;
    });
    expect(result.title).toBe('child');
    expect(result.hasHead).toBe(true);
    expect(result.hasBody).toBe(true);
    expect(result.url).not.toMatch(/^about:/);
    // srcDoc URL differs from page URL
    expect(result.srcURL).not.toBe(result.pageURL);
    // created doc inherits srcDoc URL, not page URL
    expect(result.url).toBe(result.srcURL);
  });

  test('cloneDocument copies structure, styles, and preserves URL', async ({ page }) => {
    await loadDOM(page);
    const result = await page.evaluate(async () => {
      const iframe = document.createElement('iframe');
      iframe.src = '/test/fixtures/test-DOM-other.html';
      document.body.appendChild(iframe);
      await new Promise(resolve => iframe.onload = resolve);
      const src = iframe.contentDocument;
      src.head.innerHTML += '<style>.x { color: red; }</style>';
      src.body.innerHTML = '<p>hello</p>';
      src.title = 'Clone';
      const clone = DOM.cloneDocument(src);
      const style = clone.querySelector('style');
      const r = {
        nodeType: clone.nodeType, notSame: clone !== src,
        title: clone.title, text: clone.body.querySelector('p').textContent,
        hasStyle: !!style, styleContent: style ? style.textContent : '',
        url: clone.URL, srcURL: src.URL, pageURL: document.URL
      };
      iframe.remove();
      return r;
    });
    // returns a new document
    expect(result.nodeType).toBe(9);
    expect(result.notSame).toBe(true);
    // preserves URL from source, not page
    expect(result.url).not.toMatch(/^about:/);
    expect(result.srcURL).not.toBe(result.pageURL);
    expect(result.url).toBe(result.srcURL);
    // copies title and body content
    expect(result.title).toBe('Clone');
    expect(result.text).toBe('hello');
    // copies styles
    expect(result.hasStyle).toBe(true);
    expect(result.styleContent).toContain('.x');
  });

});
