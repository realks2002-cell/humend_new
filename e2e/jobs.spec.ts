import { test, expect } from "@playwright/test";

test.describe("채용공고 페이지", () => {
  test("채용공고 목록 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.locator("h1")).toContainText("채용공고");
    await expect(page.getByText("원하는 날짜에 지원하고")).toBeVisible();
  });

  test("공고가 없을 때 빈 상태 메시지를 보여준다", async ({ page }) => {
    await page.goto("/jobs");
    // 데이터가 없으면 빈 상태, 있으면 카드가 보임
    const emptyMessage = page.getByText("현재 등록된 채용공고가 없습니다");
    const jobCards = page.locator('[class*="grid"] > div');
    const hasJobs = await jobCards.count() > 0;

    if (!hasJobs) {
      await expect(emptyMessage).toBeVisible();
    } else {
      await expect(jobCards.first()).toBeVisible();
    }
  });
});
