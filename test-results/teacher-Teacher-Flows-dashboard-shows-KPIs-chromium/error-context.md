# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teacher.spec.ts >> Teacher Flows >> dashboard shows KPIs
- Location: tests/teacher.spec.ts:23:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Assessments')
Expected: visible
Error: strict mode violation: locator('text=Assessments') resolved to 3 elements:
    1) <a href="/teacher/assessments" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground">…</a> aka getByRole('link', { name: 'Assessments' })
    2) <h3 class="tracking-tight text-sm font-medium text-muted-foreground">Assessments</h3> aka getByRole('heading', { name: 'Assessments', exact: true })
    3) <h3 class="font-semibold tracking-tight text-base">Recent Assessments</h3> aka getByRole('heading', { name: 'Recent Assessments' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Assessments')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - link "AI Assessment" [ref=e6] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e7]
        - generic [ref=e10]: AI Assessment
      - navigation [ref=e11]:
        - link "Dashboard" [ref=e12] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e13]
          - text: Dashboard
        - link "Assessments" [ref=e18] [cursor=pointer]:
          - /url: /teacher/assessments
          - img [ref=e19]
          - text: Assessments
        - link "Profile" [ref=e23] [cursor=pointer]:
          - /url: /profile
          - img [ref=e24]
          - text: Profile
        - link "Settings" [ref=e27] [cursor=pointer]:
          - /url: /settings
          - img [ref=e28]
          - text: Settings
        - button "Sign out" [ref=e31] [cursor=pointer]:
          - img [ref=e32]
          - text: Sign out
    - generic [ref=e35]:
      - banner [ref=e36]:
        - generic [ref=e37]:
          - generic [ref=e38]: teacher@example.com
          - generic [ref=e39]: T
      - main [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e42]:
            - heading "Teacher Dashboard" [level=1] [ref=e43]
            - link "New Assessment" [ref=e44] [cursor=pointer]:
              - /url: /teacher/assessments
              - button "New Assessment" [ref=e45]:
                - img [ref=e46]
                - text: New Assessment
          - generic [ref=e47]:
            - generic [ref=e48]:
              - heading "Assessments" [level=3] [ref=e50]
              - generic [ref=e52]: "1"
            - generic [ref=e53]:
              - heading "Published" [level=3] [ref=e55]
              - generic [ref=e57]: "1"
            - generic [ref=e58]:
              - heading "Total Attempts" [level=3] [ref=e60]
              - generic [ref=e62]: "0"
          - generic [ref=e63]:
            - heading "Recent Assessments" [level=3] [ref=e65]
            - generic [ref=e66]:
              - generic [ref=e67]:
                - generic [ref=e68]:
                  - img [ref=e69]
                  - generic [ref=e72]: Biology Quiz A
                - generic [ref=e73]: published
              - link "View all" [ref=e74] [cursor=pointer]:
                - /url: /teacher/assessments
                - button "View all" [ref=e75]:
                  - text: View all
                  - img [ref=e76]
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
  15 |   await page.waitForURL(/\/(dashboard|student\/dashboard)/, { timeout: 10000 });
  16 | }
  17 | 
  18 | test.describe("Teacher Flows", () => {
  19 |   test.beforeEach(async ({ page }) => {
  20 |     await loginAsTeacher(page);
  21 |   });
  22 | 
  23 |   test("dashboard shows KPIs", async ({ page }) => {
  24 |     await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
> 25 |     await expect(page.locator("text=Assessments")).toBeVisible();
     |                                                    ^ Error: expect(locator).toBeVisible() failed
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