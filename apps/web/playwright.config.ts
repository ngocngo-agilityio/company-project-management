import { defineConfig, devices } from "@playwright/test";

// Two kinds of spec share this config:
// - mocked specs (the default): the API is mocked with `page.route`, run at three widths;
// - real specs, tagged `@real` in the title: the real backend and a real Postgres, run at one width.
// Own ports: they never clash with `pnpm dev` (5173 and 3000).
const WEB_PORT = 5174;
const API_PORT = 3100;
const WEB_URL = `http://localhost:${WEB_PORT}`;

// The database for real specs, created and migrated by `pnpm e2e` (apps/backend/scripts/e2e-db.ts).
// Always local; same default as that script. CI overrides it with E2E_DATABASE_URL.
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  `postgresql://board:board_local_dev@127.0.0.1:${process.env.DB_PORT || 5432}/board_e2e`;

/** Widths from the Plan: phone, tablet, computer. */
const WIDTHS = { w360: 360, w768: 768, w1024: 1024 } as const;
const HEIGHT = 800;
const REAL = /@real/;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    ...Object.entries(WIDTHS).map(([name, width]) => ({
      name,
      grepInvert: REAL,
      use: { ...devices["Desktop Chrome"], viewport: { width, height: HEIGHT } },
    })),
    {
      name: "real",
      grep: REAL,
      use: { ...devices["Desktop Chrome"], viewport: { width: WIDTHS.w1024, height: HEIGHT } },
    },
  ],
  webServer: [
    {
      // The real backend. `E2E=1` adds POST /api/test/login; the server refuses it on Render, in
      // production and with a database that is not local. Google values are placeholders: no
      // request goes to Google, the real specs sign in through the test route.
      command: "pnpm --filter @board/backend exec tsx src/server.ts",
      url: `http://127.0.0.1:${API_PORT}/health`,
      // Never reuse: a leftover server on these own ports could point at another backend or database.
      reuseExistingServer: false,
      env: {
        E2E: "1",
        PORT: String(API_PORT),
        HOST: "127.0.0.1",
        DATABASE_URL,
        WEB_ORIGIN: WEB_URL,
        COOKIE_CROSS_SITE: "0",
        TRUST_PROXY: "0",
        GOOGLE_CLIENT_ID: "e2e-placeholder",
        GOOGLE_CLIENT_SECRET: "e2e-placeholder",
        GOOGLE_REDIRECT_URI: `http://localhost:${API_PORT}/auth/google/callback`,
      },
    },
    {
      // Vite proxies /api, /auth and /health to the backend above (the proxy reads PORT and HOST).
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      url: `${WEB_URL}/login`,
      // Never reuse: a leftover server on these own ports could point at another backend or database.
      reuseExistingServer: false,
      env: { PORT: String(API_PORT), HOST: "127.0.0.1" },
    },
  ],
});
