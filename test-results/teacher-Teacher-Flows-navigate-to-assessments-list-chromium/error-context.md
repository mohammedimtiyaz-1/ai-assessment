# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teacher.spec.ts >> Teacher Flows >> navigate to assessments list
- Location: tests/teacher.spec.ts:43:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=View all')
    - waiting for" http://localhost:3000/teacher/dashboard" navigation to finish...
    - navigated to "http://localhost:3000/teacher/dashboard"

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | // Use seeded teacher credentials
  4   | const TEACHER_EMAIL = "teacher@example.com";
  5   | const TEACHER_PASSWORD = "password123";
  6   | 
  7   | async function loginAsTeacher(page: any) {
  8   |   await page.goto("/login");
  9   |   await page.fill('input[id="email"]', TEACHER_EMAIL);
  10  |   await page.fill('input[id="password"]', TEACHER_PASSWORD);
  11  |   await page.click('button[type="submit"]');
  12  |   // After login, teacher should be redirected to /dashboard
  13  |   // But if middleware doesn't know role, it may go to /student/dashboard
  14  |   // So we accept either dashboard URL
  15  |   await page.waitForURL(/\/(dashboard|student\/dashboard)/, { timeout: 10000 });
  16  | }
  17  | 
  18  | async function stubTeacherContent(page: any) {
  19  |   await page.route("**/api/teacher/content", (route: any) => {
  20  |     route.fulfill({
  21  |       contentType: "application/json",
  22  |       body: JSON.stringify({
  23  |         content: [
  24  |           { id: "content-1", title: "Sample Lesson", type: "pdf" },
  25  |         ],
  26  |       }),
  27  |     });
  28  |   });
  29  | }
  30  | 
  31  | test.describe("Teacher Flows", () => {
  32  |   test.beforeEach(async ({ page }) => {
  33  |     await loginAsTeacher(page);
  34  |   });
  35  | 
  36  |   test("dashboard shows KPIs", async ({ page }) => {
  37  |     await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
  38  |     await expect(page.locator("text=Assessments")).toBeVisible();
  39  |     await expect(page.locator("text=Published")).toBeVisible();
  40  |     await expect(page.locator("text=Total Attempts")).toBeVisible();
  41  |   });
  42  | 
  43  |   test("navigate to assessments list", async ({ page }) => {
> 44  |     await page.click("text=View all");
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  45  |     await expect(page).toHaveURL(/\/teacher\/assessments/);
  46  |     await expect(page.locator("text=Assessments")).toBeVisible();
  47  |   });
  48  | 
  49  |   test("create new assessment", async ({ page }) => {
  50  |     await page.goto("/teacher/assessments");
  51  |     page.on("dialog", async (dialog: any) => {
  52  |       await dialog.accept("Playwright Test Assessment");
  53  |     });
  54  |     await page.click("text=Create");
  55  |     await expect(page.locator("text=Playwright Test Assessment")).toBeVisible();
  56  |   });
  57  | 
  58  |   test("sidebar logo links to teacher dashboard", async ({ page }) => {
  59  |     await page.goto("/teacher/assessments");
  60  |     await page.click("text=AI Assessment");
  61  |     await expect(page).toHaveURL(/\/teacher\/dashboard/);
  62  |   });
  63  | 
  64  |   test("validation: title is required", async ({ page }) => {
  65  |     await page.goto("/teacher/assessments/create");
  66  |     await page.click("text=Create Assessment");
  67  |     await expect(page.getByText("Title must be at least 3 characters")).toBeVisible();
  68  |   });
  69  | 
  70  |   test("validation: content selection required", async ({ page }) => {
  71  |     await stubTeacherContent(page);
  72  |     await page.goto("/teacher/assessments/create");
  73  |     await page.fill('#title', 'Valid Assessment Title');
  74  |     await page.click('text=Create Assessment');
  75  |     await expect(page.getByText("Please select content to generate questions from")).toBeVisible();
  76  |   });
  77  | 
  78  |   test("validation: question count boundaries", async ({ page }) => {
  79  |     await stubTeacherContent(page);
  80  |     await page.goto("/teacher/assessments/create");
  81  |     await page.fill('#title', 'Boundary Test');
  82  |     await page.click('button:has-text("Sample Lesson")');
  83  |     await page.fill('#questionCount', '0');
  84  |     await page.click('text=Create Assessment');
  85  |     await expect(page.getByText("Number of questions must be between 1 and 100")).toBeVisible();
  86  |   });
  87  | 
  88  |   test("validation: at least one question type required", async ({ page }) => {
  89  |     await stubTeacherContent(page);
  90  |     await page.goto("/teacher/assessments/create");
  91  |     await page.fill('#title', 'Question Type Test');
  92  |     await page.click('button:has-text("Sample Lesson")');
  93  | 
  94  |     const typeIds = ["mcq", "fill_blanks", "true_false", "short_answer", "essay", "riddle"];
  95  |     for (const id of typeIds) {
  96  |       const locator = page.locator(`#${id}`);
  97  |       if (await locator.isChecked()) {
  98  |         await locator.uncheck();
  99  |       }
  100 |     }
  101 | 
  102 |     await page.click('text=Create Assessment');
  103 |     await expect(page.getByText("Please select at least one question type")).toBeVisible();
  104 |   });
  105 | });
  106 | 
```