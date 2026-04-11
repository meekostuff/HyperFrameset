import { test, expect } from '@playwright/test';

async function setup(page) {
  await page.goto('/test/fixtures/test-history.html');
  await page.waitForFunction(() => window.__ready);
}

function startManager(page) {
  return page.evaluate(() => {
    return new Promise(resolve => {
      window.historyManager.start(
        { page: 'home' }, 'Home', '/test/fixtures/test-history.html',
        state => { resolve(state.settings.data); },
        state => { window.__popResult = state.settings.data; }
      );
    });
  });
}

test('getState returns undefined before start', async ({ page }) => {
  await setup(page);
  const state = await page.evaluate(() => window.historyManager.getState());
  expect(state).toBeUndefined();
});

test('start initializes state and calls onNewState', async ({ page }) => {
  await setup(page);
  const data = await startManager(page);
  expect(data).toEqual({ page: 'home' });
});

test('getState returns state after start', async ({ page }) => {
  await setup(page);
  await startManager(page);
  const data = await page.evaluate(() => window.historyManager.getState().settings.data);
  expect(data).toEqual({ page: 'home' });
});

test('pushState updates state and increments history length', async ({ page }) => {
  await setup(page);
  await startManager(page);

  const result = await page.evaluate(() => {
    const lengthBefore = history.length;
    return new Promise(resolve => {
      window.historyManager.pushState(
        { page: 'about' }, 'About', '/test/fixtures/test-history.html?about',
        state => {
          resolve({
            data: state.settings.data,
            lengthDiff: history.length - lengthBefore,
          });
        }
      );
    });
  });
  expect(result.data).toEqual({ page: 'about' });
  expect(result.lengthDiff).toBe(1);
});

test('replaceState updates state without incrementing history length', async ({ page }) => {
  await setup(page);
  await startManager(page);

  const result = await page.evaluate(() => {
    const lengthBefore = history.length;
    return new Promise(resolve => {
      window.historyManager.replaceState(
        { page: 'replaced' }, 'Replaced', '/test/fixtures/test-history.html?replaced',
        state => {
          resolve({
            data: state.settings.data,
            lengthDiff: history.length - lengthBefore,
          });
        }
      );
    });
  });
  expect(result.data).toEqual({ page: 'replaced' });
  expect(result.lengthDiff).toBe(0);
});

test('popstate restores previous state', async ({ page }) => {
  await setup(page);
  await startManager(page);

  await page.evaluate(() => {
    return new Promise(resolve => {
      window.historyManager.pushState(
        { page: 'next' }, 'Next', '/test/fixtures/test-history.html?next',
        () => resolve()
      );
    });
  });

  await page.evaluate(() => { window.__popResult = null; });
  await page.goBack();
  await page.waitForFunction(() => window.__popResult !== null, { timeout: 2000 });

  const popData = await page.evaluate(() => window.__popResult);
  expect(popData).toEqual({ page: 'home' });
});
