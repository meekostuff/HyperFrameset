import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: 'test/**/*.spec.mjs',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node server.js',
    port: 3000,
    reuseExistingServer: true,
  },
});
