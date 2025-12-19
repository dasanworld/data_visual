import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface BudgetExpenseData {
  department: string;
  total_revenue?: number;
  budget?: number;
  expenditure?: number;
}

interface BudgetExpenseChartProps {
  data: BudgetExpenseData[];
}

const formatValue = (value: number) => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return value.toLocaleString();
};

export default function BudgetExpenseChart({ data }: BudgetExpenseChartProps) {
  // Transform data for chart
  const chartData = data.slice(0, 8).map(item => ({
    name: item.department.length > 6 ? item.department.slice(0, 6) + '...' : item.department,
    예산: item.budget || 0,
    지출: item.expenditure || 0,
    매출: item.total_revenue || 0,
  }));

  return (
    <Paper sx={{ p: 3, minHeight: 420 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        부서별 예산 vs 지출
      </Typography>
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <BarChart width={550} height={350} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <defs>
            <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2196f3" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#2196f3" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f44336" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#f44336" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tickFormatter={formatValue} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              value !== undefined ? formatValue(value) : '',
              name || '',
            ]}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          />
          <Legend />
          <Bar
            dataKey="예산"
            fill="url(#budgetGradient)"
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
          />
          <Bar
            dataKey="지출"
            fill="url(#expenseGradient)"
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
            animationBegin={200}
          />
        </BarChart>
      </Box>
    </Paper>
  );
}
