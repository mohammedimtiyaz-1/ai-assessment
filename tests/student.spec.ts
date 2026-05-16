import { test, expect } from "@playwright/test";

function makeEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLogin(page: any, email: string, password: string) {
  // Register
  await page.goto("/signup");
  await page.fill('input[id="name"]', "Student User");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Login explicitly
  await page.goto("/login");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/student\/dashboard/, { timeout: 10000 });
}

test.describe.serial("Student Flows", () => {
  const TEST_EMAIL = makeEmail("student");
  const TEST_PASSWORD = "password123";

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test("dashboard shows KPIs and empty state", async ({ page }) => {
    await expect(page.locator("text=Student Dashboard")).toBeVisible();
    await expect(page.locator("text=Content")).toBeVisible();
    await expect(page.locator("text=Attempts")).toBeVisible();
    await expect(page.locator("text=Accuracy")).toBeVisible();
    await expect(page.locator("text=No content yet")).toBeVisible();
  });

  test("navigate to upload page", async ({ page }) => {
    await page.click("text=Upload Content");
    await expect(page).toHaveURL(/\/student\/upload/);
    await expect(page.locator("text=Upload")).toBeVisible();
  });

  test("navigate to content library", async ({ page }) => {
    await page.goto("/student/content");
    await expect(page.locator("text=My Content")).toBeVisible();
    await expect(page.locator("text=No content yet")).toBeVisible();
  });

  test("navigate to quiz entry page", async ({ page }) => {
    await page.goto("/student/quiz");
    await expect(page.locator("text=Practice Quiz")).toBeVisible();
  });

  test("navigate to history page", async ({ page }) => {
    await page.goto("/student/history");
    await expect(page.locator("text=History")).toBeVisible();
  });

  test("navigate to progress page", async ({ page }) => {
    await page.goto("/student/progress");
    await expect(page.locator("text=Progress")).toBeVisible();
  });

  test("profile page shows user info", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator("text=Profile")).toBeVisible();
    await expect(page.locator(`text=${TEST_EMAIL}`)).toBeVisible();
  });

  test("settings page shows role", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=Settings")).toBeVisible();
    await expect(page.locator("text=student")).toBeVisible();
  });

  test("sidebar logo links to student dashboard", async ({ page }) => {
    await page.goto("/student/content");
    await page.click("text=AI Assessment");
    await expect(page).toHaveURL(/\/student\/dashboard/);
  });
});
