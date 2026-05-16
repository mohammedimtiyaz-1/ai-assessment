# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-link.spec.ts >> Public Link Flow >> 404 page loads for nonexistent route
- Location: tests/public-link.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=404')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=404')

```

```yaml
- img
- text: AI Assessment
- heading "Sign in" [level=3]
- paragraph: Enter your credentials to continue
- text: Email
- textbox "Email"
- text: Password
- textbox "Password"
- button "Sign in"
- link "Forgot password?":
  - /url: /forgot-password
- link "Create account":
  - /url: /signup
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Public Link Flow", () => {
  4  |   test("404 page loads for nonexistent route", async ({ page }) => {
  5  |     await page.goto("/nonexistent-page-that-does-not-match");
> 6  |     await expect(page.locator("text=404")).toBeVisible();
     |                                            ^ Error: expect(locator).toBeVisible() failed
  7  |     await expect(page.locator("text=Page not found")).toBeVisible();
  8  |   });
  9  | 
  10 |   test("public link page structure loads", async ({ page }) => {
  11 |     // Even with invalid token, the page should render (it handles resolution client-side)
  12 |     await page.goto("/a/some-token");
  13 |     // The page either shows assessment details or an error state
  14 |     const body = await page.locator("body").innerText();
  15 |     expect(body.length).toBeGreaterThan(0);
  16 |   });
  17 | });
  18 | 
```