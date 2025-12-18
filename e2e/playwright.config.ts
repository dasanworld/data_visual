import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration
 *
 * Tests run against Django serving static files (collectstatic)
 * to match actual deployment environment.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially for E2E
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for E2E tests
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    // Base URL for Django server
    baseURL: process.env.BASE_URL || 'http://localhost:8000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Timeout settings
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration (optional - if you want Playwright to start Django)
  // Uncomment if you want auto-start of Django server
  // webServer: {
  //   command: 'cd ../backend && python manage.py runserver',
  //   url: 'http://localhost:8000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
