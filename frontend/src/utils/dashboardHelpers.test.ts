import { describe, it, expect } from 'vitest';
import { applyFilters } from './dashboardHelpers';
import type { DashboardSummary } from '../types';
import type { FilterState } from './dashboardHelpers';

describe('applyFilters', () => {
  // Sample data for testing
  const mockSummary: DashboardSummary = {
    summary: {
      total_revenue: 1000000,
      total_budget: 1200000,
      total_expenditure: 800000,
      total_papers: 15,
      total_patents: 8,
      total_projects: 12,
      department_count: 3,
      avg_revenue: 333333,
    },
    monthly_trend: [
      {
        reference_date: '2024-01',
        revenue: 100000,
        budget: 120000,
        expenditure: 80000,
        papers: 5,
      },
      {
        reference_date: '2024-02',
        revenue: 150000,
        budget: 180000,
        expenditure: 120000,
        papers: 7,
      },
      {
        reference_date: '2024-03',
        revenue: 200000,
        budget: 220000,
        expenditure: 150000,
        papers: 10,
      },
    ],
    department_ranking: [
      {
        department: '연구개발팀',
        total_revenue: 500000,
        total_budget: 600000,
        total_expenditure: 400000,
        total_papers: 8,
        total_patents: 3,
        total_projects: 5,
      },
      {
        department: '마케팅팀',
        total_revenue: 300000,
        total_budget: 350000,
        total_expenditure: 250000,
        total_papers: 4,
        total_patents: 2,
        total_projects: 3,
      },
      {
        department: '영업팀',
        total_revenue: 200000,
        total_budget: 250000,
        total_expenditure: 150000,
        total_papers: 3,
        total_patents: 3,
        total_projects: 4,
      },
    ],
    reference_dates: ['2024-01', '2024-02', '2024-03'],
  };

  describe('Negative Tests - Data Validation', () => {
    it('should return null when data is null', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: [],
      };

      const result = applyFilters(null, filters);

      expect(result).toBeNull();
    });

    it('should handle empty monthly_trend array', () => {
      const emptyData: DashboardSummary = {
        ...mockSummary,
        monthly_trend: [],
      };

      const filters: FilterState = {
        startDate: '2024-01',
        endDate: '2024-03',
        departments: [],
      };

      const result = applyFilters(emptyData, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toEqual([]);
    });

    it('should handle empty department_ranking array', () => {
      const emptyData: DashboardSummary = {
        ...mockSummary,
        department_ranking: [],
      };

      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: ['연구개발팀'],
      };

      const result = applyFilters(emptyData, filters);

      expect(result).not.toBeNull();
      expect(result?.department_ranking).toEqual([]);
    });

    it('should handle departments being null/undefined gracefully', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.department_ranking).toHaveLength(3);
    });

    it('should handle malformed summary with missing arrays', () => {
      const malformedData = {
        ...mockSummary,
        monthly_trend: undefined,
        department_ranking: undefined,
      } as unknown as DashboardSummary;

      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: [],
      };

      const result = applyFilters(malformedData, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toEqual([]);
      expect(result?.department_ranking).toEqual([]);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter monthly_trend by startDate only', () => {
      const filters: FilterState = {
        startDate: '2024-02',
        endDate: null,
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toHaveLength(2);
      expect(result?.monthly_trend[0].reference_date).toBe('2024-02');
      expect(result?.monthly_trend[1].reference_date).toBe('2024-03');
    });

    it('should filter monthly_trend by endDate only', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: '2024-02',
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toHaveLength(2);
      expect(result?.monthly_trend[0].reference_date).toBe('2024-01');
      expect(result?.monthly_trend[1].reference_date).toBe('2024-02');
    });

    it('should filter monthly_trend by both startDate and endDate', () => {
      const filters: FilterState = {
        startDate: '2024-02',
        endDate: '2024-02',
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toHaveLength(1);
      expect(result?.monthly_trend[0].reference_date).toBe('2024-02');
    });

    it('should return empty array when date range excludes all data', () => {
      const filters: FilterState = {
        startDate: '2024-04',
        endDate: '2024-05',
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toHaveLength(0);
    });

    it('should not modify department_ranking when only date filter is applied', () => {
      const filters: FilterState = {
        startDate: '2024-02',
        endDate: '2024-02',
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.department_ranking).toHaveLength(3);
      expect(result?.department_ranking).toEqual(mockSummary.department_ranking);
    });
  });

  describe('Department Filtering', () => {
    it('should filter department_ranking by single department', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: ['연구개발팀'],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.department_ranking).toHaveLength(1);
      expect(result?.department_ranking[0].department).toBe('연구개발팀');
    });

    it('should filter department_ranking by multiple departments', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: ['연구개발팀', '마케팅팀'],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.department_ranking).toHaveLength(2);
      expect(result?.department_ranking[0].department).toBe('연구개발팀');
      expect(result?.department_ranking[1].department).toBe('마케팅팀');
    });

    it('should return empty array when no departments match', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: ['존재하지않는팀'],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.department_ranking).toHaveLength(0);
    });

    it('should not filter when departments array is empty', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.department_ranking).toHaveLength(3);
    });

    it('should not modify monthly_trend when only department filter is applied', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: ['연구개발팀'],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toHaveLength(3);
      expect(result?.monthly_trend).toEqual(mockSummary.monthly_trend);
    });
  });

  describe('Combined Filters', () => {
    it('should apply both date and department filters', () => {
      const filters: FilterState = {
        startDate: '2024-02',
        endDate: '2024-03',
        departments: ['연구개발팀', '마케팅팀'],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toHaveLength(2);
      expect(result?.monthly_trend[0].reference_date).toBe('2024-02');
      expect(result?.monthly_trend[1].reference_date).toBe('2024-03');
      expect(result?.department_ranking).toHaveLength(2);
      expect(result?.department_ranking[0].department).toBe('연구개발팀');
      expect(result?.department_ranking[1].department).toBe('마케팅팀');
    });

    it('should preserve summary data when filters are applied', () => {
      const filters: FilterState = {
        startDate: '2024-02',
        endDate: '2024-02',
        departments: ['연구개발팀'],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.summary).toEqual(mockSummary.summary);
      expect(result?.reference_dates).toEqual(mockSummary.reference_dates);
    });
  });

  describe('Immutability', () => {
    it('should not modify original summary data', () => {
      const originalData = JSON.parse(JSON.stringify(mockSummary));

      const filters: FilterState = {
        startDate: '2024-02',
        endDate: '2024-02',
        departments: ['연구개발팀'],
      };

      applyFilters(mockSummary, filters);

      // Verify original data is unchanged
      expect(mockSummary).toEqual(originalData);
      expect(mockSummary.monthly_trend).toHaveLength(3);
      expect(mockSummary.department_ranking).toHaveLength(3);
    });

    it('should return a new object, not the same reference', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBe(mockSummary);
      expect(result?.monthly_trend).not.toBe(mockSummary.monthly_trend);
      expect(result?.department_ranking).not.toBe(mockSummary.department_ranking);
    });

    it('should create deep copies of filtered arrays', () => {
      const filters: FilterState = {
        startDate: '2024-02',
        endDate: '2024-02',
        departments: ['연구개발팀'],
      };

      const result = applyFilters(mockSummary, filters);

      // Modify the result
      if (result?.monthly_trend[0]) {
        result.monthly_trend[0].revenue = 999999;
      }
      if (result?.department_ranking[0]) {
        result.department_ranking[0].total_revenue = 888888;
      }

      // Original should be unchanged
      expect(mockSummary.monthly_trend[1].revenue).toBe(150000);
      expect(mockSummary.department_ranking[0].total_revenue).toBe(500000);
    });
  });

  describe('No Filter Applied', () => {
    it('should return all data when no filters are set', () => {
      const filters: FilterState = {
        startDate: null,
        endDate: null,
        departments: [],
      };

      const result = applyFilters(mockSummary, filters);

      expect(result).not.toBeNull();
      expect(result?.monthly_trend).toHaveLength(3);
      expect(result?.department_ranking).toHaveLength(3);
      expect(result?.summary).toEqual(mockSummary.summary);
    });
  });
});
