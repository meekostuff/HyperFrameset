import { test, expect } from '@playwright/test';

test.describe('globals injection into hazard template scope', () => {

  test('helper functions from frameset globals are available in expressions', async ({ page }) => {
    await page.goto('/test/fixtures/globals-page.html?dev');
    await page.waitForFunction(() => document.querySelector('#title')?.textContent, { timeout: 5000 });

    const title = page.locator('#title');
    await expect(title).toHaveText('HELLO WORLD');
  });

  test('helper functions can transform content', async ({ page }) => {
    await page.goto('/test/fixtures/globals-page.html?dev');
    await page.waitForFunction(() => document.querySelector('#exclaimed'), { timeout: 5000 });

    const exclaimed = page.locator('#exclaimed');
    await expect(exclaimed).toHaveText('Some content here!');
  });

  test('global qa() helper works with haz:each', async ({ page }) => {
    await page.goto('/test/fixtures/globals-page.html?dev');
    await page.waitForFunction(() => document.querySelector('#links li'), { timeout: 5000 });

    const items = page.locator('#links li');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText('One');
    await expect(items.nth(1)).toHaveText('Two');
    await expect(items.nth(2)).toHaveText('Three');
  });

});
