import { test, expect } from '@playwright/test';

test.describe('custom protocol handler e2e', () => {

  test('frame loads JSON data from custom protocol handler', async ({ page }) => {
    await page.goto('/test/fixtures/custom-protocol.html');
    await page.waitForFunction(() => document.querySelector('#name')?.textContent, { timeout: 5000 });

    await expect(page.locator('#name')).toHaveText('Alice');
    await expect(page.locator('#role')).toHaveText('admin');
    await expect(page.locator('#active')).toHaveCount(1);
  });

  test('handler returns null for unknown ID — frame shows nothing', async ({ page }) => {
    await page.goto('/test/fixtures/custom-protocol.html');
    await page.waitForFunction(() => document.querySelector('#name')?.textContent, { timeout: 5000 });

    // Change src to an unknown ID
    await page.evaluate(() => {
      document.querySelector('hf-frame[targetname="hf_main"]').setAttribute('src', 'mock:unknown');
    });

    // Wait a tick for render
    await page.waitForTimeout(1000);

    // The person div should be empty or not rendered
    const name = await page.evaluate(() => document.querySelector('#name')?.textContent || '');
    expect(name).toBe('');
  });

  test('changing src to a different custom URL re-renders', async ({ page }) => {
    await page.goto('/test/fixtures/custom-protocol.html');
    await page.waitForFunction(() => document.querySelector('#name')?.textContent === 'Alice', { timeout: 5000 });

    // Change to bob
    await page.evaluate(() => {
      document.querySelector('hf-frame[targetname="hf_main"]').setAttribute('src', 'mock:bob');
    });

    await page.waitForFunction(() => document.querySelector('#name')?.textContent === 'Bob', { timeout: 5000 });

    await expect(page.locator('#name')).toHaveText('Bob');
    await expect(page.locator('#role')).toHaveText('user');
    // bob is not active
    await expect(page.locator('#active')).toHaveCount(0);
  });

});

test.describe('cascaded transforms with custom protocol', () => {

  test('script transform preprocesses data for hazard template', async ({ page }) => {
    await page.goto('/test/fixtures/cascaded-transforms.html');
    await page.waitForFunction(() => document.querySelector('#name')?.textContent, { timeout: 5000 });

    await expect(page.locator('#name')).toHaveText('Alice Smith');
    await expect(page.locator('#role')).toHaveText('ADMIN');
    await expect(page.locator('#count')).toHaveText('3');
  });

});
