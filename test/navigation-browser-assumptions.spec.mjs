import { test, expect } from '@playwright/test';

test('NavigateEvent can be constructed from an existing NavigateEvent', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    let captured;
    let handler = (e) => { captured = e; e.preventDefault(); };
    navigation.addEventListener('navigate', handler);
    try {
      await navigation.navigate(document.URL, { history: 'replace' }).committed.catch(() => {});
      let cloned = new NavigateEvent('requestnavigation', captured);
      return {
        isNavigateEvent: cloned instanceof NavigateEvent,
        type: cloned.type,
        hasDestination: !!cloned.destination,
        urlMatches: cloned.destination?.url === captured.destination?.url
      };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.isNavigateEvent).toBe(true);
  expect(result.type).toBe('requestnavigation');
  expect(result.hasDestination).toBe(true);
  expect(result.urlMatches).toBe(true);
});

test('cloned NavigateEvent can be dispatched to an element', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    let captured;
    let handler = (e) => { captured = e; e.preventDefault(); };
    navigation.addEventListener('navigate', handler);
    try {
      await navigation.navigate(document.URL, { history: 'replace' }).committed.catch(() => {});
      let cloned = new NavigateEvent('requestnavigation', captured);
      let received = false;
      let el = document.createElement('div');
      document.body.appendChild(el);
      el.addEventListener('requestnavigation', () => { received = true; });
      let accepted = el.dispatchEvent(cloned);
      el.remove();
      return { received, accepted };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.received).toBe(true);
  expect(result.accepted).toBe(true);
});

test('currentEntry.getState() returns correct state inside intercept handler on traverse', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    // Push a state
    await navigation.navigate(document.URL + '#test-traverse', { state: { test: 'traverse-data' } }).committed;

    // NOTE: e.destination.getState() is unreliable in WebKit, so prod code
    // reads navigation.currentEntry.getState() inside the intercept handler instead.
    let currentState;
    let handler = (e) => {
      if (e.navigationType === 'traverse') {
        e.intercept({ handler: async () => {
          currentState = navigation.currentEntry.getState();
        }});
      }
    };
    navigation.addEventListener('navigate', handler);

    try {
      await navigation.back().committed;
      currentState = undefined;
      await navigation.forward().committed;
      return { state: currentState };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.state).toBeDefined();
  expect(result.state.test).toBe('traverse-data');
});

