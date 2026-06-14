import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Un worker: il dev server compila le route on-demand; la parallelizzazione
  // causa contesa sui cold-start e flakiness.
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  // Timeout generosi: in dev la prima richiesta compila le route on-demand.
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Build di produzione: route precompilate → niente cold-compile, e2e stabile.
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      ...process.env,
      // Solo per i test: la registrazione autentica subito e i cookie non sono Secure.
      AUTH_REQUIRE_EMAIL_VERIFICATION: "false",
      AUTH_DISABLE_SECURE_COOKIES: "true",
    },
  },
});
