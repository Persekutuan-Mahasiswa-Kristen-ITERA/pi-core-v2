import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, PASSWORD, RUN, login, logout } from "./helpers";

async function totalMembers(page: Page) {
  await page.goto("/");
  const card = page.locator("div", { has: page.getByText("Total Members", { exact: true }) }).last();
  const text = await card.locator("p").last().innerText();
  return Number(text.replace(/,/g, ""));
}

test("period → role → member → assignment, reflected on dashboard and role detail", async ({ page }) => {
  const year = 2100 + (Date.now() % 700);
  const periodLabel = `${year}/${year + 1}`;
  const roleName = `E2E Role ${RUN}`;
  const memberName = `E2E Member${RUN}`;
  const memberEmail = `e2e-${RUN}@example.com`;

  await login(page, ADMIN_EMAIL, PASSWORD);
  await expect(page.getByText("Shalom Admin!")).toBeVisible();
  const before = await totalMembers(page);

  // Period (not activated: the active period stays the seed's 2026/2027)
  await page.goto("/periods/new");
  await page.getByLabel("Academic year").fill(periodLabel);
  await page.getByRole("button", { name: "Create period" }).click();
  await expect(page).toHaveURL(/\/periods$/);
  await expect(page.getByText(periodLabel, { exact: true })).toBeVisible();

  // Role
  await page.goto("/roles/new");
  await page.getByLabel("Role name").fill(roleName);
  await page.getByRole("button", { name: "Create role" }).click();
  await expect(page.getByRole("heading", { name: roleName })).toBeVisible();

  // Member, with a one-time temporary password
  await page.goto("/members/new");
  await page.getByLabel("Full name").fill(memberName);
  await page.getByLabel("Email").fill(memberEmail);
  await page.getByRole("button", { name: "Create member" }).click();
  await expect(page.getByText(`Temporary password for ${memberEmail}`)).toBeVisible();
  const tempPassword = (await page.locator("code").innerText()).trim();
  expect(tempPassword).toMatch(/^[A-Za-z0-9]{14}$/);

  // Assignment: member is preselected; create a new position inline; active period is the default
  await page.getByRole("link", { name: "Assign a role" }).click();
  await expect(page).toHaveURL(/\/assignments\?member=/);
  await page.getByLabel("Role", { exact: true }).selectOption({ label: roleName });
  await page.getByLabel("Position", { exact: true }).selectOption("__new");
  await page.getByLabel("New position name").fill("Koordinator");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Assignment added.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: memberName }).filter({ hasText: "Koordinator" })).toBeVisible();

  // Duplicate is rejected with a clear message
  await page.goto(`/assignments`);
  await page.getByLabel("Member", { exact: true }).selectOption({ label: `${memberName} · ${memberEmail}` });
  await page.getByLabel("Role", { exact: true }).selectOption({ label: roleName });
  await page.getByLabel("Position", { exact: true }).selectOption({ label: "Koordinator" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This member already holds that role and position in that period.")).toBeVisible();

  // Role card + detail reflect the assignment in the active period
  await page.goto("/roles");
  const card = page.getByRole("link", { name: new RegExp(roleName, "i") });
  await expect(card).toContainText("1");
  await card.click();
  await expect(page.getByRole("listitem").filter({ hasText: memberName })).toContainText("Koordinator");

  // Deleting a role that has assignments is blocked with an explanation
  await page.getByRole("button", { name: "Delete Role" }).click();
  await expect(page.getByText(/still has 1 assignment/)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  // Dashboard count uses real data
  expect(await totalMembers(page)).toBe(before + 1);

  // Members search finds the new member
  await page.goto(`/members?q=${encodeURIComponent(memberName)}`);
  await expect(page.getByRole("link", { name: memberName, exact: true })).toBeVisible();
  await logout(page);

  // First login with the temporary password forces a password change
  await page.getByLabel("Email").fill(memberEmail);
  await page.getByLabel("Password").fill(tempPassword);
  await page.getByRole("button", { name: "LOG IN" }).click();
  await expect(page).toHaveURL(/\/change-password$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel("Temporary password").fill(tempPassword);
  await page.getByLabel("New password", { exact: true }).fill(`Changed${RUN}9`);
  await page.getByLabel("Confirm new password").fill(`Changed${RUN}9`);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText(`Shalom E2E!`)).toBeVisible();
  await expect(page.getByText(roleName)).toBeVisible();
  await expect(page.getByText("Koordinator")).toBeVisible();
  await logout(page);
});

test("admin deactivates a member after confirmation; the member can no longer log in", async ({ page }) => {
  const email = `e2e-deact-${RUN}@example.com`;
  await login(page, ADMIN_EMAIL, PASSWORD);
  await expect(page.getByText("Shalom Admin!")).toBeVisible();
  await page.goto("/members/new");
  await page.getByLabel("Full name").fill(`Deact ${RUN}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Create member" }).click();
  const tempPassword = (await page.locator("code").innerText()).trim();

  await page.goto(`/members?q=${encodeURIComponent(`Deact ${RUN}`)}`);
  await page.getByRole("button", { name: `Deactivate Deact ${RUN}` }).click();
  await expect(page.getByRole("alertdialog")).toContainText("They will no longer be able to log in");
  await page.getByRole("alertdialog").getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText("Member deactivated.")).toBeVisible();
  await logout(page);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(tempPassword);
  await page.getByRole("button", { name: "LOG IN" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
});
