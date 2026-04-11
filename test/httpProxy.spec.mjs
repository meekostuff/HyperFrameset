import { test, expect } from '@playwright/test';

async function setup(page) {
  await page.goto('/test/fixtures/test-httpProxy.html');
  await page.waitForFunction(() => window.__ready);
}

test('load fetches and parses a document', async ({ page }) => {
  await page.route('http://mock.test/page.html', route => {
    route.fulfill({
      contentType: 'text/html',
      body: '<!DOCTYPE html><html><head></head><body><p>hello from mock</p></body></html>',
    });
  });

  await setup(page);

  const text = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      window.httpProxy.load('http://mock.test/page.html')
        .then(response => resolve(response.document.querySelector('p').textContent))
        .catch(e => reject(e));
    });
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
    return new Promise(resolve => {
      window.httpProxy.load('http://mock.test/cached.html')
        .then(() => resolve());
    });
  });

  const text = await page.evaluate(() => {
    return new Promise(resolve => {
      window.httpProxy.load('http://mock.test/cached.html')
        .then(response => resolve(response.document.querySelector('p').textContent));
    });
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
    return new Promise(resolve => {
      window.httpProxy.load('http://mock.test/dir/page.html')
        .then(response => resolve(response.document.querySelector('a').getAttribute('href')));
    });
  });
  expect(href).toBe('http://mock.test/dir/other.html');
});

test('load rejects for non-200 status', async ({ page }) => {
  await page.route('http://mock.test/notfound.html', route => {
    route.fulfill({ status: 404, body: 'Not Found' });
  });

  await setup(page);

  const error = await page.evaluate(() => {
    return new Promise(resolve => {
      window.httpProxy.load('http://mock.test/notfound.html')
        .then(() => resolve(null))
        .catch(e => resolve('rejected'));
    });
  });
  expect(error).toBe('rejected');
});

test('add then load returns cached document', async ({ page }) => {
  await setup(page);

  const text = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const doc = document.implementation.createHTMLDocument('Test');
      doc.body.innerHTML = '<p>pre-added</p>';
      window.httpProxy.add({ url: 'http://mock.test/preadded.html', type: 'document', document: doc })
        .then(() => window.httpProxy.load('http://mock.test/preadded.html'))
        .then(response => resolve(response.document.querySelector('p').textContent))
        .catch(e => reject(e));
    });
  });
  expect(text).toBe('pre-added');
});

test('load throws for unsupported method', async ({ page }) => {
  await setup(page);
  const error = await page.evaluate(() => {
    try {
      window.httpProxy.load('http://mock.test/x', { method: 'delete' });
      return null;
    } catch (e) { return e.message; }
  });
  expect(error).toContain('not supported');
});

test('load throws for unsupported responseType', async ({ page }) => {
  await setup(page);
  const error = await page.evaluate(() => {
    try {
      window.httpProxy.load('http://mock.test/x', { responseType: 'blob' });
      return null;
    } catch (e) { return e.message; }
  });
  expect(error).toContain('not supported');
});
