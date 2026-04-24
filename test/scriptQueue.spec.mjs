import { test, expect } from '@playwright/test';

test.describe('scriptQueue', () => {
  test('executes inline scripts in order', async ({ page }) => {
    await page.goto('http://localhost:3000/demo/normal.html?dev');
    
    const results = await page.evaluate(async () => {
      // Wait for HyperFrameset to load
      while (!window.Meeko?.scriptQueue) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      window.results = [];
      const scriptQueue = window.Meeko.scriptQueue;
      
      // Create test scripts
      const script1 = document.createElement('script');
      script1.type = 'text/javascript?disabled';
      script1.text = 'window.results.push(1);';
      document.body.appendChild(script1);
      
      const script2 = document.createElement('script');
      script2.type = 'text/javascript?disabled';
      script2.text = 'window.results.push(2);';
      document.body.appendChild(script2);
      
      // Queue and execute
      await scriptQueue.push(script1);
      await scriptQueue.push(script2);
      
      return window.results;
    });
    
    expect(results).toEqual([1, 2]);
  });

  test('handles script loading errors', async ({ page }) => {
    await page.goto('http://localhost:3000/demo/normal.html?dev');
    
    const errorThrown = await page.evaluate(async () => {
      const scriptQueue = window.Meeko.scriptQueue;
      
      const script = document.createElement('script');
      script.type = 'text/javascript?disabled';
      script.src = '/nonexistent.js';
      document.body.appendChild(script);
      
      try {
        await scriptQueue.push(script);
        return false;
      } catch (e) {
        return true;
      }
    });
    
    expect(errorThrown).toBe(true);
  });

  test('empty() waits for all scripts', async ({ page }) => {
    await page.goto('http://localhost:3000/demo/normal.html?dev');
    
    await page.evaluate(async () => {
      // Wait for HyperFrameset to load
      while (!window.Meeko?.scriptQueue) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      window.completed = false;
      const scriptQueue = window.Meeko.scriptQueue;
      
      const script = document.createElement('script');
      script.type = 'text/javascript?disabled';
      script.text = 'setTimeout(() => { if (window.completed !== undefined) window.completed = true; }, 50);';
      document.body.appendChild(script);
      
      scriptQueue.push(script);
      await scriptQueue.empty();
    });
    
    await page.waitForTimeout(100);
    const completed = await page.evaluate(() => window.completed);
    expect(completed).toBe(true);
  });
});