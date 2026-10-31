import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
export const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL ?? "maria@example.com";
export const PASSWORD = process.env.E2E_PASSWORD ?? "";
if (!PASSWORD) throw new Error("Set E2E_PASSWORD to the SEED_PASSWORD used for `pnpm seed:dev-users`.");

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "LOG IN" }).click();
}

export async function logout(page: Page) {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** A run-unique suffix so the suite can be re-run against the same local database. */
export const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
