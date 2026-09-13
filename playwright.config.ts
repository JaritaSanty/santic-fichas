import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = '/fichas';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}${BASE}/`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build:e2e && NEXT_PUBLIC_BASE_PATH=${BASE} PORT=${PORT} pnpm serve:out`,
    url: `http://localhost:${PORT}${BASE}/es/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
