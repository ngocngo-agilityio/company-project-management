import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Real backend and database (see playwright.config.ts). Each test makes its own Super Admin and its own
// invited emails, so parallel tests never read each other's data.

/** Signs a new Super Admin in through the test-only route and opens the People screen. */
async function signInAsSuperAdminOnPeople(page: Page) {
  const email = `e2e-${randomUUID()}@example.com`;
  const res = await page.request.post("/api/test/login", { data: { email, isSuperAdmin: true } });
  expect(res.status()).toBe(200);
  await page.goto("/people");
  await expect(page.getByRole("heading", { level: 1, name: "People" })).toBeVisible();
}

test("@real a Super Admin invites a person, sees the link and finds the invitation in the list", async ({ page }) => {
  await signInAsSuperAdminOnPeople(page);
  const invited = `invited-${randomUUID()}@example.com`;

  await page.getByRole("button", { name: "Invite a person" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email (Google account)").fill(invited);
  await dialog.getByRole("button", { name: "Create invitation" }).click();

  await expect(dialog.getByText("Invitation created")).toBeVisible();
  await expect(dialog.getByLabel("Invitation link")).toHaveValue(/\/login$/);
  await dialog.getByRole("button", { name: "Done" }).click();

  const row = page.getByRole("row").filter({ hasText: invited });
  await expect(row).toContainText("Pending");
  await expect(row).toContainText("No project");
  await expect(row.getByRole("button", { name: `Copy link: ${invited}` })).toBeVisible();
});

test("@real inviting the same email twice is refused and Resend keeps the invitation Pending", async ({ page }) => {
  await signInAsSuperAdminOnPeople(page);
  const invited = `invited-${randomUUID()}@example.com`;

  async function invite() {
    await page.getByRole("button", { name: "Invite a person" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email (Google account)").fill(invited);
    await dialog.getByRole("button", { name: "Create invitation" }).click();
    return dialog;
  }

  const first = await invite();
  await first.getByRole("button", { name: "Done" }).click();

  const second = await invite();
  await expect(second.getByRole("alert")).toContainText("pending invitation");
  await second.getByRole("button", { name: "Cancel" }).click();

  const row = page.getByRole("row").filter({ hasText: invited });
  await row.getByRole("button", { name: `Resend: ${invited}` }).click();
  await expect(row).toContainText("Pending");
  await expect(row.getByRole("button", { name: `Resend: ${invited}` })).toBeEnabled();
});

test("@real a Super Admin finds the People link in the Admin section of the menu", async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const res = await page.request.post("/api/test/login", { data: { email, isSuperAdmin: true } });
  expect(res.status()).toBe(200);
  await page.goto("/projects");
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "People" }).click();
  await expect(page).toHaveURL(/\/people$/);
  await expect(page.getByRole("heading", { level: 1, name: "People" })).toBeVisible();
});
