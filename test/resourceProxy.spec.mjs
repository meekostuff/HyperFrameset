import { test, expect } from '@playwright/test';

async function setup(page) {
  await page.goto('/test/fixtures/test-resourceProxy.html');
  await page.waitForFunction(() => window.__ready);
}

test.describe('browser assumptions', () => {

  test('XMLHttpRequest supports responseType document', async ({ page }) => {
    await setup(page);
    const supported = await page.evaluate(() => {
      let xhr = new XMLHttpRequest();
      xhr.open('get', document.URL, true);
      try { xhr.responseType = 'document'; } catch (e) { return false; }
      return xhr.responseType === 'document';
    });
    expect(supported).toBe(true);
  });

});

test.describe('ResourceProxy - document loading', () => {

  test('load fetches and parses a document', async ({ page }) => {
    await page.route('http://mock.test/page.html', route => {
      route.fulfill({
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><head></head><body><p>hello from mock</p></body></html>',
      });
    });
    await setup(page);

    const text = await page.evaluate(() => {
      return window.resourceProxy.load('http://mock.test/page.html')
        .then(response => response.body.querySelector('p').textContent);
    });
    expect(text).toBe('hello from mock');
  });

  test('load returns cached response on second call', async ({ page }) => {
    let fetchCount = 0;
    await page.route('http://mock.test/cached.html', route => {
      fetchCount++;
      route.fulfill({
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><head></head><body><p>cached</p></body></html>',
      });
    });
    await setup(page);

    await page.evaluate(() => {
      return window.resourceProxy.load('http://mock.test/cached.html');
    });

    const text = await page.evaluate(() => {
      return window.resourceProxy.load('http://mock.test/cached.html')
        .then(response => response.body.querySelector('p').textContent);
    });
    expect(text).toBe('cached');
    expect(fetchCount).toBe(1);
  });

  test('load resolves relative URLs in fetched document', async ({ page }) => {
    await page.route('http://mock.test/dir/page.html', route => {
      route.fulfill({
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><head></head><body><a href="other.html">link</a></body></html>',
      });
    });
    await setup(page);

    const href = await page.evaluate(() => {
      return window.resourceProxy.load('http://mock.test/dir/page.html')
        .then(response => response.body.querySelector('a').getAttribute('href'));
    });
    expect(href).toBe('http://mock.test/dir/other.html');
  });

  test('load rejects for non-200 status', async ({ page }) => {
    await page.route('http://mock.test/notfound.html', route => {
      route.fulfill({ status: 404, body: 'Not Found' });
    });
    await setup(page);

    const error = await page.evaluate(() => {
      return window.resourceProxy.load('http://mock.test/notfound.html')
        .then(() => null)
        .catch(e => 'rejected');
    });
    expect(error).toBe('rejected');
  });

  test('concurrent loads of the same URL share one network request', async ({ page }) => {
    let fetchCount = 0;
    await page.route('http://mock.test/concurrent.html', route => {
      fetchCount++;
      route.fulfill({
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><head></head><body><p>concurrent</p></body></html>',
      });
    });
    await setup(page);

    const results = await page.evaluate(() => {
      let p1 = window.resourceProxy.load('http://mock.test/concurrent.html');
      let p2 = window.resourceProxy.load('http://mock.test/concurrent.html');
      return Promise.all([p1, p2]).then(([r1, r2]) => ({
        text1: r1.body.querySelector('p').textContent,
        text2: r2.body.querySelector('p').textContent,
      }));
    });
    expect(results.text1).toBe('concurrent');
    expect(results.text2).toBe('concurrent');
    expect(fetchCount).toBe(1);
  });

});

