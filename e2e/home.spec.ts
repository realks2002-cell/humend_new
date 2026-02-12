import { test, expect } from "@playwright/test";

test.describe("홈페이지", () => {
  test("히어로 섹션이 렌더링된다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Humend HR");
    await expect(page.getByRole("link", { name: "채용공고 보기" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "회원가입" })).toBeVisible();
  });

  test("통계 섹션이 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("등록 회원")).toBeVisible();
    await expect(page.getByText("제휴 고객사")).toBeVisible();
    await expect(page.getByText("매칭 완료")).toBeVisible();
  });

  test("서비스 소개 섹션이 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("서비스 소개")).toBeVisible();
    await expect(page.getByText("빠른 매칭")).toBeVisible();
    await expect(page.getByRole("heading", { name: "다양한 현장" })).toBeVisible();
    await expect(page.getByText("투명한 급여")).toBeVisible();
  });

  test("채용공고 보기 클릭 시 /jobs로 이동", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "채용공고 보기" }).click();
    await expect(page).toHaveURL("/jobs");
  });

  test("회원가입 클릭 시 /signup으로 이동", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "회원가입" }).click();
    await expect(page).toHaveURL("/signup");
  });
});
