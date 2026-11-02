import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, PASSWORD, POSITION_ADMIN_EMAIL, RUN, login, logout } from "./helpers";

async function totalMembers(page: Page) {
  await page.goto("/");
  const figure = page.locator("div", { has: page.locator("dt", { hasText: "Total Members" }) }).last();
  // "7 2 dosen": the count, then a note.
  const text = await figure.locator("dd").innerText();
  return Number(text.trim().split(/\s+/)[0].replace(/[.,]/g, ""));
}

test("super admin: role → position → member → assignment, reflected on dashboard and role detail", async ({ page }) => {
  const year = 2100 + (Date.now() % 700);
  const periodLabel = `${year}/${year + 1}`;
  const roleName = `E2E Role ${RUN}`;
  const positionName = `E2E Koordinator ${RUN}`;
  const memberName = `E2E Member${RUN}`;
  const memberEmail = `e2e-${RUN}@example.com`;

  await login(page, ADMIN_EMAIL, PASSWORD);
  await expect(page.getByRole("heading", { name: "Shalom Admin!" })).toBeVisible();
  const before = await totalMembers(page);

  // Period (not activated: the active period stays the seed's 2026/2027)
  await page.goto("/periods/new");
  await page.getByLabel("Academic year").fill(periodLabel);
  await page.getByRole("button", { name: "Create period" }).click();
  await expect(page).toHaveURL(/\/periods$/);
  await expect(page.getByText(periodLabel, { exact: true })).toBeVisible();

  // Role (super admin only)
  await page.goto("/roles/new");
  await page.getByLabel("Role name").fill(roleName);
  await page.getByRole("button", { name: "Create role" }).click();
  await expect(page.getByRole("heading", { name: roleName })).toBeVisible();

  // Position for divisions, carrying the new role
  await page.goto("/structure/positions/new");
  await page.getByLabel("Position name").fill(positionName);
  await page.getByLabel("Kind of unit").selectOption({ label: "Division" });
  await page.getByLabel("Rank").fill("65");
  await page.getByRole("checkbox", { name: roleName }).check();
  await page.getByRole("button", { name: "Create position" }).click();
  await expect(page).toHaveURL(/\/structure$/);
  await expect(page.getByRole("main").getByRole("listitem").filter({ hasText: positionName })).toContainText(roleName);

  // Member, with a one-time temporary password
  await page.goto("/members/new");
  await page.getByLabel("Full name").fill(memberName);
  await page.getByLabel("Email").fill(memberEmail);
  await page.getByRole("button", { name: "Create member" }).click();
  await expect(page.getByText(`Temporary password for ${memberEmail}`)).toBeVisible();
  const tempPassword = (await page.locator("code").innerText()).trim();
  expect(tempPassword).toMatch(/^[A-Za-z0-9]{14}$/);

  // Assignment: member is preselected; positions follow the chosen unit; active period is the default
  await page.getByRole("link", { name: "Assign a position" }).click();
  await expect(page).toHaveURL(/\/assignments\?member=/);
  await page.getByLabel("Unit", { exact: true }).selectOption({ label: "Musik" });
  await expect(
    page.getByLabel("Position", { exact: true }).locator("option", { hasText: "Kepala Departemen" }),
  ).toHaveCount(0);
  await page.getByLabel("Position", { exact: true }).selectOption({ label: positionName });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Assignment added.")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: memberName }).filter({ hasText: positionName }),
  ).toBeVisible();

  // Duplicate is rejected with a clear message
  await page.goto(`/assignments`);
  await page.getByLabel("Member", { exact: true }).selectOption({ label: `${memberName} · ${memberEmail}` });
  await page.getByLabel("Unit", { exact: true }).selectOption({ label: "Musik" });
  await page.getByLabel("Position", { exact: true }).selectOption({ label: positionName });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This member already holds that position in that unit and period.")).toBeVisible();

  // Role card + detail reflect the assignment in the active period
  await page.goto("/roles");
  const card = page.getByRole("link", { name: new RegExp(roleName, "i") });
  await expect(card).toContainText("1");
  await card.click();
  await expect(page.getByRole("listitem").filter({ hasText: memberName })).toContainText(positionName);

  // Deleting a position that has assignments is blocked with an explanation
  await page.goto("/structure");
  await page.getByRole("link", { name: `Edit ${positionName}` }).click();
  await page.getByRole("button", { name: "Delete position" }).click();
  await expect(page.getByText(/1 assignment\(s\) use this position/)).toBeVisible();
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
  await expect(page.getByRole("heading", { name: `Shalom E2E!` })).toBeVisible();
  await expect(page.getByText(positionName, { exact: true })).toBeVisible();
  await expect(page.getByText("Musik · Departemen Pelayanan Khusus")).toBeVisible();
  await logout(page);
});

test("super admin creates a dosen (pembina) with NIP; dosen are not offered for positions", async ({ page }) => {
  const name = `E2E Dosen ${RUN}`;
  await login(page, ADMIN_EMAIL, PASSWORD);
  await expect(page.getByRole("heading", { name: "Shalom Admin!" })).toBeVisible();
  await page.goto("/members/new");
  await page.getByRole("radio", { name: /Dosen/ }).check();
  await expect(page.getByLabel("NIM (optional)")).toHaveCount(0);
  await page.getByLabel("NIP / NIDN (optional)").fill(`1980${String(Date.now()).slice(-12)}`); // run-unique, so the suite can re-run on one database;
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(`e2e-dosen-${RUN}@example.com`);
  await page.getByLabel("PI-CORE access").selectOption("super_admin");
  await page.getByRole("button", { name: "Create member" }).click();
  await expect(page.getByText(`Temporary password for e2e-dosen-${RUN}@example.com`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Assign a position" })).toHaveCount(0);

  await page.goto(`/members?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("main").getByRole("listitem").filter({ hasText: name })).toContainText("Super admin");
  await expect(page.getByRole("main").getByRole("listitem").filter({ hasText: name })).toContainText("Dosen");
  await page.goto("/assignments");
  await expect(page.getByLabel("Member", { exact: true }).locator("option", { hasText: name })).toHaveCount(0);
  await logout(page);
});

test("a Kepala Departemen is an admin through their position, but not a super admin", async ({ page }) => {
  await login(page, POSITION_ADMIN_EMAIL, PASSWORD);
  await expect(page.getByRole("heading", { name: "Shalom Yohanes!" })).toBeVisible();
  await expect(page.getByText("Available Roles")).toBeVisible();
  await page.goto("/members");
  await expect(page.getByRole("link", { name: "Create Member" })).toBeVisible();
  // The super admin's account is read-only for them
  await page.goto("/members?q=Admin%20Contoh");
  await page.getByRole("link", { name: "Edit Admin Contoh" }).click();
  await expect(page.getByText("Only another super admin can edit, deactivate or reset this account.")).toBeVisible();
  // Structure and roles are visible but not editable
  await page.goto("/structure");
  await expect(page.getByText("Only a super admin can change them.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Position" })).toHaveCount(0);
  for (const path of ["/roles/new", "/structure/positions/new"]) {
    await page.goto(path);
    await expect(page.getByText("Super admins only")).toBeVisible();
  }
  await logout(page);
});

test("admin deactivates a member after confirmation; the member can no longer log in", async ({ page }) => {
  const email = `e2e-deact-${RUN}@example.com`;
  await login(page, ADMIN_EMAIL, PASSWORD);
  await expect(page.getByRole("heading", { name: "Shalom Admin!" })).toBeVisible();
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
