import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, MEMBER_EMAIL, PASSWORD, login, logout } from "./helpers";

test("unauthenticated visitors are sent to login, keeping a safe return path", async ({ page }) => {
  await page.goto("/members");
  await expect(page).toHaveURL(/\/login\?next=%2Fmembers$/);
  await expect(page.getByRole("heading", { name: "LOGIN" })).toBeVisible();
});

test("login failures do not reveal whether the email exists", async ({ page }) => {
  await login(page, ADMIN_EMAIL, "wrong-password-1");
  const known = page.getByText("Email or password is incorrect.");
  await expect(known).toBeVisible();
  await login(page, "nobody-here@example.com", "wrong-password-1");
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
});

test("an open redirect in ?next is ignored", async ({ page }) => {
  await page.goto("/login?next=//evil.example/steal");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "LOG IN" }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
});

test("admin logs in to the dashboard and logs out", async ({ page }) => {
  await login(page, ADMIN_EMAIL, PASSWORD);
  await expect(page.getByText("Shalom Admin!")).toBeVisible();
  await expect(page.getByText("Total Members")).toBeVisible();
  await expect(page.getByText("Active Period")).toBeVisible();
  await expect(page.getByText("Available Roles")).toBeVisible();
  await logout(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("a regular member cannot open admin screens", async ({ page }) => {
  await login(page, MEMBER_EMAIL, PASSWORD);
  await expect(page.getByText("Shalom Maria!")).toBeVisible();
  for (const path of ["/members", "/roles", "/periods", "/assignments", "/settings", "/members/new"]) {
    await page.goto(path);
    await expect(page.getByText("Admins only")).toBeVisible();
  }
  // Directory is not offered in the bottom navigation.
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Directory" })).toHaveCount(0);
});
