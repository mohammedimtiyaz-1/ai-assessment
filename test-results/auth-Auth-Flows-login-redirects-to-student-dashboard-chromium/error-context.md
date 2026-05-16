# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth Flows >> login redirects to student dashboard
- Location: tests/auth.spec.ts:37:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e5]
      - generic [ref=e8]: AI Assessment
    - generic [ref=e9]:
      - generic [ref=e10]:
        - heading "Sign in" [level=3] [ref=e11]
        - paragraph [ref=e12]: Enter your credentials to continue
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]:
            - text: Email
            - textbox "Email" [ref=e16]: auth-1778906738252-9ibaxug8g75@example.com
          - generic [ref=e17]:
            - text: Password
            - textbox "Password" [ref=e18]: password123
          - paragraph [ref=e19]: Invalid email or password
          - button "Sign in" [ref=e20] [cursor=pointer]
        - generic [ref=e21]:
          - link "Forgot password?" [ref=e22] [cursor=pointer]:
            - /url: /forgot-password
          - link "Create account" [ref=e23] [cursor=pointer]:
            - /url: /signup
  - alert [ref=e24]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | function makeEmail(prefix: string) {
  4  |   return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  5  | }
  6  | 
  7  | async function registerUser(page: any, email: string, password: string) {
  8  |   await page.goto("/signup");
  9  |   await page.fill('input[id="name"]', "Test User");
  10 |   await page.fill('input[id="email"]', email);
  11 |   await page.fill('input[id="password"]', password);
  12 |   await page.click('button[type="submit"]');
  13 |   // Wait for signup to complete (success shows nothing, just redirects or stays)
  14 |   await page.waitForTimeout(1000);
  15 | }
  16 | 
  17 | async function loginUser(page: any, email: string, password: string, expectedUrl?: RegExp) {
  18 |   await page.goto("/login");
  19 |   await page.fill('input[id="email"]', email);
  20 |   await page.fill('input[id="password"]', password);
  21 |   await page.click('button[type="submit"]');
  22 |   if (expectedUrl) {
> 23 |     await page.waitForURL(expectedUrl, { timeout: 10000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  24 |   }
  25 | }
  26 | 
  27 | test.describe.serial("Auth Flows", () => {
  28 |   const TEST_EMAIL = makeEmail("auth");
  29 |   const TEST_PASSWORD = "password123";
  30 | 
  31 |   test("sign up creates account", async ({ page }) => {
  32 |     await registerUser(page, TEST_EMAIL, TEST_PASSWORD);
  33 |     // After signup, either on signup page with no error or redirected
  34 |     expect(page.url()).not.toContain("error");
  35 |   });
  36 | 
  37 |   test("login redirects to student dashboard", async ({ page }) => {
  38 |     await loginUser(page, TEST_EMAIL, TEST_PASSWORD, /\/student\/dashboard/);
  39 |     await expect(page.locator("text=Student Dashboard")).toBeVisible();
  40 |   });
  41 | 
  42 |   test("logout returns to landing page", async ({ page }) => {
  43 |     await loginUser(page, TEST_EMAIL, TEST_PASSWORD, /\/student\/dashboard/);
  44 |     await page.click("text=Sign out");
  45 |     await expect(page).toHaveURL("/");
  46 |   });
  47 | 
  48 |   test("login shows error for invalid credentials", async ({ page }) => {
  49 |     await page.goto("/login");
  50 |     await page.fill('input[id="email"]', "wrong@example.com");
  51 |     await page.fill('input[id="password"]', "wrongpassword");
  52 |     await page.click('button[type="submit"]');
  53 |     await expect(page.locator("text=Invalid email or password")).toBeVisible();
  54 |   });
  55 | 
  56 |   test("forgot password page loads", async ({ page }) => {
  57 |     await page.goto("/forgot-password");
  58 |     await expect(page.locator("text=Reset password")).toBeVisible();
  59 |     await page.fill('input[id="email"]', TEST_EMAIL);
  60 |     await page.click("text=Send reset link");
  61 |     await expect(page.locator("text=you will receive a password reset email")).toBeVisible();
  62 |   });
  63 | });
  64 | 
```