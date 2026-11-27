import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Real backend and database (see playwright.config.ts). Each test makes its own Super Admin and its own
// project names, so parallel tests never read each other's data.

/** Signs a new Super Admin in through the test-only route and lands on Projects. */
async function signInAsSuperAdmin(page: Page) {
  const email = `e2e-${randomUUID()}@example.com`;
  const res = await page.request.post("/api/test/login", { data: { email, isSuperAdmin: true } });
  expect(res.status()).toBe(200);
  await page.goto("/projects");
  return email;
}

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

/** Under 900px the sidebar is a drawer: open it first. */
async function openMenuIfCollapsed(page: Page) {
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
}

test("@real a Super Admin signs in, stays signed in after a reload, and signs out", async ({ page }) => {
  const email = await signInAsSuperAdmin(page);
  await expect(heading(page, "Projects")).toBeVisible();

  await page.reload();
  await expect(heading(page, "Projects")).toBeVisible();

  await openMenuIfCollapsed(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  const me = await page.request.get("/api/me");
  expect(me.status()).toBe(401);
  await expect(page.getByText(email)).toHaveCount(0);
});

test("@real a Super Admin creates a project and sees it in the list", async ({ page }) => {
  await signInAsSuperAdmin(page);
  const name = `E2E ${randomUUID().slice(0, 8)}`;

  await page.getByRole("button", { name: "Create project" }).first().click();
  await page.getByLabel("Project name").fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
});

test("@real a person who is not signed in is sent to /login", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login$/);
});

test("@real the test login route refuses an unknown person who is not a Super Admin", async ({ page }) => {
  const res = await page.request.post("/api/test/login", { data: { email: `e2e-${randomUUID()}@example.com` } });
  expect(res.status()).toBe(404);
});
