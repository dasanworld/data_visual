import { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { performanceApi } from '../services/performanceApi';
import type { DashboardSummary } from '../types';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart';
import DepartmentBarChart from '../components/charts/DepartmentBarChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import FilterPanel from '../components/FilterPanel';

interface FilterState {
  startDate: string | null;
  endDate: string | null;
  departments: string[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    startDate: null,
    endDate: null,
    departments: [],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await performanceApi.getSummary();
      setSummary(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    if (!summary) return null;

    let trend = summary.monthly_trend;
    let ranking = summary.department_ranking;

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      trend = trend.filter(item => {
        if (filters.startDate && item.reference_date < filters.startDate) return false;
        if (filters.endDate && item.reference_date > filters.endDate) return false;
        return true;
      });
    }

    // Apply department filter
    if (filters.departments.length > 0) {
      ranking = ranking.filter(item =>
        filters.departments.includes(item.department)
      );
    }

    return { ...summary, monthly_trend: trend, department_ranking: ranking };
  }, [summary, filters]);

  // Generate category data from summary
  const categoryData = useMemo(() => {
    if (!filteredData?.summary) return [];

    return [
      { name: '논문', value: filteredData.summary.total_papers || 0 },
      { name: '특허', value: filteredData.summary.total_patents || 0 },
      { name: '프로젝트', value: filteredData.summary.total_projects || 0 },
    ].filter(item => item.value > 0);
  }, [filteredData]);

  // Extract unique departments for filter
  const availableDepartments = useMemo(() => {
    if (!summary) return [];
    return summary.department_ranking.map(item => item.department);
  }, [summary]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={fetchData}>
            재시도
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!summary || summary.monthly_trend.length === 0) {
    return (
      <Alert
        severity="info"
        action={
          <Button color="inherit" onClick={() => navigate('/upload')}>
            업로드 페이지로 이동
          </Button>
        }
      >
        데이터가 없습니다. 엑셀을 업로드하세요.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>

      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        availableDepartments={availableDepartments}
        availableDates={summary?.reference_dates || []}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <MonthlyTrendChart data={filteredData?.monthly_trend || []} />
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
            <DepartmentBarChart data={filteredData?.department_ranking || []} />
          </Box>

          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
            <CategoryPieChart data={categoryData} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
