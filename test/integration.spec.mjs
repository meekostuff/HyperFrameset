import { test, expect } from '@playwright/test';

test.describe('HyperFrameset integration', () => {

  test('frameset applies to landing page', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    // Wait for HyperFrameset to process the page
    await page.waitForSelector('hf-frame', { timeout: 5000 });

    // Frameset should have created hf-frame elements
    const frames = await page.locator('hf-frame').count();
    expect(frames).toBeGreaterThan(0);
  });

  test('page content is transcluded into frameset', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('#page-main', { timeout: 5000 });

    // The page's #page-main content should be present
    const main = await page.locator('#page-main').textContent();
    expect(main).toContain('#page-main');
  });

  test('frameset header and footer are rendered', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('#frameset-header', { timeout: 5000 });

    const header = await page.locator('#frameset-header').textContent();
    expect(header).toContain('#frameset-header');

    const footer = await page.locator('#frameset-footer').textContent();
    expect(footer).toContain('#frameset-footer');
  });

  test('irrelevant content is removed', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('hf-frame', { timeout: 5000 });

    // Elements with class "remove" should not be visible
    const removeElements = await page.locator('.remove:visible').count();
    expect(removeElements).toBe(0);
  });

  test('frameset styles are applied', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('.external.frameset', { timeout: 5000 });

    // The frameset stylesheet should apply a green border
    const border = await page.locator('.external.frameset').evaluate(el => {
      return getComputedStyle(el).borderColor;
    });
    // green border = rgb(0, 128, 0) or similar
    expect(border).toContain('0, 128, 0');
  });

  test('page-specific styles are not applied', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('.external.noframeset', { timeout: 5000 });

    // The page's noframeset stylesheet should NOT apply red background
    const bg = await page.locator('.external.noframeset').evaluate(el => {
      return getComputedStyle(el).backgroundColor;
    });
    // Should NOT be red
    expect(bg).not.toContain('255, 0, 0');
  });

  test('navigation index is loaded into frame', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('nav', { timeout: 5000 });

    // The nav from index.html should be transcluded
    const links = await page.locator('nav a').count();
    expect(links).toBeGreaterThan(0);
  });

  test('pushState navigation updates frame content', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('nav a', { timeout: 5000 });

    // Click a nav link
    const link = page.locator('nav a[href*="long.html"]');
    if (await link.count() > 0) {
      await link.click();
      // Wait for content to update
      await page.waitForTimeout(1000);

      // URL should have changed
      expect(page.url()).toContain('long.html');

      // The panner should become visible (indicates pushState navigation)
      const panner = page.locator('#panner');
      if (await panner.count() > 0) {
        const hidden = await panner.getAttribute('hidden');
        expect(hidden).toBeNull();
      }
    }
  });
});