test('destination.getState() reflects updateCurrentEntry on traverse', async ({ page, browserName }) => {
  test.fail(browserName === 'webkit', 'WebKit: state set via updateCurrentEntry is not retrievable on traverse');
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    let baseURL = document.URL;

    // Push entry, then update its state via updateCurrentEntry
    await navigation.navigate(baseURL + '#entry1').committed;
    navigation.updateCurrentEntry({ state: { target: 'hf_main', url: baseURL + '#entry1' } });

    // Push another entry to move away
    await navigation.navigate(baseURL + '#entry2').committed;

    // Traverse back — does destination.getState() return the updated state?
    let traverseState;
    let handler = (e) => {
      if (e.navigationType === 'traverse') {
        traverseState = e.destination.getState();
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);

    try {
      await navigation.back().committed;
      return { state: traverseState };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.state).toBeDefined();
  expect(result.state.target).toBe('hf_main');
  expect(result.state.url).toContain('#entry1');
});

test('destination.getState() returns null for entry with no state', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    let baseURL = document.URL;

    // Push entry with no state
    await navigation.navigate(baseURL + '#nostate').committed;

    // Push another to move away
    await navigation.navigate(baseURL + '#away').committed;

    let traverseState = 'not-set';
    let handler = (e) => {
      if (e.navigationType === 'traverse') {
        traverseState = e.destination.getState();
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);

    try {
      await navigation.back().committed;
      return { state: traverseState, isUndefined: traverseState === undefined, isNull: traverseState === null };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  // Document what browsers actually return for no-state entries
  expect(result.state).toBeUndefined();
});

test('state can be retrieved via entries() lookup using destination.key on traverse', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    await navigation.navigate(document.URL + '#key-test', { state: { found: 'via-key' } }).committed;
    await navigation.navigate(document.URL + '#away').committed;

    let lookupState;
    let handler = (e) => {
      if (e.navigationType === 'traverse') {
        let entry = navigation.entries().find(entry => entry.key === e.destination.key);
        lookupState = entry?.getState();
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);

    try {
      await navigation.back().committed;
      return { state: lookupState, hasKey: !!lookupState };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.state).toBeDefined();
  expect(result.state.found).toBe('via-key');
});

test('destination.getState() matches entries lookup by key on traverse', async ({ page, browserName }) => {
  test.fail(browserName === 'webkit', 'WebKit: destination.getState() returns undefined on traverse');
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    await navigation.navigate(document.URL + '#compare', { state: { value: 42 } }).committed;
    await navigation.navigate(document.URL + '#away2').committed;

    let destinationState, lookupState;
    let handler = (e) => {
      if (e.navigationType === 'traverse') {
        destinationState = e.destination.getState();
        let entry = navigation.entries().find(entry => entry.key === e.destination.key);
        lookupState = entry?.getState();
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);

    try {
      await navigation.back().committed;
      return { destinationState, lookupState };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  // If this passes on Safari, destination.getState() is fixed and prod code can be simplified
  expect(result.destinationState).toEqual(result.lookupState);
  expect(result.destinationState).toEqual({ value: 42 });
});

test('navigation.navigate with replace to same URL resolves .finished', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    let handler = (e) => {
      if (e.navigationType === 'replace') {
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);
    try {
      let { finished } = navigation.navigate(document.URL, { history: 'replace' });
      await finished;
      return { resolved: true };
    } catch (err) {
      return { resolved: false, error: err.message };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.resolved).toBe(true);
});

test('intercept handler completion signals navigation finished', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    let handlerRan = false;
    let handler = (e) => {
      if (e.navigationType === 'push') {
        e.intercept({
          handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            handlerRan = true;
          }
        });
      }
    };
    navigation.addEventListener('navigate', handler);
    try {
      let { finished } = navigation.navigate(document.URL + '#intercept-test', { history: 'push' });
      await finished;
      return { handlerRan, finished: true };
    } catch (err) {
      return { handlerRan, finished: false, error: err.message };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.handlerRan).toBe(true);
  expect(result.finished).toBe(true);
});

test('same-page navigate with intercept does not cause page reload', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    window.__marker = true;
    let handler = (e) => {
      if (e.navigationType === 'replace') {
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);
    try {
      await navigation.navigate(document.URL, { history: 'replace' }).finished;
      return { markerSurvived: window.__marker === true };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.markerSurvived).toBe(true);
});

test('waitForFunction works after intercepted same-page navigation', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(async () => {
    let handler = (e) => {
      if (e.navigationType === 'replace') {
        e.intercept({
          handler: async () => {
            document.body.insertAdjacentHTML('beforeend', '<div id="injected2">world</div>');
          }
        });
      }
    };
    navigation.addEventListener('navigate', handler);
    await navigation.navigate(document.URL, { history: 'replace' }).finished;
    navigation.removeEventListener('navigate', handler);
  });
  await page.waitForFunction(() => document.getElementById('injected2'), { timeout: 2000 });
  const text = await page.locator('#injected2').textContent();
  expect(text).toBe('world');
});

test('entries().find().getState() retrieves updateCurrentEntry state on traverse', async ({ page, browserName }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    await navigation.navigate(document.URL + '#entry-lookup').committed;
    navigation.updateCurrentEntry({ state: { via: 'updateCurrentEntry' } });
    let entryKey = navigation.currentEntry.key;

    await navigation.navigate(document.URL + '#away3').committed;

    let lookupState;
    let handler = (e) => {
      if (e.navigationType === 'traverse') {
        let entry = navigation.entries().find(entry => entry.key === entryKey);
        lookupState = entry?.getState();
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);
    try {
      await navigation.back().committed;
      return { state: lookupState };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.state).toBeDefined();
  expect(result.state.via).toBe('updateCurrentEntry');
});

test('state passed to navigation.navigate() is retrievable on traverse', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    // Push with state directly in navigate call
    await navigation.navigate(document.URL + '#direct-state', {
      state: { method: 'navigate' }
    }).committed;

    await navigation.navigate(document.URL + '#away4').committed;

    let traverseState;
    let handler = (e) => {
      if (e.navigationType === 'traverse') {
        traverseState = navigation.entries().find(entry => entry.key === e.destination.key)?.getState();
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);
    try {
      await navigation.back().committed;
      return { state: traverseState };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.state).toBeDefined();
  expect(result.state.method).toBe('navigate');
});

test('navigation.currentEntry.getState() inside intercept handler reflects destination state', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    await navigation.navigate(document.URL + '#handler-state', {
      state: { source: 'original' }
    }).committed;

    await navigation.navigate(document.URL + '#away5').committed;

    let handlerState;
    let handler = (e) => {
      if (e.navigationType === 'traverse') {
        e.intercept({
          handler: async () => {
            handlerState = navigation.currentEntry.getState();
          }
        });
      }
    };
    navigation.addEventListener('navigate', handler);
    try {
      await navigation.back().committed;
      return { state: handlerState };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.state).toBeDefined();
  expect(result.state.source).toBe('original');
});

test('navigation.navigate to same URL with replace does not add history entry', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    let initialLength = navigation.entries().length;
    let handler = (e) => {
      if (e.navigationType === 'replace') {
        e.intercept({ handler: async () => {} });
      }
    };
    navigation.addEventListener('navigate', handler);
    try {
      await navigation.navigate(document.URL, { history: 'replace' }).finished;
      return { lengthBefore: initialLength, lengthAfter: navigation.entries().length };
    } finally {
      navigation.removeEventListener('navigate', handler);
    }
  });
  expect(result.lengthAfter).toBe(result.lengthBefore);
});

