import { test, expect } from "@playwright/test";

test.describe("보호된 라우트 (비로그인)", () => {
  test("비로그인 시 /my 접근하면 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/my");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비로그인 시 /my/applications 접근하면 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/my/applications");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비로그인 시 /admin 접근하면 /admin/login으로 리다이렉트", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("비로그인 시 /admin/members 접근하면 /admin/login으로 리다이렉트", async ({ page }) => {
    await page.goto("/admin/members");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("비로그인 시 /admin/clients 접근하면 /admin/login으로 리다이렉트", async ({ page }) => {
    await page.goto("/admin/clients");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("비로그인 시 /admin/applications 접근하면 /admin/login으로 리다이렉트", async ({ page }) => {
    await page.goto("/admin/applications");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  // Phase 2: 급여/계약 관련 보호 라우트
  test("비로그인 시 /my/history 접근하면 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/my/history");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비로그인 시 /my/salary 접근하면 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/my/salary");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비로그인 시 /my/contracts 접근하면 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/my/contracts");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비로그인 시 /admin/payroll 접근하면 /admin/login으로 리다이렉트", async ({ page }) => {
    await page.goto("/admin/payroll");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("비로그인 시 /admin/contracts 접근하면 /admin/login으로 리다이렉트", async ({ page }) => {
    await page.goto("/admin/contracts");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
