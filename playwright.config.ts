import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against a production build (`next start`) and the LOCAL Supabase.
 * Needs: `pnpm db:start`, `pnpm seed:dev-users` (with SEED_PASSWORD), `pnpm build`, and
 * E2E_PASSWORD set to the same SEED_PASSWORD.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Animations off: counters show their final value at once and nothing moves under a click.
    reducedMotion: "reduce",
    // The suite reads the English copy; Indonesian is the app default (see src/lib/i18n).
    storageState: {
      cookies: [
        {
          name: "pi-lang",
          value: "en",
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  },
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
