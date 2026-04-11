import { test, expect } from '@playwright/test';

async function setup(page) {
  await page.goto('/test/fixtures/test-sprockets.html');
  await page.waitForFunction(() => window.__ready);
}

test('evolve creates a definition with inherited prototype', async ({ page }) => {
  await setup(page);
  const result = await page.evaluate(() => {
    const base = window.sprockets.evolve(window.sprockets.RoleType, {
      greet() { return 'hello'; }
    });
    const inst = Object.create(base.prototype);
    return inst.greet();
  });
  expect(result).toBe('hello');
});

test('evolve extends base definition', async ({ page }) => {
  await setup(page);
  const result = await page.evaluate(() => {
    const base = window.sprockets.evolve(window.sprockets.RoleType, {
      base() { return 'base'; }
    });
    const sub = window.sprockets.evolve(base, {
      sub() { return 'sub'; }
    });
    const inst = Object.create(sub.prototype);
    return { base: inst.base(), sub: inst.sub() };
  });
  expect(result).toEqual({ base: 'base', sub: 'sub' });
});

test('registerElement before start does not throw', async ({ page }) => {
  await setup(page);
  const error = await page.evaluate(() => {
    try {
      const def = window.sprockets.evolve(window.sprockets.RoleType, {});
      window.sprockets.registerElement('test-element', def);
      return null;
    } catch (e) { return e.message; }
  });
  expect(error).toBeNull();
});

test('registerElement after start throws', async ({ page }) => {
  await setup(page);
  const error = await page.evaluate(() => {
    const def = window.sprockets.evolve(window.sprockets.RoleType, {});
    window.sprockets.registerElement('test-pre', def);
    window.sprockets.start();
    try {
      window.sprockets.registerElement('test-post', def);
      return null;
    } catch (e) { return e.message; }
  });
  expect(error).toContain('already started');
});

test('start attaches bindings to matching elements already in DOM', async ({ page }) => {
  await setup(page);
  const result = await page.evaluate(() => {
    window.__attached = false;
    const def = window.sprockets.evolve(window.sprockets.RoleType, {});
    def.attached = function() { window.__attached = true; };
    window.sprockets.registerElement('test-existing', def);
    document.body.innerHTML += '<test-existing></test-existing>';
    window.sprockets.start();
    return window.__attached;
  });
  expect(result).toBe(true);
});

test('inserting a matching element triggers attach and enteredDocument', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    window.__log = [];
    const def = window.sprockets.evolve(window.sprockets.RoleType, {});
    def.attached = function() { window.__log.push('attached'); };
    def.enteredDocument = function() { window.__log.push('entered'); };
    window.sprockets.registerElement('test-insert', def);
    window.sprockets.start();
  });

  await page.evaluate(() => {
    const el = document.createElement('test-insert');
    document.body.appendChild(el);
  });

  // MutationObserver is async
  await page.waitForFunction(() => window.__log.length >= 2, { timeout: 2000 });

  const log = await page.evaluate(() => window.__log);
  expect(log).toEqual(['attached', 'entered']);
});

test('removing a bound element triggers leftDocument', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    window.__log = [];
    const def = window.sprockets.evolve(window.sprockets.RoleType, {});
    def.attached = function() { window.__log.push('attached'); };
    def.enteredDocument = function() { window.__log.push('entered'); };
    def.leftDocument = function() { window.__log.push('left'); };
    window.sprockets.registerElement('test-remove', def);
    window.sprockets.start();
  });

  await page.evaluate(() => {
    const el = document.createElement('test-remove');
    document.body.appendChild(el);
  });
  await page.waitForFunction(() => window.__log.includes('entered'), { timeout: 2000 });

  await page.evaluate(() => {
    const el = document.querySelector('test-remove');
    el.parentNode.removeChild(el);
  });
  await page.waitForFunction(() => window.__log.includes('left'), { timeout: 2000 });

  const log = await page.evaluate(() => window.__log);
  expect(log).toEqual(['attached', 'entered', 'left']);
});

test('event handler fires on bound element', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    window.__clicked = false;
    const def = window.sprockets.evolve(window.sprockets.RoleType, {});
    def.handlers = [{ type: 'click', action() { window.__clicked = true; } }];
    window.sprockets.registerElement('test-click', def);
    window.sprockets.start();
  });

  await page.evaluate(() => {
    const el = document.createElement('test-click');
    document.body.appendChild(el);
  });
  await page.waitForFunction(() => {
    const el = document.querySelector('test-click');
    return el && window.DOM.hasData(el);
  }, { timeout: 2000 });

  await page.evaluate(() => document.querySelector('test-click').click());
  const clicked = await page.evaluate(() => window.__clicked);
  expect(clicked).toBe(true);
});

test('is= attribute matches binding rule', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    window.__attached = false;
    const def = window.sprockets.evolve(window.sprockets.RoleType, {});
    def.attached = function() { window.__attached = true; };
    window.sprockets.registerElement('test-is', def);
    window.sprockets.start();
  });

  await page.evaluate(() => {
    const el = document.createElement('div');
    el.setAttribute('is', 'test-is');
    document.body.appendChild(el);
  });
  await page.waitForFunction(() => window.__attached, { timeout: 2000 });

  const attached = await page.evaluate(() => window.__attached);
  expect(attached).toBe(true);
});
