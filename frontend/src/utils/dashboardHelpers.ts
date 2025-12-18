import type { DashboardSummary } from '../types';

export interface FilterState {
  startDate: string | null;
  endDate: string | null;
  departments: string[];
}

/**
 * Applies filters to dashboard summary data
 *
 * @param summary - The dashboard summary data to filter
 * @param filters - The filter criteria to apply
 * @returns Filtered dashboard summary data, or null if input is null
 *
 * Features:
 * - Maintains immutability (creates deep copy)
 * - Handles null/undefined inputs safely
 * - Handles empty arrays gracefully
 * - Applies date range filtering on monthly_trend
 * - Applies department filtering on department_ranking
 */
export function applyFilters(
  summary: DashboardSummary | null,
  filters: FilterState
): DashboardSummary | null {
  // Guard: null or undefined summary
  if (!summary) {
    return null;
  }

  // Guard: ensure arrays exist (defense against malformed data)
  const monthlyTrend = summary.monthly_trend || [];
  const departmentRanking = summary.department_ranking || [];

  // Apply date range filter to monthly_trend
  let filteredTrend = monthlyTrend;
  if (filters.startDate || filters.endDate) {
    filteredTrend = filteredTrend.filter(item => {
      if (filters.startDate && item.reference_date < filters.startDate) {
        return false;
      }
      if (filters.endDate && item.reference_date > filters.endDate) {
        return false;
      }
      return true;
    });
  }

  // Apply department filter to department_ranking
  let filteredRanking = departmentRanking;
  if (filters.departments && filters.departments.length > 0) {
    filteredRanking = filteredRanking.filter(item =>
      filters.departments.includes(item.department)
    );
  }

  // Create deep copies to maintain immutability
  const deepCopyTrend = filteredTrend.map(item => ({ ...item }));
  const deepCopyRanking = filteredRanking.map(item => ({ ...item }));

  // Return new object with deep copied arrays
  return {
    ...summary,
    monthly_trend: deepCopyTrend,
    department_ranking: deepCopyRanking,
  };
}
