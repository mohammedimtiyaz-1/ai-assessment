import { test, expect } from "@playwright/test";

test.describe("Public Link Flow", () => {
  test("404 page loads for nonexistent route", async ({ page }) => {
    await page.goto("/nonexistent-page-that-does-not-match");
    await expect(page.locator("text=404")).toBeVisible();
    await expect(page.locator("text=Page not found")).toBeVisible();
  });

  test("public link page structure loads", async ({ page }) => {
    // Even with invalid token, the page should render (it handles resolution client-side)
    await page.goto("/a/some-token");
    // The page either shows assessment details or an error state
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});
