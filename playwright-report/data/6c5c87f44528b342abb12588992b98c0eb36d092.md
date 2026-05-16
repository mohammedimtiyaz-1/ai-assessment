# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teacher.spec.ts >> Teacher Flows >> navigate to assessments list
- Location: tests/teacher.spec.ts:30:7

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
            - textbox "Email" [ref=e16]: teacher@example.com
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
  3  | // Use seeded teacher credentials
  4  | const TEACHER_EMAIL = "teacher@example.com";
  5  | const TEACHER_PASSWORD = "password123";
  6  | 
  7  | async function loginAsTeacher(page: any) {
  8  |   await page.goto("/login");
  9  |   await page.fill('input[id="email"]', TEACHER_EMAIL);
  10 |   await page.fill('input[id="password"]', TEACHER_PASSWORD);
  11 |   await page.click('button[type="submit"]');
  12 |   // After login, teacher should be redirected to /dashboard
  13 |   // But if middleware doesn't know role, it may go to /student/dashboard
  14 |   // So we accept either dashboard URL
> 15 |   await page.waitForURL(/\/(dashboard|student\/dashboard)/, { timeout: 10000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  16 | }
  17 | 
  18 | test.describe("Teacher Flows", () => {
  19 |   test.beforeEach(async ({ page }) => {
  20 |     await loginAsTeacher(page);
  21 |   });
  22 | 
  23 |   test("dashboard shows KPIs", async ({ page }) => {
  24 |     await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
  25 |     await expect(page.locator("text=Assessments")).toBeVisible();
  26 |     await expect(page.locator("text=Published")).toBeVisible();
  27 |     await expect(page.locator("text=Total Attempts")).toBeVisible();
  28 |   });
  29 | 
  30 |   test("navigate to assessments list", async ({ page }) => {
  31 |     await page.click("text=View all");
  32 |     await expect(page).toHaveURL(/\/teacher\/assessments/);
  33 |     await expect(page.locator("text=Assessments")).toBeVisible();
  34 |   });
  35 | 
  36 |   test("create new assessment", async ({ page }) => {
  37 |     await page.goto("/teacher/assessments");
  38 |     page.on("dialog", async (dialog: any) => {
  39 |       await dialog.accept("Playwright Test Assessment");
  40 |     });
  41 |     await page.click("text=Create");
  42 |     await expect(page.locator("text=Playwright Test Assessment")).toBeVisible();
  43 |   });
  44 | 
  45 |   test("sidebar logo links to teacher dashboard", async ({ page }) => {
  46 |     await page.goto("/teacher/assessments");
  47 |     await page.click("text=AI Assessment");
  48 |     await expect(page).toHaveURL(/\/dashboard/);
  49 |   });
  50 | });
  51 | 
```