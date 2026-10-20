import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: [
    ['line'],
    ['html', { outputFolder: 'test-reports', open: 'on-failure' }]
  ],
  use: {
    baseURL: 'https://portal.uat.gofive.co.th',
    headless: false,
    launchOptions: { slowMo: 150 },
    viewport: { width: 1366, height: 768 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
    screenshot: 'on',
    video: 'on',
    trace: 'on'
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      }
    }
  ]
});