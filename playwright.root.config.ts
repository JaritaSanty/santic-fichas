import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

// Producción usa subdominio (basePath vacío); este proyecto evita que solo se pruebe con /fichas.
export default defineConfig({
  testDir: 'tests/e2e-root',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}/`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium-root', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `NEXT_PUBLIC_BASE_PATH= NEXT_PUBLIC_ADS_PLACEHOLDER=true node scripts/build.mjs && NEXT_PUBLIC_BASE_PATH= PORT=${PORT} node scripts/serve-out.mjs`,
    url: `http://localhost:${PORT}/es/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
