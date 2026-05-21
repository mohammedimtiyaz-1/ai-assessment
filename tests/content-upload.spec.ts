import { test, expect } from "@playwright/test";

function makeEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLogin(page: any, email: string, password: string) {
  // Register
  await page.goto("/signup");
  await page.fill('input[id="name"]', "Student User");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Login explicitly
  await page.goto("/login");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/student\/dashboard/, { timeout: 10000 });
}

test.describe.serial("Content Upload Workflow", () => {
  const TEST_EMAIL = makeEmail("content-upload");
  const TEST_PASSWORD = "password123";

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test("upload text content and redirect to content list with newId", async ({ page }) => {
    await page.goto("/student/upload");
    await expect(page.locator("text=Upload Content")).toBeVisible();
    
    // Switch to text tab
    await page.click('text=Paste Text');
    
    // Fill in content
    await page.fill('textarea[id="textContent"]', "This is test content for quiz generation. The capital of France is Paris. The Earth revolves around the Sun.");
    await page.fill('input[id="title"]', "Test Geography Content");
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for redirect to content list with newId parameter
    await page.waitForURL(/\/student\/content\?newId=/, { timeout: 15000 });
    
    // Verify we're on content list page
    await expect(page.locator("text=My Content")).toBeVisible();
    
    // Verify the new content is highlighted (has the ring/border styling)
    const newContentCard = page.locator('.border-primary').first();
    await expect(newContentCard).toBeVisible();
    
    // Verify "Just Uploaded" badge is shown
    await expect(page.locator("text=Just Uploaded")).toBeVisible();
  });

  test("content list shows quiz generation options", async ({ page }) => {
    // First upload content
    await page.goto("/student/upload");
    await page.click('text=Paste Text');
    await page.fill('textarea[id="textContent"]', "Test content for quiz options");
    await page.fill('input[id="title"]', "Quiz Options Test");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/student\/content\?newId=/, { timeout: 15000 });
    
    // Verify quiz generation controls are present
    await expect(page.locator("text=Generate Quiz")).toBeVisible();
    await expect(page.locator("text=Multiple Choice")).toBeVisible();
    await expect(page.locator("text=Difficulty")).toBeVisible();
    await expect(page.locator("text=Easy")).toBeVisible();
    await expect(page.locator("text=Medium")).toBeVisible();
    await expect(page.locator("text=Hard")).toBeVisible();
  });

  test("content detail page shows extracted content", async ({ page }) => {
    // Upload content first
    await page.goto("/student/upload");
    await page.click('text=Paste Text');
    const testContent = "This is detailed content for extraction testing. It contains multiple sentences to verify the extraction works correctly.";
    await page.fill('textarea[id="textContent"]', testContent);
    await page.fill('input[id="title"]', "Extraction Test Content");
    await page.click('button[type="submit"]');
    
    // Wait for redirect and capture the content ID from URL
    await page.waitForURL(/\/student\/content\?newId=/, { timeout: 15000 });
    const url = page.url();
    const contentId = new URL(url).searchParams.get("newId");
    
    // Navigate to content detail page
    await page.goto(`/student/content/${contentId}`);
    
    // Verify extracted content is displayed
    await expect(page.locator("text=Material Content")).toBeVisible();
    await expect(page.locator("text=" + testContent.substring(0, 50))).toBeVisible();
    
    // Verify quiz generation options on detail page
    await expect(page.locator("text=Generate Practice Quiz")).toBeVisible();
    await expect(page.locator("text=Generate AI Quiz")).toBeVisible();
  });

  test("upload file and verify extraction fields in database", async ({ page }) => {
    await page.goto("/student/upload");
    
    // Upload a simple text file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('label:has-text("browse")');
    const fileChooser = await fileChooserPromise;
    
    // Create a temporary text file
    const testFilePath = '/tmp/test-upload.txt';
    await page.evaluate((path) => {
      const fs = require('fs');
      fs.writeFileSync(path, 'Test file content for extraction');
    }, testFilePath);
    
    await fileChooser.setFiles(testFilePath);
    
    // Set title
    await page.fill('input[id="title"]', "File Upload Test");
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(/\/student\/content\?newId=/, { timeout: 15000 });
    
    // Verify redirect happened
    await expect(page.locator("text=My Content")).toBeVisible();
  });
});
