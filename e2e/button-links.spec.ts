import { test, expect } from "@playwright/test";

test.describe("홈페이지 버튼/링크 연결", () => {
  test("히어로 '채용공고 보기' 버튼 → /jobs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "채용공고 보기" }).click();
    await expect(page).toHaveURL("/jobs");
  });

  test("히어로 '회원가입' 버튼 → /signup", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "회원가입" }).click();
    await expect(page).toHaveURL("/signup");
  });

  test("최근 채용공고 '전체보기' 버튼 → /jobs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "전체보기" }).click();
    await expect(page).toHaveURL("/jobs");
  });
});

test.describe("헤더 네비게이션 링크", () => {
  test("로고 클릭 → /", async ({ page }) => {
    await page.goto("/jobs");
    await page.getByRole("link", { name: "Humend HR" }).click();
    await expect(page).toHaveURL("/");
  });

  test("'채용공고' 링크 → /jobs", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await header.getByRole("link", { name: "채용공고" }).click();
    await expect(page).toHaveURL("/jobs");
  });

  test("'사업소개' 링크 → /about", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await header.getByRole("link", { name: "사업소개" }).click();
    await expect(page).toHaveURL("/about");
  });

  test("'로그인' 버튼 → /login", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await header.getByRole("link", { name: "로그인" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("'회원가입' 버튼 → /signup", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await header.getByRole("link", { name: "회원가입" }).click();
    await expect(page).toHaveURL("/signup");
  });
});

test.describe("푸터 링크", () => {
  test("'사업소개' 링크 → /about", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: "사업소개" }).click();
    await expect(page).toHaveURL("/about");
  });

  test("'채용공고' 링크 → /jobs", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: "채용공고" }).click();
    await expect(page).toHaveURL("/jobs");
  });
});

test.describe("로그인 페이지 링크", () => {
  test("'회원가입' 링크 → /signup", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("main").getByRole("link", { name: "회원가입" }).click();
    await expect(page).toHaveURL("/signup");
  });
});

test.describe("회원가입 페이지 링크", () => {
  test("'로그인' 링크 → /login", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("main").getByRole("link", { name: "로그인" }).click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("사업소개 페이지 버튼/링크", () => {
  test("'회원가입' 버튼 → /signup", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("main").getByRole("link", { name: "회원가입" }).click();
    await expect(page).toHaveURL("/signup");
  });

  test("'채용공고 보기' 버튼 → /jobs", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("link", { name: "채용공고 보기" }).click();
    await expect(page).toHaveURL("/jobs");
  });
});

test.describe("채용공고 페이지 링크", () => {
  test("필터 초기화 시 /jobs로 돌아옴", async ({ page }) => {
    await page.goto("/jobs?region=서울");
    const resetBtn = page.getByRole("link", { name: "필터 초기화" });
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await expect(page).toHaveURL("/jobs");
    }
  });
});

test.describe("페이지 접근성 (각 공개 페이지 200 응답)", () => {
  const publicPages = [
    { path: "/", name: "홈" },
    { path: "/jobs", name: "채용공고" },
    { path: "/about", name: "사업소개" },
    { path: "/login", name: "로그인" },
    { path: "/signup", name: "회원가입" },
    { path: "/admin/login", name: "관리자 로그인" },
  ];

  for (const pg of publicPages) {
    test(`${pg.name} (${pg.path}) 페이지가 정상 로드된다`, async ({ page }) => {
      const response = await page.goto(pg.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("header")).toBeVisible();
    });
  }
});
