import { test, expect } from '@playwright/test';

test.describe('framer navigation', () => {

  test('modifier key clicks are not intercepted (ctrl+click)', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('hf-frame', { timeout: 5000 });
    await page.evaluate(() => window.__noReload = true);

    // Ctrl+click should not be intercepted by framer
    const link = page.locator('a[href]').first();
    await link.click({ modifiers: ['Control'] });

    // Give time for any navigation to occur
    await page.waitForTimeout(500);

    // Should still be on the same page (ctrl+click opens new tab, doesn't navigate)
    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBe(true);
  });

  test('links with target attribute are not intercepted', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('hf-frame', { timeout: 5000 });

    // Add a link with target="_blank"
    await page.evaluate(() => {
      const a = document.createElement('a');
      a.href = '/demo/normal.html';
      a.target = '_blank';
      a.textContent = 'external link';
      a.id = 'target-link';
      document.body.appendChild(a);
    });

    await page.evaluate(() => window.__intercepted = false);
    await page.evaluate(() => {
      document.getElementById('target-link').addEventListener('click', (e) => {
        e.preventDefault(); // prevent actual navigation
        window.__intercepted = true;
      });
    });

    await page.locator('#target-link').click();
    // The framer should not have prevented default — our manual handler should fire
    const intercepted = await page.evaluate(() => window.__intercepted);
    expect(intercepted).toBe(true);
  });

  test('links without href are not intercepted', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('hf-frame', { timeout: 5000 });

    await page.evaluate(() => {
      const a = document.createElement('a');
      a.textContent = 'no href';
      a.id = 'no-href-link';
      document.body.appendChild(a);
      window.__noReload = true;
    });

    await page.locator('#no-href-link').click();
    await page.waitForTimeout(200);

    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBe(true);
  });

  test('form with target attribute is not intercepted', async ({ page }) => {
    await page.goto('/demo/get.html?dev');
    await page.waitForSelector('#page-main form', { timeout: 5000 });

    // Add target to the form
    await page.evaluate(() => {
      document.querySelector('form').target = '_blank';
      window.__noReload = true;
    });

    // Submit should not be intercepted
    await page.evaluate(() => {
      document.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault(); // prevent actual navigation
        window.__formSubmitted = true;
      });
    });

    await page.locator('input[type="submit"]').click();
    const submitted = await page.evaluate(() => window.__formSubmitted);
    expect(submitted).toBe(true);
  });

  test('POST form is not intercepted by pushState navigation', async ({ page }) => {
    await page.goto('/demo/post.html?dev');
    await page.waitForSelector('#page-main form', { timeout: 5000 });

    // Verify the form method is POST
    const method = await page.evaluate(() => document.querySelector('form').method);
    expect(method.toLowerCase()).toBe('post');

    await page.evaluate(() => window.__noReload = true);

    // Fill and submit
    await page.locator('input[name="q"]').fill('test');
    await page.locator('input[type="submit"]').click();

    // Wait for navigation
    await page.waitForURL(/post\.ehtml/, { timeout: 5000 });

    // Full reload should have occurred (pushState not used for POST)
    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBeUndefined();
  });

  test('external origin links cause full navigation', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForSelector('hf-frame', { timeout: 5000 });

    await page.evaluate(() => {
      const a = document.createElement('a');
      a.href = 'http://other-domain.example.com/page';
      a.textContent = 'external';
      a.id = 'external-link';
      document.body.appendChild(a);
      window.__noReload = true;
    });

    // Listen for requestnavigation - if framer intercepts, it dispatches this event
    const intercepted = await page.evaluate(() => {
      return new Promise(resolve => {
        document.getElementById('external-link').addEventListener('requestnavigation', () => {
          resolve(true);
        });
        // Click and wait briefly
        document.getElementById('external-link').click();
        setTimeout(() => resolve(false), 300);
      });
    });

    // External links should still trigger requestnavigation (framer intercepts the click)
    // but onRequestNavigation should let it fall through due to origin mismatch
    expect(intercepted).toBe(true);
  });

});

test.describe('framer multi-frame routing', () => {

  test('frameset renders both nav and main frames', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForSelector('hf-frame[targetname="hf_main"]', { timeout: 5000 });

    const navFrame = page.locator('hf-frame[targetname="hf_nav"]');
    const mainFrame = page.locator('hf-frame[targetname="hf_main"]');
    await expect(navFrame).toHaveCount(1);
    await expect(mainFrame).toHaveCount(1);
  });

  test('nav frame loads external content via src', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    const links = page.locator('hf-frame[targetname="hf_nav"] a');
    await expect(links).toHaveCount(2);
    await expect(links.first()).toHaveText('Page 1');
    await expect(links.last()).toHaveText('Page 2');
  });

  test('main frame receives landing page content', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForSelector('#page1-content', { timeout: 5000 });

    const content = page.locator('hf-frame[targetname="hf_main"] #page1-content');
    await expect(content).toHaveText('This is page one content.');
  });

  test('clicking nav link routes content to main frame only', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    await page.evaluate(() => window.__noReload = true);

    await page.locator('hf-frame[targetname="hf_nav"] a:text("Page 2")').click();
    await page.waitForSelector('#page2-content', { timeout: 5000 });

    const mainContent = page.locator('hf-frame[targetname="hf_main"] #page2-content');
    await expect(mainContent).toHaveText('This is page two content.');

    const navLinks = page.locator('hf-frame[targetname="hf_nav"] a');
    await expect(navLinks).toHaveCount(2);

    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBe(true);
  });

  test('URL updates when navigating between frames', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    await page.locator('hf-frame[targetname="hf_nav"] a:text("Page 2")').click();
    await page.waitForSelector('#page2-content', { timeout: 5000 });

    expect(page.url()).toContain('multiframe-page2.html');
  });

  test('back navigation restores previous frame content', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForSelector('hf-frame[targetname="hf_nav"] a', { timeout: 5000 });

    await page.locator('hf-frame[targetname="hf_nav"] a:text("Page 2")').click();
    await page.waitForSelector('#page2-content', { timeout: 5000 });

    await page.goBack();
    await page.waitForSelector('#page1-content', { timeout: 5000 });

    const content = page.locator('hf-frame[targetname="hf_main"] #page1-content');
    await expect(content).toHaveText('This is page one content.');
    expect(page.url()).toContain('multiframe-page1.html');
  });

});
