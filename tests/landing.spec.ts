import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads with correct title and branding", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AI Assessment/);
    await expect(page.locator("text=AI-Powered Assessments")).toBeVisible();
    await expect(page.locator("text=Upload your study materials")).toBeVisible();
  });

  test("has working Get Started and Sign In CTAs", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Get Started");
    await expect(page).toHaveURL(/\/signup/);

    await page.goto("/");
    await page.click("text=Sign In");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=AI Question Generation")).toBeVisible();
    await expect(page.locator("text=Adaptive Quizzes")).toBeVisible();
    await expect(page.locator("text=Progress Tracking")).toBeVisible();
  });
});
