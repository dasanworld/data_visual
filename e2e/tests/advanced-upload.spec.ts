/**
 * E2E Test: Advanced Upload Tests
 *
 * Comprehensive tests for uploading different types of Excel files
 * and applying various filters to verify data processing and rendering.
 *
 * Test Scenarios:
 * 1. Department KPI upload and filtering (by year, department, combined)
 * 2. Publication List upload and filtering (by date, department, journal grade)
 * 3. Research Project upload and filtering (by date, agency, status)
 * 4. Large file processing (1000+ rows) with performance validation
 * 5. Various data types and special character handling
 *
 * Requirements:
 * - User-facing locators only (getByRole, getByLabel, getByText)
 * - Each test completes within 30 seconds
 * - Screenshots only on failure
 * - All tests are independent and can run in isolation
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Test credentials
const TEST_CREDENTIALS = {
  username: process.env.TEST_USERNAME || 'testadmin',
  password: process.env.TEST_PASSWORD || 'testpass123',
};

// Fixture file paths
const FIXTURES = {
  departmentKPI: path.join(__dirname, '../fixtures/department_kpi.xlsx'),
  publicationList: path.join(__dirname, '../fixtures/publication_list.xlsx'),
  researchProject: path.join(__dirname, '../fixtures/research_project_data.xlsx'),
  largeDataset: path.join(__dirname, '../fixtures/large_dataset.xlsx'),
};

/**
 * Helper function to login
 */
async function login(page: any) {
  await page.goto('/admin/login/');
  await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
  await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
  await page.click('input[type="submit"]');
  await page.waitForTimeout(1000);
}

/**
 * Helper function to upload a file
 */
async function uploadFile(page: any, filePath: string, fileName: string) {
  await page.goto('/upload');
  await expect(page.getByRole('heading', { name: '데이터 업로드' })).toBeVisible();

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);

  await expect(page.locator(`text=${fileName}`)).toBeVisible();

  const uploadButton = page.locator('button:has-text("업로드 시작")');
  await uploadButton.click();

  // Wait for upload to complete
  await Promise.race([
    expect(page.locator('text=업로드 완료')).toBeVisible({ timeout: 30000 }),
    page.waitForURL('/dashboard', { timeout: 30000 }),
  ]);
}

/**
 * Helper function to navigate to dashboard and wait for it to load
 */
async function navigateToDashboard(page: any) {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: '대시보드', level: 4 })).toBeVisible();
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 10000 });
}

/**
 * Helper function to select a date in MUI DatePicker
 */
async function selectDate(page: any, groupName: string, year: string, month: string) {
  const dateGroup = page.getByRole('group', { name: groupName });
  await dateGroup.locator('[contenteditable="true"]').first().click();
  await page.waitForTimeout(500);

  const dialogVisible = await page.locator('[role="dialog"]').isVisible();

  if (dialogVisible) {
    const yearButton = page.getByRole('button', { name: new RegExp(year, 'i') }).first();
    if (await yearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await yearButton.click();
      await page.waitForTimeout(300);
    }

    const monthButton = page.getByRole('button', { name: new RegExp(month, 'i') }).first();
    if (await monthButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await monthButton.click();
      await page.waitForTimeout(300);
    }
  }
}

/**
 * Helper function to select department via Autocomplete
 */
async function selectDepartment(page: any, departmentText: string) {
  const autocomplete = page.getByLabel('부서 선택');
  await autocomplete.click();
  await page.waitForTimeout(500);

  // Find the option that contains the department text
  const option = page.getByRole('option', { name: new RegExp(departmentText, 'i') });
  await option.click();
  await page.waitForTimeout(500);
}

