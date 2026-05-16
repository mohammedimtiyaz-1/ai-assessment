# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student.spec.ts >> Student Flows >> dashboard shows KPIs and empty state
- Location: tests/student.spec.ts:32:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[id="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - link "AI Assessment" [ref=e5] [cursor=pointer]:
        - /url: /student/dashboard
        - img [ref=e6]
        - generic [ref=e9]: AI Assessment
      - navigation [ref=e10]:
        - link "Dashboard" [ref=e11] [cursor=pointer]:
          - /url: /student/dashboard
          - img [ref=e12]
          - text: Dashboard
        - link "Upload" [ref=e17] [cursor=pointer]:
          - /url: /student/upload
          - img [ref=e18]
          - text: Upload
        - link "Content" [ref=e21] [cursor=pointer]:
          - /url: /student/content
          - img [ref=e22]
          - text: Content
        - link "Quiz" [ref=e25] [cursor=pointer]:
          - /url: /student/quiz
          - img [ref=e26]
          - text: Quiz
        - link "History" [ref=e29] [cursor=pointer]:
          - /url: /student/history
          - img [ref=e30]
          - text: History
        - link "Progress" [ref=e34] [cursor=pointer]:
          - /url: /student/progress
          - img [ref=e35]
          - text: Progress
        - link "Profile" [ref=e39] [cursor=pointer]:
          - /url: /profile
          - img [ref=e40]
          - text: Profile
        - link "Settings" [ref=e43] [cursor=pointer]:
          - /url: /settings
          - img [ref=e44]
          - text: Settings
        - button "Sign out" [ref=e47] [cursor=pointer]:
          - img [ref=e48]
          - text: Sign out
    - generic [ref=e51]:
      - banner [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]: student-1778906739602-aa2kb41jnis@example.com
          - generic [ref=e55]: S
      - main [ref=e56]:
        - generic [ref=e57]:
          - generic [ref=e58]:
            - heading "Student Dashboard" [level=1] [ref=e59]
            - link "Upload Content" [ref=e60] [cursor=pointer]:
              - /url: /student/upload
              - button "Upload Content" [ref=e61]:
                - img [ref=e62]
                - text: Upload Content
          - generic [ref=e65]:
            - generic [ref=e66]:
              - heading "Content" [level=3] [ref=e68]
              - generic [ref=e70]: "0"
            - generic [ref=e71]:
              - heading "Attempts" [level=3] [ref=e73]
              - generic [ref=e75]: "0"
            - generic [ref=e76]:
              - heading "Accuracy" [level=3] [ref=e78]
              - generic [ref=e80]: 0%
            - generic [ref=e81]:
              - heading "Quick Action" [level=3] [ref=e83]
              - link "Practice" [ref=e85] [cursor=pointer]:
                - /url: /student/quiz
                - button "Practice" [ref=e86]:
                  - img [ref=e87]
                  - text: Practice
          - generic [ref=e91]:
            - img [ref=e92]
            - heading "No content yet" [level=3] [ref=e95]
            - paragraph [ref=e96]: Upload your first study material to generate practice questions and track your progress.
            - link "Upload your first content" [ref=e97] [cursor=pointer]:
              - /url: /student/upload
              - button "Upload your first content" [ref=e98]
  - alert [ref=e99]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | function makeEmail(prefix: string) {
  4  |   return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  5  | }
  6  | 
  7  | async function registerAndLogin(page: any, email: string, password: string) {
  8  |   // Register
  9  |   await page.goto("/signup");
  10 |   await page.fill('input[id="name"]', "Student User");
  11 |   await page.fill('input[id="email"]', email);
  12 |   await page.fill('input[id="password"]', password);
  13 |   await page.click('button[type="submit"]');
  14 |   await page.waitForTimeout(1500);
  15 | 
  16 |   // Login explicitly
  17 |   await page.goto("/login");
> 18 |   await page.fill('input[id="email"]', email);
     |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  19 |   await page.fill('input[id="password"]', password);
  20 |   await page.click('button[type="submit"]');
  21 |   await page.waitForURL(/\/student\/dashboard/, { timeout: 10000 });
  22 | }
  23 | 
  24 | test.describe.serial("Student Flows", () => {
  25 |   const TEST_EMAIL = makeEmail("student");
  26 |   const TEST_PASSWORD = "password123";
  27 | 
  28 |   test.beforeEach(async ({ page }) => {
  29 |     await registerAndLogin(page, TEST_EMAIL, TEST_PASSWORD);
  30 |   });
  31 | 
  32 |   test("dashboard shows KPIs and empty state", async ({ page }) => {
  33 |     await expect(page.locator("text=Student Dashboard")).toBeVisible();
  34 |     await expect(page.locator("text=Content")).toBeVisible();
  35 |     await expect(page.locator("text=Attempts")).toBeVisible();
  36 |     await expect(page.locator("text=Accuracy")).toBeVisible();
  37 |     await expect(page.locator("text=No content yet")).toBeVisible();
  38 |   });
  39 | 
  40 |   test("navigate to upload page", async ({ page }) => {
  41 |     await page.click("text=Upload Content");
  42 |     await expect(page).toHaveURL(/\/student\/upload/);
  43 |     await expect(page.locator("text=Upload")).toBeVisible();
  44 |   });
  45 | 
  46 |   test("navigate to content library", async ({ page }) => {
  47 |     await page.goto("/student/content");
  48 |     await expect(page.locator("text=My Content")).toBeVisible();
  49 |     await expect(page.locator("text=No content yet")).toBeVisible();
  50 |   });
  51 | 
  52 |   test("navigate to quiz entry page", async ({ page }) => {
  53 |     await page.goto("/student/quiz");
  54 |     await expect(page.locator("text=Practice Quiz")).toBeVisible();
  55 |   });
  56 | 
  57 |   test("navigate to history page", async ({ page }) => {
  58 |     await page.goto("/student/history");
  59 |     await expect(page.locator("text=History")).toBeVisible();
  60 |   });
  61 | 
  62 |   test("navigate to progress page", async ({ page }) => {
  63 |     await page.goto("/student/progress");
  64 |     await expect(page.locator("text=Progress")).toBeVisible();
  65 |   });
  66 | 
  67 |   test("profile page shows user info", async ({ page }) => {
  68 |     await page.goto("/profile");
  69 |     await expect(page.locator("text=Profile")).toBeVisible();
  70 |     await expect(page.locator(`text=${TEST_EMAIL}`)).toBeVisible();
  71 |   });
  72 | 
  73 |   test("settings page shows role", async ({ page }) => {
  74 |     await page.goto("/settings");
  75 |     await expect(page.locator("text=Settings")).toBeVisible();
  76 |     await expect(page.locator("text=student")).toBeVisible();
  77 |   });
  78 | 
  79 |   test("sidebar logo links to student dashboard", async ({ page }) => {
  80 |     await page.goto("/student/content");
  81 |     await page.click("text=AI Assessment");
  82 |     await expect(page).toHaveURL(/\/student\/dashboard/);
  83 |   });
  84 | });
  85 | 
```