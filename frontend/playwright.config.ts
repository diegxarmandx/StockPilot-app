import { defineConfig, devices } from '@playwright/test'

// These tests create and update records. Never run against a backend using live Supabase data.
if (process.env.E2E_ALLOW_WRITES !== 'true') {
  throw new Error(
    'Set E2E_ALLOW_WRITES=true only after starting a backend with a disposable local database.',
  )
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } },
  ],
})
