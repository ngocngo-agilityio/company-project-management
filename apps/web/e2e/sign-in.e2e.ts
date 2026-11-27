import { expect, test, type Page } from "@playwright/test";

const me = {
  id: "6f1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a11",
  email: "a@example.com",
  name: "A",
  avatarUrl: null,
  isSuperAdmin: false,
};

/** Mocks the API and Google, so no backend or real sign-in is needed. */
async function open(page: Page, path: string, { signedIn = false } = {}) {
  await page.route("**/api/me", (r) => (signedIn ? r.fulfill({ json: me }) : r.fulfill({ status: 401, json: {} })));
  await page.route("**/health", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/auth/google", (r) => r.fulfill({ contentType: "text/html", body: "google" }));
  await page.goto(path);
}

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

/** Under 900px the sidebar is a drawer: open it first. */
async function openMenuIfCollapsed(page: Page) {
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
}

test("a private route goes to /login without a session", async ({ page }) => {
  await open(page, "/projects");
  await expect(page).toHaveURL(/\/login$/);
  await expect(heading(page, "Sign in to Company Board")).toBeVisible();
});

test("Continue with Google goes to /auth/google", async ({ page }) => {
  await open(page, "/login");
  await page.getByRole("link", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(/\/auth\/google$/);
});

for (const [code, title] of [
  ["access_denied", "Sign-in was cancelled."],
  ["oauth_failed", "Sign-in failed."],
] as const) {
  test(`?error=${code} shows "${title}" and Try again`, async ({ page }) => {
    await open(page, `/login?error=${code}`);
    await expect(page.getByRole("alert")).toContainText(title);
    await page.getByRole("link", { name: "Try again" }).click();
    await expect(page).toHaveURL(/\/auth\/google$/);
  });
}

test("?error=rate_limited tells the person to wait, with no Try again", async ({ page }) => {
  await open(page, "/login?error=rate_limited");
  await expect(page.getByRole("alert")).toContainText("Too many sign-in attempts.");
  await expect(page.getByRole("link", { name: "Try again" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Continue with Google" })).toBeVisible();
});

test("a private route shows a placeholder, not bare text, while the session is slow", async ({ page }) => {
  await page.route("**/api/me", async (r) => {
    await new Promise((done) => setTimeout(done, 1500));
    await r.fulfill({ json: me });
  });
  await page.route("**/health", (r) => r.fulfill({ json: { ok: true } }));
  await page.goto("/projects");
  await expect(page.getByRole("status")).toContainText("Loading");
  await expect(page.getByText("Checking your session…")).toHaveCount(0);
  await expect(heading(page, "Projects")).toBeVisible();
});

test("an uninvited email sees the refusal card and can go back", async ({ page }) => {
  await open(page, "/login?error=not_invited");
  await expect(heading(page, "You have not been invited")).toBeVisible();
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page.getByRole("link", { name: "Continue with Google" })).toBeVisible();
});

test("a signed-in person lands on Projects and only the session hint is kept in browser storage", async ({ page }) => {
  await open(page, "/login", { signedIn: true });
  await expect(page).toHaveURL(/\/projects$/);
  await expect(heading(page, "Projects")).toBeVisible();
  // Only a "1" flag, never the person or a token (same rule as the unit test in auth-routes.test.tsx).
  const stored = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(Object.keys(stored.local)).toEqual(["board.sessionHint"]);
  expect(stored.local["board.sessionHint"]).toBe("1");
  expect(Object.keys(stored.session)).toHaveLength(0);
  expect(JSON.stringify(stored)).not.toContain(me.email);
});

for (const [name, size] of [
  ["phone", { width: 375, height: 812 }],
  ["computer", { width: 1280, height: 800 }],
] as const) {
  test(`fits the ${name} screen with 44px buttons`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await open(page, "/login?error=oauth_failed");
    for (const link of ["Continue with Google", "Try again"]) {
      const box = await page.getByRole("link", { name: link }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(name === "phone" ? 44 : 36);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Compare by eye with the Design canvas.
    await page.screenshot({ path: testInfo.outputPath(`sign-in-${name}.png`), fullPage: true });
  });
}

test("Sign out goes to /login and Back does not show private pages", async ({ page }) => {
  let signedIn = true;
  await page.route("**/api/me", (r) =>
    signedIn ? r.fulfill({ json: me }) : r.fulfill({ status: 401, json: { error: "unauthorized" } }),
  );
  await page.route("**/health", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/auth/logout", (r) => {
    signedIn = false;
    return r.fulfill({ status: 204 });
  });
  await page.goto("/projects");
  await expect(heading(page, "Projects")).toBeVisible();

  await openMenuIfCollapsed(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(heading(page, "Sign in to Company Board")).toBeVisible();

  await page.goBack();
  await expect(heading(page, "Projects")).toHaveCount(0);
  await expect(page.getByText(me.email)).toHaveCount(0);
});