test('page.evaluate works after navigation.navigate with intercept', async ({ page, browserName }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(async () => {
    let handler = (e) => {
      e.intercept({ handler: async () => {} });
    };
    navigation.addEventListener('navigate', handler);
    await navigation.navigate(document.URL, { history: 'replace' }).finished;
    navigation.removeEventListener('navigate', handler);
  });
  // If this hangs, Playwright is blocked by pending navigation state
  const result = await page.evaluate(() => 1 + 1);
  expect(result).toBe(2);
});

test('page.waitForTimeout works after navigation.navigate with intercept', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(async () => {
    let handler = (e) => {
      e.intercept({ handler: async () => {} });
    };
    navigation.addEventListener('navigate', handler);
    await navigation.navigate(document.URL, { history: 'replace' }).finished;
    navigation.removeEventListener('navigate', handler);
  });
  // If this hangs, even timeouts are blocked
  await page.waitForTimeout(100);
  expect(true).toBe(true);
});

test('page.goto after navigation.navigate with intercept', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(async () => {
    let handler = (e) => {
      e.intercept({ handler: async () => {} });
    };
    navigation.addEventListener('navigate', handler);
    await navigation.navigate(document.URL + '#test', { history: 'push' }).finished;
    navigation.removeEventListener('navigate', handler);
  });
  // Can we navigate away? Or is Playwright stuck?
  await page.goto('/test/fixtures/normal.html');
  const title = await page.title();
  expect(title).toBe('Navigation Test');
});

test('page.evaluate works with persistent navigate listener', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  // Register a listener that stays — like HyperFrameset does
  await page.evaluate(async () => {
    navigation.addEventListener('navigate', (e) => {
      if (!e.canIntercept) return;
      if (e.navigationType === 'push' || e.navigationType === 'replace') {
        e.intercept({ handler: async () => {} });
      }
    });
    // Trigger one navigation
    await navigation.navigate(document.URL, { history: 'replace' }).finished;
  });
  // Does Playwright still work?
  const result = await page.evaluate(() => document.title);
  expect(result).toBe('Navigation Test');
});

