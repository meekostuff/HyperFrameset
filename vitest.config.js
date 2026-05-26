import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs'],
    sequence: { sequential: true },
    fileParallelism: false,
    
    // Browser testing configuration
    browser: {
      enabled: true,
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
