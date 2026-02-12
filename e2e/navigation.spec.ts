import { test, expect } from "@playwright/test";

test.describe("네비게이션", () => {
  test("헤더 로고 클릭 시 홈으로 이동", async ({ page }) => {
    await page.goto("/jobs");
    await page.getByRole("link", { name: "Humend HR" }).click();
    await expect(page).toHaveURL("/");
  });

  test("비로그인 시 로그인/회원가입 버튼이 보인다", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "로그인" })).toBeVisible();
    await expect(header.getByRole("link", { name: "회원가입" })).toBeVisible();
  });

  test("채용공고 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.locator("h1")).toContainText("채용공고");
  });

  test("소개 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveURL("/about");
  });
});
