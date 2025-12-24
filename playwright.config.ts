import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration for ChordBoy
 *
 * Chromium-only, visual regression testing enabled, 2% flake tolerance
 */
export default defineConfig({
  testDir: './e2e/tests',

  // Parallel execution for speed
  fullyParallel: true,

  // Strict CI settings
  forbidOnly: !!process.env.CI,

  // 2% flake tolerance: Allow 2 retries in CI (success rate: 98%+)
  retries: process.env.CI ? 2 : 1,

  // Workers
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],

  // Global test settings
  use: {
    // Base URL for the app
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Tracing and debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Enable Web MIDI API (Chromium flag)
    launchOptions: {
      args: [
        '--enable-features=WebMIDI',
        '--autoplay-policy=no-user-gesture-required',  // Allow Web Audio autoplay
      ],
    },

    // Permissions
    permissions: ['midi'],

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test timeout (2 minutes per test)
  timeout: 120000,

  // Expect timeout (assertions)
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      // Visual regression settings
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  // Projects (browser configurations)
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro'],
      },
    },
  ],

  // Web server (dev server for testing)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