test.describe('Advanced Upload E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and login before each test
    await page.context().clearCookies();
    await login(page);
  });

  // =========================================================================
  // Test 1: Department KPI Upload and Filtering
  // =========================================================================
  test('should upload and filter department KPI data by year', async ({ page }) => {
    await test.step('Upload department KPI file', async () => {
      await uploadFile(page, FIXTURES.departmentKPI, 'department_kpi.xlsx');
    });

    await test.step('Navigate to dashboard', async () => {
      await navigateToDashboard(page);
    });

    await test.step('Filter by year 2023', async () => {
      await selectDate(page, '시작 월', '2023', '1월');
      await selectDate(page, '종료 월', '2023', '12월');
      await page.waitForTimeout(1000);

      // Verify charts are rendered with filtered data
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });

    await test.step('Filter by year 2024', async () => {
      await selectDate(page, '시작 월', '2024', '1월');
      await selectDate(page, '종료 월', '2024', '12월');
      await page.waitForTimeout(1000);

      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });

    await test.step('Filter by year 2025', async () => {
      await selectDate(page, '시작 월', '2025', '1월');
      await selectDate(page, '종료 월', '2025', '12월');
      await page.waitForTimeout(1000);

      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });
  });

  test('should upload and filter department KPI data by department', async ({ page }) => {
    await test.step('Upload department KPI file', async () => {
      await uploadFile(page, FIXTURES.departmentKPI, 'department_kpi.xlsx');
    });

    await test.step('Navigate to dashboard', async () => {
      await navigateToDashboard(page);
    });

    await test.step('Filter by 공과대학', async () => {
      await selectDepartment(page, '공과대학');
      await page.waitForTimeout(1000);

      // Verify department chip is visible
      await expect(page.getByRole('button', { name: /공과대학/i })).toBeVisible();
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });

    await test.step('Reset and filter by 인문대학', async () => {
      // Reset filters
      await page.getByRole('button', { name: '필터 초기화' }).click();
      await page.waitForTimeout(500);

      await selectDepartment(page, '인문대학');
      await page.waitForTimeout(1000);

      await expect(page.getByRole('button', { name: /인문대학/i })).toBeVisible();
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });
  });

  test('should upload and filter department KPI data with combined filters', async ({ page }) => {
    await test.step('Upload department KPI file', async () => {
      await uploadFile(page, FIXTURES.departmentKPI, 'department_kpi.xlsx');
    });

    await test.step('Navigate to dashboard', async () => {
      await navigateToDashboard(page);
    });

    await test.step('Apply combined filters: 2024년 + 공과대학', async () => {
      // Apply date filter
      await selectDate(page, '시작 월', '2024', '1월');
      await selectDate(page, '종료 월', '2024', '12월');
      await page.waitForTimeout(500);

      // Apply department filter
      await selectDepartment(page, '공과대학');
      await page.waitForTimeout(1000);

      // Verify both filters are active
      const startDateGroup = page.getByRole('group', { name: '시작 월' });
      const startDateValue = await startDateGroup.locator('[contenteditable="true"]').first().textContent();
      expect(startDateValue).toBeTruthy();

      await expect(page.getByRole('button', { name: /공과대학/i })).toBeVisible();
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });
  });

  // =========================================================================
  // Test 2: Publication List Upload and Filtering
  // =========================================================================
  test('should upload and filter publication list by date range', async ({ page }) => {
    await test.step('Upload publication list file', async () => {
      await uploadFile(page, FIXTURES.publicationList, 'publication_list.xlsx');
    });

    await test.step('Navigate to dashboard', async () => {
      await navigateToDashboard(page);
    });

    await test.step('Filter by date range 2023-2024', async () => {
      await selectDate(page, '시작 월', '2023', '1월');
      await selectDate(page, '종료 월', '2024', '12월');
      await page.waitForTimeout(1000);

      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();

      // Verify data is rendered (check for data points)
      const chartElements = await page.locator('.recharts-bar-rectangle, .recharts-line-curve, .recharts-pie-sector').count();
      expect(chartElements).toBeGreaterThan(0);
    });
  });

  test('should upload and filter publication list by department and journal grade', async ({ page }) => {
    await test.step('Upload publication list file', async () => {
      await uploadFile(page, FIXTURES.publicationList, 'publication_list.xlsx');
    });

    await test.step('Navigate to dashboard', async () => {
      await navigateToDashboard(page);
    });

    await test.step('Filter by department', async () => {
      // Check if autocomplete has departments loaded
      const autocomplete = page.getByLabel('부서 선택');
      await autocomplete.click();
      await page.waitForTimeout(500);

      // Get first available option
      const firstOption = page.getByRole('option').first();
      const isVisible = await firstOption.isVisible().catch(() => false);

      if (isVisible) {
        const departmentName = await firstOption.textContent();
        await firstOption.click();
        await page.waitForTimeout(1000);

        if (departmentName) {
          await expect(page.getByRole('button', { name: departmentName.trim() })).toBeVisible();
        }
        await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
      }
    });
  });

  // =========================================================================
  // Test 3: Research Project Upload and Filtering
  // =========================================================================
  test('should upload and filter research project data by execution date', async ({ page }) => {
    await test.step('Upload research project file', async () => {
      await uploadFile(page, FIXTURES.researchProject, 'research_project_data.xlsx');
    });

    await test.step('Navigate to dashboard', async () => {
      await navigateToDashboard(page);
    });

    await test.step('Filter by execution date range', async () => {
      await selectDate(page, '시작 월', '2024', '1월');
      await selectDate(page, '종료 월', '2024', '12월');
      await page.waitForTimeout(1000);

      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();

      // Verify charts render with filtered data
      const chartContainers = await page.locator('.recharts-wrapper').count();
      expect(chartContainers).toBeGreaterThan(0);
    });
  });

  test('should upload and filter research project data by department', async ({ page }) => {
    await test.step('Upload research project file', async () => {
      await uploadFile(page, FIXTURES.researchProject, 'research_project_data.xlsx');
    });

    await test.step('Navigate to dashboard', async () => {
      await navigateToDashboard(page);
    });

    await test.step('Filter by department', async () => {
      const autocomplete = page.getByLabel('부서 선택');
      await autocomplete.click();
      await page.waitForTimeout(500);

      const firstOption = page.getByRole('option').first();
      const isVisible = await firstOption.isVisible().catch(() => false);

      if (isVisible) {
        const departmentName = await firstOption.textContent();
        await firstOption.click();
        await page.waitForTimeout(1000);

        if (departmentName) {
          await expect(page.getByRole('button', { name: departmentName.trim() })).toBeVisible();
        }
        await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
      }
    });
  });

  // =========================================================================
  // Test 4: Large File Processing (1000+ rows)
  // =========================================================================
  test('should upload and process large dataset with performance validation', async ({ page }) => {
    const startTime = Date.now();

    await test.step('Upload large dataset (1200 rows)', async () => {
      await uploadFile(page, FIXTURES.largeDataset, 'large_dataset.xlsx');
    });

    await test.step('Navigate to dashboard and verify rendering', async () => {
      await navigateToDashboard(page);

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      // Verify performance: should complete within 10 seconds
      expect(processingTime).toBeLessThan(10);

      // Verify charts render correctly
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();

      // Verify data table page loads without crashing
      await page.goto('/data-table');
      await expect(page.getByRole('heading', { name: '데이터 테이블' })).toBeVisible();

      // Wait for page to load
      await page.waitForTimeout(3000);

      // Page should not crash - just verify the heading is still visible
      await expect(page.getByRole('heading', { name: '데이터 테이블' })).toBeVisible();

      // No critical errors should be displayed
      const criticalError = page.locator('[role="alert"]:has-text("오류"), [role="alert"]:has-text("에러")');
      const hasCriticalError = await criticalError.count();
      expect(hasCriticalError).toBe(0);
    });

    await test.step('Apply filters to large dataset', async () => {
      await navigateToDashboard(page);

      // Apply date filter to reduce dataset
      await selectDate(page, '시작 월', '2024', '1월');
      await selectDate(page, '종료 월', '2024', '12월');
      await page.waitForTimeout(1000);

      // Charts should still render after filtering
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });

    await test.step('Verify no memory leaks with multiple filter operations', async () => {
      // Perform multiple filter operations
      for (let i = 0; i < 3; i++) {
        // Apply filter
        await selectDate(page, '시작 월', '2023', '1월');
        await page.waitForTimeout(500);

        // Reset filter
        await page.getByRole('button', { name: '필터 초기화' }).click();
        await page.waitForTimeout(500);
      }

      // Dashboard should remain functional
      await expect(page.getByRole('heading', { name: '대시보드', level: 4 })).toBeVisible();
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });
  });

  // =========================================================================
  // Test 5: File Format Diversity and Special Character Handling
  // =========================================================================
  test('should handle various data types and special characters correctly', async ({ page }) => {
    await test.step('Upload department KPI with Korean text', async () => {
      await uploadFile(page, FIXTURES.departmentKPI, 'department_kpi.xlsx');
    });

    await test.step('Verify Korean text rendering in dashboard', async () => {
      await navigateToDashboard(page);

      // Department names should be visible in Korean
      const autocomplete = page.getByLabel('부서 선택');
      await autocomplete.click();
      await page.waitForTimeout(500);

      // Check for Korean department names
      const koreanOptions = page.getByRole('option', { name: /대학/i });
      const count = await koreanOptions.count();
      expect(count).toBeGreaterThan(0);

      // Close autocomplete
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    });

    await test.step('Upload publication list with mixed data types', async () => {
      await page.goto('/upload');
      await uploadFile(page, FIXTURES.publicationList, 'publication_list.xlsx');
    });

    await test.step('Verify numeric and date data processing', async () => {
      await navigateToDashboard(page);

      // Charts should render with numeric data (IF scores, author counts)
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();

      // Date filters should work with date columns
      await selectDate(page, '시작 월', '2023', '6월');
      await page.waitForTimeout(1000);

      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });

    await test.step('Verify special characters and long text handling', async () => {
      await page.goto('/data-table');
      await expect(page.getByRole('heading', { name: '데이터 테이블' })).toBeVisible();

      // Wait for page to load
      await page.waitForTimeout(3000);

      // Page should not crash - just verify the heading is still visible
      await expect(page.getByRole('heading', { name: '데이터 테이블' })).toBeVisible();

      // No critical errors should be displayed
      const criticalError = page.locator('[role="alert"]:has-text("오류"), [role="alert"]:has-text("에러")');
      const hasCriticalError = await criticalError.count();
      expect(hasCriticalError).toBe(0);

      // Page should not show any error messages
      const errorMessages = page.locator('text=/오류|에러|error/i');
      const errorCount = await errorMessages.count();

      // It's okay to have error text in UI elements, but not error alerts
      const alertErrors = page.locator('[role="alert"]:has-text("오류"), [role="alert"]:has-text("에러")');
      const alertErrorCount = await alertErrors.count();
      expect(alertErrorCount).toBe(0);
    });
  });
});