test.describe('ResourceProxy - JSON loading', () => {

  test('load fetches and parses JSON', async ({ page }) => {
    await page.route('http://mock.test/data.json', route => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ name: 'Alice', count: 3 }),
      });
    });
    await setup(page);

    const data = await page.evaluate(() => {
      return window.resourceProxy.load('http://mock.test/data.json', { responseType: 'json' })
        .then(response => response.body);
    });
    expect(data).toEqual({ name: 'Alice', count: 3 });
  });

  test('JSON responses are deep-cloned from cache', async ({ page }) => {
    await page.route('http://mock.test/clone.json', route => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ items: [1, 2, 3] }),
      });
    });
    await setup(page);

    const results = await page.evaluate(() => {
      return window.resourceProxy.load('http://mock.test/clone.json', { responseType: 'json' })
        .then(r1 => {
          r1.body.items.push(99); // mutate first response
          return window.resourceProxy.load('http://mock.test/clone.json', { responseType: 'json' });
        })
        .then(r2 => r2.body.items);
    });
    // Cached copy should not include the mutation
    expect(results).toEqual([1, 2, 3]);
  });

});

test.describe('ResourceProxy - text loading', () => {

  test('load fetches text', async ({ page }) => {
    await page.route('http://mock.test/data.txt', route => {
      route.fulfill({
        contentType: 'text/plain',
        body: 'hello world',
      });
    });
    await setup(page);

    const text = await page.evaluate(() => {
      return window.resourceProxy.load('http://mock.test/data.txt', { responseType: 'text' })
        .then(response => response.body);
    });
    expect(text).toBe('hello world');
  });

});

test.describe('ResourceProxy - custom handlers', () => {

  test('register handler intercepts matching URLs', async ({ page }) => {
    await setup(page);

    const data = await page.evaluate(() => {
      window.resourceProxy.register('test:', (url, info) => {
        return { url, type: 'json', body: { source: 'handler', path: url.replace('test:', '') } };
      });
      return window.resourceProxy.load('test:hello')
        .then(response => response.body);
    });
    expect(data).toEqual({ source: 'handler', path: 'hello' });
  });

  test('handler can return a promise', async ({ page }) => {
    await setup(page);

    const data = await page.evaluate(() => {
      window.resourceProxy.register('async:', (url) => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ url, type: 'text', body: 'async result' }), 10);
        });
      });
      return window.resourceProxy.load('async:test')
        .then(response => response.body);
    });
    expect(data).toBe('async result');
  });

  test('handler receives requestInfo', async ({ page }) => {
    await setup(page);

    const result = await page.evaluate(() => {
      window.resourceProxy.register('info:', (url, info) => {
        return { url, type: 'json', body: { method: info.method, responseType: info.responseType } };
      });
      return window.resourceProxy.load('info:check', { method: 'get', responseType: 'json' })
        .then(response => response.body);
    });
    expect(result.method).toBe('get');
    expect(result.responseType).toBe('json');
  });

});

test.describe('ResourceProxy - add to cache', () => {

  test('add then load returns cached document', async ({ page }) => {
    await setup(page);

    const text = await page.evaluate(() => {
      const doc = document.implementation.createHTMLDocument('Test');
      doc.body.innerHTML = '<p>pre-added</p>';
      return window.resourceProxy.add({ url: 'http://mock.test/preadded.html', type: 'document', body: doc })
        .then(() => window.resourceProxy.load('http://mock.test/preadded.html'))
        .then(response => response.body.querySelector('p').textContent);
    });
    expect(text).toBe('pre-added');
  });

  test('add JSON to cache', async ({ page }) => {
    await setup(page);

    const data = await page.evaluate(() => {
      window.resourceProxy.add({ url: 'local:data', type: 'json', body: { x: 42 } });
      return window.resourceProxy.load('local:data', { responseType: 'json' })
        .then(response => response.body);
    });
    expect(data).toEqual({ x: 42 });
  });

});

test.describe('ResourceProxy - error handling', () => {

  test('load throws for unsupported method', async ({ page }) => {
    await setup(page);
    const error = await page.evaluate(() => {
      try {
        window.resourceProxy.load('http://mock.test/x', { method: 'delete' });
        return null;
      } catch (e) { return e.message; }
    });
    expect(error).toContain('not supported');
  });

  test('load throws for unsupported responseType', async ({ page }) => {
    await setup(page);
    const error = await page.evaluate(() => {
      try {
        window.resourceProxy.load('http://mock.test/x', { responseType: 'blob' });
        return null;
      } catch (e) { return e.message; }
    });
    expect(error).toContain('not supported');
  });

});
