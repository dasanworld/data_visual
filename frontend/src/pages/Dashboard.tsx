import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Grid } from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  Receipt,
  Assessment,
  Business,
  Article,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { performanceApi } from '../services/performanceApi';
import type { DashboardSummary } from '../types';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart';
import DepartmentBarChart from '../components/charts/DepartmentBarChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import BudgetExpenseChart from '../components/charts/BudgetExpenseChart';
import ExpenseRatioGauge from '../components/charts/ExpenseRatioGauge';
import ResearchTrendChart from '../components/charts/ResearchTrendChart';
import TopDepartmentsCard from '../components/charts/TopDepartmentsCard';
import SummaryCard from '../components/cards/SummaryCard';
import FilterPanel from '../components/FilterPanel';
import type { FilterState } from '../utils/dashboardHelpers';

const formatCurrency = (value: number) => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return value.toLocaleString();
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    startDate: null,
    endDate: null,
    departments: [],
  });
  const isInitialMount = useRef(true);

  // Fetch data with filters from API
  const fetchData = useCallback(async (filterParams?: FilterState) => {
    try {
      setLoading(true);
      setError(null);

      // Build API params
      const params: {
        departments?: string;
        start_date?: string;
        end_date?: string;
      } = {};

      if (filterParams?.departments && filterParams.departments.length > 0) {
        params.departments = filterParams.departments.join(',');
      }
      if (filterParams?.startDate) {
        params.start_date = filterParams.startDate;
      }
      if (filterParams?.endDate) {
        params.end_date = filterParams.endDate;
      }

      const response = await performanceApi.getSummary(
        Object.keys(params).length > 0 ? params : undefined
      );
      setSummary(response.data);

      // Store all departments on initial load (without filters)
      if (isInitialMount.current) {
        setAllDepartments(response.data.department_ranking.map(d => d.department));
        isInitialMount.current = false;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : '데이터를 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when filters change
  useEffect(() => {
    if (!isInitialMount.current) {
      fetchData(filters);
    }
  }, [filters, fetchData]);

  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Generate category data from summary
  const categoryData = useMemo(() => {
    if (!summary?.summary) return [];

    return [
      { name: '논문', value: summary.summary.total_papers || 0 },
      { name: '특허', value: summary.summary.total_patents || 0 },
      { name: '프로젝트', value: summary.summary.total_projects || 0 },
    ].filter(item => item.value > 0);
  }, [summary]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => fetchData()}>
            재시도
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!summary || (summary.monthly_trend.length === 0 && allDepartments.length === 0)) {
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

  const summaryData = summary.summary;
  const totalResearch =
    (summaryData.total_papers || 0) +
    (summaryData.total_patents || 0) +
    (summaryData.total_projects || 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        대시보드
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <SummaryCard
            title="총 매출액"
            value={formatCurrency(summaryData.total_revenue || 0)}
            icon={TrendingUp}
            color="#2196f3"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <SummaryCard
            title="총 예산"
            value={formatCurrency(summaryData.total_budget || 0)}
            icon={AccountBalance}
            color="#4caf50"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <SummaryCard
            title="총 지출"
            value={formatCurrency(summaryData.total_expenditure || 0)}
            icon={Receipt}
            color="#f44336"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <SummaryCard
            title="지출률"
            value={
              summaryData.total_budget
                ? `${(((summaryData.total_expenditure || 0) / summaryData.total_budget) * 100).toFixed(1)}%`
                : '0%'
            }
            icon={Assessment}
            color="#9c27b0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <SummaryCard
            title="부서 수"
            value={summaryData.department_count || 0}
            icon={Business}
            color="#00bcd4"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <SummaryCard
            title="연구 성과"
            value={totalResearch}
            icon={Article}
            color="#e91e63"
            subtitle={`논문 ${summaryData.total_papers || 0} / 특허 ${summaryData.total_patents || 0} / 프로젝트 ${summaryData.total_projects || 0}`}
          />
        </Grid>
      </Grid>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        availableDepartments={allDepartments}
        availableDates={summary?.reference_dates || []}
      />

      {/* Charts Row 1: Monthly Trend + Expense Gauge */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <MonthlyTrendChart data={summary?.monthly_trend || []} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ExpenseRatioGauge
            budget={summaryData.total_budget || 0}
            expenditure={summaryData.total_expenditure || 0}
          />
        </Grid>
      </Grid>

      {/* Charts Row 2: Budget vs Expense + Research Trend */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <BudgetExpenseChart data={summary?.department_ranking || []} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ResearchTrendChart data={summary?.monthly_trend || []} />
        </Grid>
      </Grid>

      {/* Charts Row 3: Department Bar + Category Pie + Top 5 */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DepartmentBarChart data={summary?.department_ranking || []} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CategoryPieChart data={categoryData} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TopDepartmentsCard data={summary?.department_ranking || []} />
        </Grid>
      </Grid>
    </Box>
  );
}
