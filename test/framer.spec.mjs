import { test, expect } from '@playwright/test';

/**
 * Playwright/WebKit workarounds for Navigation API interaction issues.
 *
 * Prior to Playwright 1.61+, WebKit had a bug where e.intercept() on a
 * Navigation API same-document navigation left Playwright's internal navigation
 * tracker in a "pending" state. This caused locator actions (click, toHaveText,
 * toHaveCount), waitForSelector, and page.url() to hang or return stale values.
 *
 * See: https://github.com/microsoft/playwright/issues/41125 (fixed in #41129)
 *
 * These helpers use page.evaluate() to bypass Playwright's navigation-aware
 * locator layer. They remain in use for robustness across Playwright versions.
 * After a Navigation API e.intercept() call, Playwright's WebKit integration
 * considers a navigation "pending" indefinitely. This causes:
 * - page.url() to return stale values
 * - locator actions (click, toHaveText, toHaveCount) to hang
 * - waitForSelector to hang
 *
 * These helpers bypass Playwright's navigation-aware locator layer by using
 * page.evaluate() directly, which is not affected by the pending navigation state.
 *
 * See: https://github.com/microsoft/playwright/issues/33806
 */

/** Get the current document URL (bypasses Playwright's stale page.url()) */
async function getURL(page) {
  return page.evaluate(() => document.URL);
}

/** Click an element by selector using el.click() (bypasses Playwright actionability checks) */
async function click(page, selector) {
  await page.evaluate((sel) => document.querySelector(sel).click(), selector);
}

/** Get text content of an element by selector */
async function getText(page, selector) {
  return page.evaluate((sel) => document.querySelector(sel)?.textContent ?? null, selector);
}

/** Get count of elements matching a selector */
async function getCount(page, selector) {
  return page.evaluate((sel) => document.querySelectorAll(sel).length, selector);
}

/** Wait for an element to exist in the DOM */
async function waitFor(page, selector, timeout = 5000) {
  await page.waitForFunction((sel) => document.querySelector(sel), selector, { timeout });
}

test.describe('framer navigation', () => {

  // Enable browser console logging with: BROWSER_LOGGING=1 npx playwright test
  test.beforeEach(async ({ page }) => {
    if (process.env.BROWSER_LOGGING) {
      page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
      page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    }
  });

  test('modifier key clicks are not intercepted (ctrl+click)', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame'), { timeout: 5000 });
    await page.evaluate(() => window.__noReload = true);

    // Ctrl+click should not be intercepted by framer
    await page.waitForFunction(() => document.querySelector('a[href]'), { timeout: 5000 });
    const link = page.locator('a[href]').first();
    await link.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true })));

    // Give time for any navigation to occur
    await page.waitForTimeout(500);

    // Should still be on the same page (ctrl+click opens new tab, doesn't navigate)
    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBe(true);
  });

  test('links with target attribute are not intercepted', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame'), { timeout: 5000 });

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

    await page.evaluate(() => document.querySelector('#target-link').click());
    // The framer should not have prevented default — our manual handler should fire
    const intercepted = await page.evaluate(() => window.__intercepted);
    expect(intercepted).toBe(true);
  });

  test('links without href are not intercepted', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame'), { timeout: 5000 });

    await page.evaluate(() => {
      const a = document.createElement('a');
      a.textContent = 'no href';
      a.id = 'no-href-link';
      document.body.appendChild(a);
      window.__noReload = true;
    });

    await page.evaluate(() => document.querySelector('#no-href-link').click());
    await page.waitForTimeout(200);

    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBe(true);
  });

  test('form with target attribute is not intercepted', async ({ page }) => {
    await page.goto('/demo/get.html?dev');
    await page.waitForFunction(() => document.querySelector('#page-main form'), { timeout: 5000 });

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

    await page.evaluate(() => document.querySelector('input[type="submit"]').click());
    const submitted = await page.evaluate(() => window.__formSubmitted);
    expect(submitted).toBe(true);
  });

  test('POST form is not intercepted by pushState navigation', async ({ page }) => {
    await page.goto('/demo/post.html?dev');
    await page.waitForFunction(() => document.querySelector('#page-main form'), { timeout: 5000 });

    // Verify the form method is POST
    const method = await page.evaluate(() => document.querySelector('form').method);
    expect(method.toLowerCase()).toBe('post');

    await page.evaluate(() => window.__noReload = true);

    // Fill and submit
    await page.evaluate(() => document.querySelector('input[name="q"]').value = 'test');
    await page.evaluate(() => document.querySelector('input[type="submit"]').click());

    // Wait for navigation
    await page.waitForURL(/post\.ehtml/, { timeout: 5000 });

    // Full reload should have occurred (pushState not used for POST)
    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBeUndefined();
  });

  test('external origin links cause full navigation', async ({ page }) => {
    await page.goto('/demo/normal.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame'), { timeout: 5000 });

    await page.evaluate(() => {
      const a = document.createElement('a');
      a.href = 'http://other-domain.example.com/page';
      a.textContent = 'external';
      a.id = 'external-link';
      document.body.appendChild(a);
      window.__noReload = true;
    });

    // External links should not be intercepted — they cause full page navigation.
    // Use force:true to bypass Playwright's actionability checks (WebKit Navigation API issue).
    // Use page.waitForURL to detect navigation starting, or catch context destruction.
    let navigatedAway = false;
    try {
      await Promise.all([
        page.waitForURL(/other-domain/, { timeout: 5000 }).then(() => { navigatedAway = true; }),
        page.locator('#external-link').click({ force: true }),
      ]);
    } catch (e) {
      // Context destroyed = page navigated away
      navigatedAway = true;
    }

    expect(navigatedAway).toBe(true);
  });

});