test('page.waitForFunction works with persistent navigate listener', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(async () => {
    navigation.addEventListener('navigate', (e) => {
      if (!e.canIntercept) return;
      if (e.navigationType === 'push' || e.navigationType === 'replace') {
        e.intercept({ handler: async () => {} });
      }
    });
    await navigation.navigate(document.URL, { history: 'replace' }).finished;
    document.body.innerHTML = '<div id="target">found</div>';
  });
  await page.waitForFunction(() => document.getElementById('target'), { timeout: 2000 });
  const text = await page.locator('#target').textContent();
  expect(text).toBe('found');
});

test('Playwright click works after history.replaceState', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(() => {
    document.body.innerHTML = '<a href="#" id="testlink">click me</a>';
    history.replaceState({ test: true }, '', document.URL);
  });
  await page.locator('#testlink').click({ timeout: 2000 });
});

test('Playwright click works after navigation.navigate with intercept', async ({ page, browserName }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(async () => {
    document.body.innerHTML = '<a href="#" id="testlink">click me</a>';
    let handler = (e) => {
      e.intercept({ handler: async () => {} });
    };
    navigation.addEventListener('navigate', handler);
    await navigation.navigate(document.URL, { history: 'replace' }).finished;
    navigation.removeEventListener('navigate', handler);
  });
  await page.locator('#testlink').click({ timeout: 5000 });
});

test('history.replaceState triggers navigate event', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(() => {
    let fired = false;
    let type = null;
    navigation.addEventListener('navigate', (e) => {
      fired = true;
      type = e.navigationType;
    }, { once: true });
    history.replaceState({ test: true }, '', document.URL);
    return { fired, type };
  });
});

test('e.intercept() prevents full navigation on native link click', async ({ page, browserName }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(() => {
    document.body.innerHTML = '<a href="/test/fixtures/normal.html?navigated" id="navlink">go</a>';
    window.__marker = true;
    navigation.addEventListener('navigate', (e) => {
      if (e.canIntercept && e.navigationType === 'push') {
        e.intercept({ handler: async () => {} });
      }
    });
  });
  await page.locator('#navlink').click({ force: true });
  // Give it a moment to settle
  await page.waitForTimeout(500);
  // If intercept worked, page wasn't destroyed and marker survives
  const result = await page.evaluate(() => ({
    marker: window.__marker,
    url: document.URL
  })).catch(() => ({ marker: undefined, url: 'destroyed' }));
  expect(result.marker).toBe(true);
  expect(result.url).toContain('?navigated');
});

test('e.intercept() prevents navigation on JS el.click()', async ({ page }) => {
  await page.goto('/test/fixtures/normal.html');
  const result = await page.evaluate(async () => {
    document.body.innerHTML = '<a href="/test/fixtures/normal.html?jsclick" id="navlink">go</a>';
    window.__marker = true;
    navigation.addEventListener('navigate', (e) => {
      if (e.canIntercept && e.navigationType === 'push') {
        e.intercept({ handler: async () => {} });
      }
    });
    document.getElementById('navlink').click();
    await new Promise(resolve => setTimeout(resolve, 200));
    return { marker: window.__marker, url: document.URL };
  });
  expect(result.marker).toBe(true);
  expect(result.url).toContain('?jsclick');
});

test('page.url() matches document.URL after intercepted navigation', async ({ page, browserName }) => {
  await page.goto('/test/fixtures/normal.html');
  await page.evaluate(async () => {
    document.body.innerHTML = '<a href="/test/fixtures/normal.html?clicked" id="navlink">go</a>';
    navigation.addEventListener('navigate', (e) => {
      if (e.canIntercept && e.navigationType === 'push') {
        e.intercept({ handler: async () => {} });
      }
    });
    document.getElementById('navlink').click();
    await new Promise(resolve => setTimeout(resolve, 200));
  });
  const playwrightUrl = page.url();
  const browserUrl = await page.evaluate(() => document.URL);
  expect(browserUrl).toContain('?clicked');
  expect(playwrightUrl).toBe(browserUrl);
});
