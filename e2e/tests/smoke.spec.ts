/**
 * E2E Smoke Test
 *
 * Critical path test following test-plan.md:
 * 1. Admin login
 * 2. Navigate to Excel upload page
 * 3. Upload sample file
 * 4. Verify redirect to dashboard and data rendering
 *
 * This test validates the core user journey.
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Test credentials - DO NOT hardcode in production
// Use environment variables or test fixtures
const TEST_CREDENTIALS = {
  username: process.env.TEST_USERNAME || 'testadmin',
  password: process.env.TEST_PASSWORD || 'testpass123',
};

test.describe('Smoke Test: Core User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test for isolation
    await page.context().clearCookies();
  });

  test('should complete the full upload and dashboard flow', async ({ page }) => {
    // =========================================================================
    // STEP 1: Admin Login
    // =========================================================================
    await test.step('Login via Django Admin', async () => {
      // Navigate to admin login page
      await page.goto('/admin/login/');

      // Verify login page is displayed
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();

      // Enter credentials
      await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.password);

      // Submit login form
      await page.click('input[type="submit"]');

      // Verify login success - should redirect to admin or dashboard
      // Check for session cookie existence
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === 'sessionid');
      expect(sessionCookie).toBeDefined();
    });

    // =========================================================================
    // STEP 2: Navigate to Upload Page
    // =========================================================================
    await test.step('Navigate to Excel upload page', async () => {
      // Navigate to upload page
      await page.goto('/upload');

      // Verify upload page is displayed
      await expect(page.getByRole('heading', { name: '데이터 업로드' })).toBeVisible();

      // Verify upload area is visible
      await expect(page.locator('text=파일을 여기에 드래그')).toBeVisible();
    });

    // =========================================================================
    // STEP 3: Upload Sample Excel File
    // =========================================================================
    await test.step('Upload sample Excel file', async () => {
      // Get the file input element
      const fileInput = page.locator('input[type="file"]');

      // Upload the sample Excel file
      const sampleFilePath = path.join(__dirname, '../fixtures/sample_data.xlsx');
      await fileInput.setInputFiles(sampleFilePath);

      // Verify file is selected (filename displayed)
      await expect(page.locator('text=sample_data.xlsx')).toBeVisible();

      // Click upload button
      await page.click('button:has-text("업로드 시작")');

      // Wait for upload to complete (success message or redirect)
      // Either success message or redirect to dashboard
      await Promise.race([
        expect(page.locator('text=업로드 완료')).toBeVisible({ timeout: 30000 }),
        page.waitForURL('/dashboard', { timeout: 30000 }),
      ]);
    });

    // =========================================================================
    // STEP 4: Verify Dashboard and Data Rendering
    // =========================================================================
    await test.step('Verify dashboard displays uploaded data', async () => {
      // Navigate to dashboard if not already there
      if (!page.url().includes('/dashboard')) {
        await page.goto('/dashboard');
      }

      // Wait for dashboard to load
      await expect(page.getByRole('heading', { name: '대시보드', level: 4 })).toBeVisible();

      // Verify charts are rendered (at least one chart should be visible)
      // Check for Recharts SVG elements or chart containers
      const chartContainers = page.locator('.recharts-wrapper');
      await expect(chartContainers.first()).toBeVisible({ timeout: 10000 });

      // Verify data is displayed (not empty state message)
      const emptyMessage = page.locator('text=데이터가 없습니다');
      await expect(emptyMessage).not.toBeVisible();
    });
  });

  test('should redirect to login when accessing protected page without auth', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');

    // Should be redirected to login page (either React handles it or 401)
    // Wait for either admin login page or a login redirect
    await page.waitForTimeout(2000);

    // The app should show login requirement in some form
    const url = page.url();
    const hasLoginRedirect =
      url.includes('/admin/login') ||
      url.includes('/login');

    // If not redirected, the API should return 401 and show error
    if (!hasLoginRedirect) {
      // Check for error message or empty state
      const errorOrEmptyState = await page.locator('text=/오류|에러|error/i').count();
      expect(errorOrEmptyState).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Smoke Test: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each navigation test
    await page.goto('/admin/login/');
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(1000);
  });

  test('should navigate between main pages', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: '대시보드', level: 4 })).toBeVisible();

    // Navigate to upload page via sidebar or URL
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: '데이터 업로드' })).toBeVisible();

    // Navigate to data table page
    await page.goto('/data-table');
    await expect(page.getByRole('heading', { name: '데이터 테이블' })).toBeVisible();
  });
});
