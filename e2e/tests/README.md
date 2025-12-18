# E2E Test Suite

This directory contains end-to-end tests for the data visualization dashboard application.

## Test Files

### 1. smoke.spec.ts
Core user journey test that validates the critical path:
- Admin login
- Navigate to Excel upload page
- Upload sample file
- Verify redirect to dashboard and data rendering
- Navigation between main pages

### 2. dashboard-filter.spec.ts
Dashboard filter functionality tests:
- Display filter panel with all controls
- Filter by date range using MUI DatePicker
- Filter by departments using MUI Autocomplete
- Apply combined filters (date + departments)
- Reset all filters
- Handle empty filter results
- Maintain filter state when navigating

### 3. advanced-upload.spec.ts
Comprehensive upload and filtering tests with multiple data types:

#### Test Coverage (11 tests total):

**Department KPI Tests (3 tests)**
- Upload and filter by year (2023, 2024, 2025)
- Upload and filter by department (공과대학, 인문대학)
- Upload and filter with combined filters (year + department)

**Publication List Tests (2 tests)**
- Upload and filter by date range (2023-2024)
- Upload and filter by department and journal grade

**Research Project Tests (2 tests)**
- Upload and filter by execution date
- Upload and filter by department

**Large File Processing Test (1 test)**
- Upload 1200-row dataset
- Verify performance (< 10 seconds)
- Apply filters to large dataset
- Verify no memory leaks with multiple filter operations

**Data Type Diversity Test (1 test)**
- Handle Korean text correctly
- Process numeric and date data types
- Handle special characters and long text

**Error Handling Tests (2 tests)**
- Handle empty filter results gracefully
- Maintain dashboard functionality after failed upload

## Test Fixtures

Located in `/e2e/fixtures/`:

| File | Rows | Description |
|------|------|-------------|
| `sample_data.xlsx` | Varies | Basic sample data for smoke tests |
| `department_kpi.xlsx` | 18 | Department KPI data (3 years × 6 departments) |
| `publication_list.xlsx` | 150 | Publication list with dates and journal grades |
| `research_project_data.xlsx` | 200 | Research project data with execution dates and agencies |
| `large_dataset.xlsx` | 1200 | Large dataset for performance testing |

### Generating Fixtures

To regenerate test fixtures:

```bash
cd fixtures
python3 -m venv .venv
source .venv/bin/activate
pip install pandas openpyxl
python create_advanced_fixtures.py
```

## Test Principles

All tests follow these principles:

1. **User-Facing Locators Only**
   - Use `getByRole`, `getByLabel`, `getByText`
   - NO id, xpath, or CSS class selectors
   - Ensures tests reflect actual user interactions

2. **Performance Requirements**
   - Each test completes within 30 seconds
   - Large file processing within 10 seconds
   - Navigation timeout: 30 seconds
   - Action timeout: 10 seconds

3. **Screenshots on Failure Only**
   - Configured in `playwright.config.ts`
   - Reduces test output size

4. **Test Independence**
   - Each test can run in isolation
   - `beforeEach` handles login and cleanup
   - No shared state between tests

5. **Error Handling**
   - Tests verify graceful degradation
   - Empty states are handled correctly
   - No crashes on invalid input

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test tests/advanced-upload.spec.ts
```

### Run with UI mode
```bash
npm run test:ui
```

### Run in headed mode (see browser)
```bash
npm run test:headed
```

### Debug mode
```bash
npm run test:debug
```

### View test report
```bash
npm run report
```

## Test Credentials

Tests use the following credentials (configurable via environment variables):

```bash
TEST_USERNAME=testadmin
TEST_PASSWORD=testpass123
```

Set these in your environment or `.env` file before running tests.

## MUI Component Testing Patterns

### DatePicker
```typescript
const dateGroup = page.getByRole('group', { name: '시작 월' });
await dateGroup.locator('[contenteditable="true"]').first().click();
const yearButton = page.getByRole('button', { name: /2024/i }).first();
await yearButton.click();
const monthButton = page.getByRole('button', { name: /1월/i }).first();
await monthButton.click();
```

### Autocomplete
```typescript
const autocomplete = page.getByLabel('부서 선택');
await autocomplete.click();
const option = page.getByRole('option', { name: /공과대학/i });
await option.click();
// Verify chip
await expect(page.getByRole('button', { name: /공과대학/i })).toBeVisible();
```

## Helper Functions

The test files include reusable helper functions:

- `login(page)` - Login with test credentials
- `uploadFile(page, filePath, fileName)` - Upload Excel file
- `navigateToDashboard(page)` - Navigate to dashboard and wait for load
- `selectDate(page, groupName, year, month)` - Select date in MUI DatePicker
- `selectDepartment(page, departmentText)` - Select department in Autocomplete

## CI/CD Integration

Tests are configured for CI/CD with:
- Retry on failure (2 retries in CI)
- Single worker (sequential execution)
- HTML and list reporters
- Trace collection on first retry

## Troubleshooting

### Test Timeout
If tests timeout:
1. Check if Django backend is running
2. Check if Vite dev server is running
3. Increase timeout in `playwright.config.ts`

### File Upload Fails
1. Verify fixture files exist in `/e2e/fixtures/`
2. Check file paths are absolute
3. Run fixture generation script

### Filter Tests Fail
1. Verify MUI components render correctly
2. Check for JavaScript errors in console
3. Ensure data is loaded before applying filters

### Large File Test Fails
1. Check available memory
2. Verify Django settings for file upload size
3. Check database query performance

## Performance Benchmarks

Expected performance based on test requirements:

| Operation | Max Time |
|-----------|----------|
| File upload (< 100 rows) | 5 seconds |
| File upload (1000+ rows) | 10 seconds |
| Dashboard rendering | 10 seconds |
| Filter application | 2 seconds |
| Navigation | 5 seconds |

## Future Enhancements

Potential test additions:
- API-level tests for backend endpoints
- Visual regression testing with Percy/Applitools
- Accessibility testing with axe-core
- Mobile responsive tests
- Cross-browser testing (Firefox, Safari)
- Performance profiling with Lighthouse
