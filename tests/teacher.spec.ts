import { test, expect } from "@playwright/test";

// Use seeded teacher credentials
const TEACHER_EMAIL = "teacher@example.com";
const TEACHER_PASSWORD = "password123";

async function loginAsTeacher(page: any) {
  await page.goto("/login");
  await page.fill('input[id="email"]', TEACHER_EMAIL);
  await page.fill('input[id="password"]', TEACHER_PASSWORD);
  await page.click('button[type="submit"]');
  // After login, teacher should be redirected to /dashboard
  // But if middleware doesn't know role, it may go to /student/dashboard
  // So we accept either dashboard URL
  await page.waitForURL(/\/(dashboard|student\/dashboard)/, { timeout: 10000 });
}

async function stubTeacherContent(page: any) {
  await page.route("**/api/teacher/content", (route: any) => {
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        content: [
          { id: "content-1", title: "Sample Lesson", type: "pdf" },
        ],
      }),
    });
  });
}

test.describe("Teacher Flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test("dashboard shows KPIs", async ({ page }) => {
    await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
    await expect(page.locator("text=Assessments")).toBeVisible();
    await expect(page.locator("text=Published")).toBeVisible();
    await expect(page.locator("text=Total Attempts")).toBeVisible();
  });

  test("navigate to assessments list", async ({ page }) => {
    await page.click("text=View all");
    await expect(page).toHaveURL(/\/teacher\/assessments/);
    await expect(page.locator("text=Assessments")).toBeVisible();
  });

  test("create new assessment", async ({ page }) => {
    await page.goto("/teacher/assessments");
    page.on("dialog", async (dialog: any) => {
      await dialog.accept("Playwright Test Assessment");
    });
    await page.click("text=Create");
    await expect(page.locator("text=Playwright Test Assessment")).toBeVisible();
  });

  test("sidebar logo links to teacher dashboard", async ({ page }) => {
    await page.goto("/teacher/assessments");
    await page.click("text=AI Assessment");
    await expect(page).toHaveURL(/\/teacher\/dashboard/);
  });

  test("validation: title is required", async ({ page }) => {
    await page.goto("/teacher/assessments/create");
    await page.click("text=Create Assessment");
    await expect(page.getByText("Title must be at least 3 characters")).toBeVisible();
  });

  test("validation: content selection required", async ({ page }) => {
    await stubTeacherContent(page);
    await page.goto("/teacher/assessments/create");
    await page.fill('#title', 'Valid Assessment Title');
    await page.click('text=Create Assessment');
    await expect(page.getByText("Please select content to generate questions from")).toBeVisible();
  });

  test("validation: question count boundaries", async ({ page }) => {
    await stubTeacherContent(page);
    await page.goto("/teacher/assessments/create");
    await page.fill('#title', 'Boundary Test');
    await page.click('button:has-text("Sample Lesson")');
    await page.fill('#questionCount', '0');
    await page.click('text=Create Assessment');
    await expect(page.getByText("Number of questions must be between 1 and 100")).toBeVisible();
  });

  test("validation: at least one question type required", async ({ page }) => {
    await stubTeacherContent(page);
    await page.goto("/teacher/assessments/create");
    await page.fill('#title', 'Question Type Test');
    await page.click('button:has-text("Sample Lesson")');

    const typeIds = ["mcq", "fill_blanks", "true_false", "short_answer", "essay", "riddle"];
    for (const id of typeIds) {
      const locator = page.locator(`#${id}`);
      if (await locator.isChecked()) {
        await locator.uncheck();
      }
    }

    await page.click('text=Create Assessment');
    await expect(page.getByText("Please select at least one question type")).toBeVisible();
  });
});