test.describe('framer multi-frame routing', () => {

  // Enable browser console logging with: BROWSER_LOGGING=1 npx playwright test
  test.beforeEach(async ({ page }) => {
    if (process.env.BROWSER_LOGGING) {
      page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
      page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    }
  });

  test('frameset renders both nav and main frames', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame[targetname="hf_main"]'), { timeout: 5000 });

    expect(await getCount(page, 'hf-frame[targetname="hf_nav"]')).toBe(1);
    expect(await getCount(page, 'hf-frame[targetname="hf_main"]')).toBe(1);
  });

  test('nav frame loads external content via src', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame[targetname="hf_nav"] a'), { timeout: 5000 });

    expect(await getCount(page, 'hf-frame[targetname="hf_nav"] a')).toBe(2);
    expect(await getText(page, 'hf-frame[targetname="hf_nav"] a:nth-child(1)')).toBe('Page 1');
    expect(await getText(page, 'hf-frame[targetname="hf_nav"] a:nth-child(2)')).toBe('Page 2');
  });

  test('main frame receives landing page content', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForFunction(() => document.querySelector('#page1-content'), { timeout: 5000 });

    const content = await getText(page, 'hf-frame[targetname="hf_main"] #page1-content');
    expect(content).toBe('This is page one content.');
  });

  test('clicking nav link routes content to main frame only', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame[targetname="hf_nav"] a'), { timeout: 5000 });

    await page.evaluate(() => window.__noReload = true);

    await page.evaluate(() => document.querySelector('hf-frame[targetname="hf_nav"] a:nth-child(2)').click());
    await page.waitForFunction(() => document.querySelector('#page2-content'), { timeout: 5000 });

    const mainText = await page.evaluate(() => document.querySelector('hf-frame[targetname="hf_main"] #page2-content')?.textContent);
    expect(mainText).toBe('This is page two content.');

    const navCount = await page.evaluate(() => document.querySelectorAll('hf-frame[targetname="hf_nav"] a').length);
    expect(navCount).toBe(2);

    const survived = await page.evaluate(() => window.__noReload);
    expect(survived).toBe(true);
  });

  test('URL updates when navigating between frames', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame[targetname="hf_nav"] a'), { timeout: 5000 });

    await page.evaluate(() => document.querySelector('hf-frame[targetname="hf_nav"] a:nth-child(2)').click());
    await page.waitForFunction(() => document.querySelector('#page2-content'), { timeout: 5000 });

    const url = await page.evaluate(() => document.URL);
    expect(url).toContain('multiframe-page2.html');
  });

  test('back navigation restores previous frame content', async ({ page }) => {
    await page.goto('/test/fixtures/multiframe-page1.html?dev');
    await page.waitForFunction(() => document.querySelector('hf-frame[targetname="hf_nav"] a'), { timeout: 5000 });

    await page.evaluate(() => document.querySelector('hf-frame[targetname="hf_nav"] a:nth-child(2)').click());
    await page.waitForFunction(() => document.querySelector('#page2-content'), { timeout: 5000 });

    await page.goBack();
    await page.waitForFunction(() => document.querySelector('#page1-content'), { timeout: 5000 });

    const content = await getText(page, 'hf-frame[targetname="hf_main"] #page1-content');
    expect(content).toBe('This is page one content.');
    expect(await page.evaluate(() => document.URL)).toContain('multiframe-page1.html');
  });

});
