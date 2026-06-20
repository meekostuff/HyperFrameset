import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/test-behaviors.html');
  await page.waitForFunction(() => typeof behaviors !== 'undefined');
});

test('define attaches behavior to element', async ({ page }) => {
  const result = await page.evaluate(() => {
    let el = document.createElement('div');
    document.body.appendChild(el);
    behaviors.define(el, { count: 5 }, []);
    return el.$.count;
  });
  expect(result).toBe(5);
});

test('event listeners fire via handleEvent', async ({ page }) => {
  const result = await page.evaluate(() => {
    let el = document.createElement('button');
    document.body.appendChild(el);
    behaviors.define(el, null, [
      { type: 'click', action() { this.element.setAttribute('data-clicked', 'true'); } }
    ]);
    el.click();
    return el.getAttribute('data-clicked');
  });
  expect(result).toBe('true');
});

test('behavior.element returns the DOM element', async ({ page }) => {
  const result = await page.evaluate(() => {
    let el = document.createElement('div');
    el.id = 'el';
    document.body.appendChild(el);
    behaviors.define(el, { x: 1 }, []);
    return el.$.element.id;
  });
  expect(result).toBe('el');
});

test('listener filters by key', async ({ page }) => {
  const result = await page.evaluate(() => {
    let el = document.createElement('input');
    document.body.appendChild(el);
    behaviors.define(el, null, [
      { type: 'keydown', key: 'Enter', action(ev) { this.element.setAttribute('data-key', ev.key); } }
    ]);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return el.getAttribute('data-key');
  });
  expect(result).toBe('Enter');
});

test('$ lazily creates empty behavior', async ({ page }) => {
  const result = await page.evaluate(() => {
    let el = document.createElement('div');
    el.id = 'lazy';
    document.body.appendChild(el);
    return el.$.element.id;
  });
  expect(result).toBe('lazy');
});

test('getTarget finds preceding non-script sibling', async ({ page }) => {
  const result = await page.evaluate(() => {
    document.body.innerHTML = '<div id="target"></div><style></style><script id="s"><\/script>';
    let script = document.getElementById('s');
    let target = script;
    while (target = target.previousElementSibling) {
      if (!['STYLE', 'SCRIPT'].includes(target.tagName)) break;
    }
    return target.id;
  });
  expect(result).toBe('target');
});

test('script[for] registers on processScripts', async ({ page }) => {
  const result = await page.evaluate(() => {
    document.body.innerHTML = '<div id="comp"></div><script for>({ val: 42 })<\/script>';
    behaviors.processScripts(document.body);
    return document.getElementById('comp').$.val;
  });
  expect(result).toBe(42);
});

test('script[for] supports class syntax', async ({ page }) => {
  const result = await page.evaluate(() => {
    document.body.innerHTML = `<button id="btn"></button><script for>class extends behaviors.Base {
        greet() { return 'hello'; }
        onclick() { this.element.setAttribute('data-clicked', 'true'); }
    }<\/script>`;
    behaviors.processScripts(document.body);
    return document.getElementById('btn').$.greet();
  });
  expect(result).toBe('hello');
});

test('script[for] class onclick fires', async ({ page }) => {
  await page.evaluate(() => {
    document.body.innerHTML = `<button id="btn"></button><script for>class extends behaviors.Base {
        onclick() { this.element.setAttribute('data-clicked', 'true'); }
    }<\/script>`;
    behaviors.processScripts(document.body);
  });
  await page.click('#btn');
  const clicked = await page.evaluate(() => document.getElementById('btn').getAttribute('data-clicked'));
  expect(clicked).toBe('true');
});

test('script[for] class with static listeners', async ({ page }) => {
  await page.evaluate(() => {
    document.body.innerHTML = `<input id="inp" /><script for>class extends behaviors.Base {
        static on = [
            { type: 'keydown', key: 'Enter', action() { this.element.value = 'entered'; } }
        ]
    }<\/script>`;
    behaviors.processScripts(document.body);
  });
  await page.focus('#inp');
  await page.keyboard.press('Enter');
  const val = await page.evaluate(() => document.getElementById('inp').value);
  expect(val).toBe('entered');
});

test('script[for] supports array of listeners', async ({ page }) => {
  await page.evaluate(() => {
    document.body.innerHTML = `<button id="btn"></button><script for>([
        { type: 'click', action() { this.element.setAttribute('data-clicked', 'true'); } }
    ])<\/script>`;
    behaviors.processScripts(document.body);
  });
  await page.click('#btn');
  const clicked = await page.evaluate(() => document.getElementById('btn').getAttribute('data-clicked'));
  expect(clicked).toBe('true');
});

test('register 2-arg: bare class inherits defaultProto', async ({ page }) => {
  const result = await page.evaluate(() => {
    behaviors.Base.prototype.base = 'yes';
    let el = document.createElement('div');
    document.body.appendChild(el);
    behaviors.register('k1', class { myMethod() { return 'hi'; } });
    el.setAttribute('mk-is', 'k1');
    let inst = el.$;
    return { myMethod: inst.myMethod(), base: inst.base };
  });
  expect(result).toEqual({ myMethod: 'hi', base: 'yes' });
});

test('register 2-arg: plain object inherits defaultProto', async ({ page }) => {
  const result = await page.evaluate(() => {
    behaviors.Base.prototype.base = 'yes';
    let el = document.createElement('div');
    document.body.appendChild(el);
    behaviors.register('k2', { myMethod() { return 'hi'; } });
    el.setAttribute('mk-is', 'k2');
    let inst = el.$;
    return { myMethod: inst.myMethod(), base: inst.base };
  });
  expect(result).toEqual({ myMethod: 'hi', base: 'yes' });
});

test('register 2-arg: array-only declaration inherits defaultProto', async ({ page }) => {
  const result = await page.evaluate(() => {
    behaviors.Base.prototype.base = 'yes';
    let el = document.createElement('div');
    document.body.appendChild(el);
    behaviors.register('k3', [
      { type: 'click', action() { this.element.setAttribute('data-clicked', 'true'); } }
    ]);
    el.setAttribute('mk-is', 'k3');
    return el.$.base;
  });
  expect(result).toBe('yes');
});
