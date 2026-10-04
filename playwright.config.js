const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 15000
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 15000,
    video: 'off',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'node server/src/server.js',
      url: 'http://localhost:5000/health',
      timeout: 30000,
      reuseExistingServer: true
    },
    {
      command: 'npm run dev --prefix client',
      url: 'http://localhost:3000',
      timeout: 30000,
      reuseExistingServer: true
    }
  ]
});
