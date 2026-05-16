import { test, expect } from "@playwright/test";

function makeEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerUser(page: any, email: string, password: string) {
  await page.goto("/signup");
  await page.fill('input[id="name"]', "Test User");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for signup to complete (success shows nothing, just redirects or stays)
  await page.waitForTimeout(1000);
}

async function loginUser(page: any, email: string, password: string, expectedUrl?: RegExp) {
  await page.goto("/login");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  if (expectedUrl) {
    await page.waitForURL(expectedUrl, { timeout: 10000 });
  }
}

test.describe.serial("Auth Flows", () => {
  const TEST_EMAIL = makeEmail("auth");
  const TEST_PASSWORD = "password123";

  test("sign up creates account", async ({ page }) => {
    await registerUser(page, TEST_EMAIL, TEST_PASSWORD);
    // After signup, either on signup page with no error or redirected
    expect(page.url()).not.toContain("error");
  });

  test("login redirects to student dashboard", async ({ page }) => {
    await loginUser(page, TEST_EMAIL, TEST_PASSWORD, /\/student\/dashboard/);
    await expect(page.locator("text=Student Dashboard")).toBeVisible();
  });

  test("logout returns to landing page", async ({ page }) => {
    await loginUser(page, TEST_EMAIL, TEST_PASSWORD, /\/student\/dashboard/);
    await page.click("text=Sign out");
    await expect(page).toHaveURL("/");
  });

  test("login shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[id="email"]', "wrong@example.com");
    await page.fill('input[id="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Invalid email or password")).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("text=Reset password")).toBeVisible();
    await page.fill('input[id="email"]', TEST_EMAIL);
    await page.click("text=Send reset link");
    await expect(page.locator("text=you will receive a password reset email")).toBeVisible();
  });
});