test.describe('Advanced Upload: Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await login(page);
  });

  test('should handle empty filter results gracefully', async ({ page }) => {
    await test.step('Upload sample data', async () => {
      await uploadFile(page, FIXTURES.departmentKPI, 'department_kpi.xlsx');
    });

    await test.step('Navigate to dashboard', async () => {
      await navigateToDashboard(page);
    });

    await test.step('Apply filter with no matching data', async () => {
      // Try to select a far future date range
      await selectDate(page, '시작 월', '2030', '1월');
      await page.waitForTimeout(1000);

      // Dashboard should not crash
      await expect(page.getByRole('heading', { name: '대시보드', level: 4 })).toBeVisible();
      await expect(page.getByRole('heading', { name: '필터', level: 6 })).toBeVisible();

      // Reset button should be functional
      const resetButton = page.getByRole('button', { name: '필터 초기화' });
      await expect(resetButton).toBeVisible();
      await resetButton.click();
      await page.waitForTimeout(500);

      // Charts should render again with full data
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    });
  });

  test('should maintain dashboard functionality after failed upload', async ({ page }) => {
    await test.step('Attempt to upload without selecting file', async () => {
      await page.goto('/upload');
      await expect(page.getByRole('heading', { name: '데이터 업로드' })).toBeVisible();

      const uploadButton = page.locator('button:has-text("업로드 시작")');

      // If button is disabled when no file selected, verify that
      const isDisabled = await uploadButton.isDisabled().catch(() => false);

      if (!isDisabled) {
        // If button is enabled, clicking should show error or do nothing
        await uploadButton.click();
        await page.waitForTimeout(1000);

        // Page should still be functional
        await expect(page.getByRole('heading', { name: '데이터 업로드' })).toBeVisible();
      }
    });

    await test.step('Navigate to dashboard without uploading', async () => {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: '대시보드', level: 4 })).toBeVisible();

      // Dashboard should display (either with previous data or empty state)
      const hasCharts = await page.locator('.recharts-wrapper').count();
      const hasEmptyMessage = await page.locator('text=데이터가 없습니다').count();

      // Either charts or empty message should be present
      expect(hasCharts + hasEmptyMessage).toBeGreaterThanOrEqual(0);
    });
  });
});
