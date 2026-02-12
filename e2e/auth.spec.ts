import { test, expect } from "@playwright/test";

test.describe("회원가입 페이지", () => {
  test("회원가입 폼이 렌더링된다", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("main").getByText("회원가입")).toBeVisible();
    await expect(page.getByLabel("이름")).toBeVisible();
    await expect(page.getByLabel("전화번호")).toBeVisible();
  });

  test("비밀번호 불일치 시 에러 표시", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("이름").fill("테스트");
    await page.getByLabel("전화번호").fill("01099998888");
    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.nth(0).fill("123456");
    await pwInputs.nth(1).fill("654321");
    await page.getByRole("button", { name: "가입하기" }).click();
    await expect(page.getByText("비밀번호가 일치하지 않습니다", { exact: true })).toBeVisible();
  });

  test("비밀번호 6자리 미만 시 에러 표시", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("이름").fill("테스트");
    await page.getByLabel("전화번호").fill("01099998888");
    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.nth(0).fill("123");
    await pwInputs.nth(1).fill("123");
    await page.getByRole("button", { name: "가입하기" }).click();
    await expect(page.getByText("비밀번호는 숫자 6자리여야 합니다")).toBeVisible();
  });
});

test.describe("로그인 페이지", () => {
  test("로그인 폼이 렌더링된다", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("로그인", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("전화번호")).toBeVisible();
  });

  test("빈 폼 제출 시 에러 표시", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("main").getByRole("button", { name: "로그인" }).click();
    await expect(page.getByText("전화번호와 비밀번호를 입력해주세요")).toBeVisible();
  });
});

test.describe("관리자 로그인 페이지", () => {
  test("관리자 로그인 폼이 렌더링된다", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByText("관리자 로그인", { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder("관리자 아이디")).toBeVisible();
  });
});
