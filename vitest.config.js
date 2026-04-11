import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs'],
    
    // Browser testing configuration
    browser: {
      enabled: false, // Enable with --browser flag
      provider: playwright(),
      instances: [
        {
          browser: 'chromium',
        },
        {
          browser: 'firefox',
        },
        {
          browser: 'webkit', // Safari
        }
      ],
    }
  }
});
