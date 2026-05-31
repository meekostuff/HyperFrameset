import { test, expect } from '@playwright/test';

test.describe('framer startAsFrameset (no contentDocument)', () => {

  test('frameset-first mode renders frames without content document', async ({ page }) => {
    await page.goto('/test/fixtures/frameset-first.html');
    await page.waitForSelector('hf-frame[targetname="hf_nav"]', { timeout: 5000 });

    const navFrame = page.locator('hf-frame[targetname="hf_nav"]');
    const mainFrame = page.locator('hf-frame[targetname="hf_main"]');
    await expect(navFrame).toHaveCount(1);
    await expect(mainFrame).toHaveCount(1);
  });

  test('nav frame loads content via src attribute', async ({ page }) => {
    await page.goto('/test/fixtures/frameset-first.html');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    const links = page.locator('hf-frame[targetname="hf_nav"] a');
    await expect(links).toHaveCount(2);
    await expect(links.first()).toHaveText('Page 1');
  });

  test('URL remains the frameset URL when no start_url provided', async ({ page }) => {
    await page.goto('/test/fixtures/frameset-first.html');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    expect(page.url()).toContain('frameset-first.html');
  });

});

test.describe('framer startAsFrameset with start_url', () => {

  test('start_url replaces the address bar URL', async ({ page }) => {
    await page.goto('/test/fixtures/frameset-first-starturl.html?start_url=/test/fixtures/multiframe-page1.html');
    await page.waitForSelector('hf-frame[targetname="hf_main"]', { timeout: 5000 });

    expect(page.url()).toContain('multiframe-page1.html');
  });

  test('start_url content is loaded into the target frame', async ({ page }) => {
    await page.goto('/test/fixtures/frameset-first-starturl.html?start_url=/test/fixtures/multiframe-page1.html');
    await page.waitForSelector('#page1-content', { timeout: 5000 });

    const content = page.locator('hf-frame[targetname="hf_main"] #page1-content');
    await expect(content).toHaveText('This is page one content.');
  });

  test('nav frame still loads independently of start_url', async ({ page }) => {
    await page.goto('/test/fixtures/frameset-first-starturl.html?start_url=/test/fixtures/multiframe-page1.html');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    const links = page.locator('hf-frame[targetname="hf_nav"] a');
    await expect(links).toHaveCount(2);
  });

  test('navigation from start_url state works with pushState', async ({ page }) => {
    await page.goto('/test/fixtures/frameset-first-starturl.html?start_url=/test/fixtures/multiframe-page1.html');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    await page.evaluate(() => window.__noReload = true);

    await page.locator('hf-frame[targetname="hf_nav"] a:text("Page 2")').click();
    await page.waitForSelector('#page2-content', { timeout: 5000 });

    expect(page.url()).toContain('multiframe-page2.html');

    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBe(true);
  });

  test('back navigation returns to start_url', async ({ page }) => {
    await page.goto('/test/fixtures/frameset-first-starturl.html?start_url=/test/fixtures/multiframe-page1.html');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    await page.locator('hf-frame[targetname="hf_nav"] a:text("Page 2")').click();
    await page.waitForSelector('#page2-content', { timeout: 5000 });

    await page.goBack();
    await page.waitForSelector('#page1-content', { timeout: 5000 });

    expect(page.url()).toContain('multiframe-page1.html');
  });

});
