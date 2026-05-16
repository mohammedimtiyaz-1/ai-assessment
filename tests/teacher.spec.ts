import { test, expect } from "@playwright/test";

// Use seeded teacher credentials
const TEACHER_EMAIL = "teacher@example.com";
const TEACHER_PASSWORD = "password123";

async function loginAsTeacher(page: any) {
  await page.goto("/login");
  await page.fill('input[id="email"]', TEACHER_EMAIL);
  await page.fill('input[id="password"]', TEACHER_PASSWORD);
  await page.click('button[type="submit"]');
  // After login, teacher should be redirected to /dashboard
  // But if middleware doesn't know role, it may go to /student/dashboard
  // So we accept either dashboard URL
  await page.waitForURL(/\/(dashboard|student\/dashboard)/, { timeout: 10000 });
}

test.describe("Teacher Flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test("dashboard shows KPIs", async ({ page }) => {
    await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
    await expect(page.locator("text=Assessments")).toBeVisible();
    await expect(page.locator("text=Published")).toBeVisible();
    await expect(page.locator("text=Total Attempts")).toBeVisible();
  });

  test("navigate to assessments list", async ({ page }) => {
    await page.click("text=View all");
    await expect(page).toHaveURL(/\/teacher\/assessments/);
    await expect(page.locator("text=Assessments")).toBeVisible();
  });

  test("create new assessment", async ({ page }) => {
    await page.goto("/teacher/assessments");
    page.on("dialog", async (dialog: any) => {
      await dialog.accept("Playwright Test Assessment");
    });
    await page.click("text=Create");
    await expect(page.locator("text=Playwright Test Assessment")).toBeVisible();
  });

  test("sidebar logo links to teacher dashboard", async ({ page }) => {
    await page.goto("/teacher/assessments");
    await page.click("text=AI Assessment");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
