import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface MonthlyTrendData {
  reference_date: string;
  revenue: number;
  budget: number;
  expenditure: number;
  papers: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
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

export default function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  // Filter data with actual values and format dates
  const chartData = data
    .filter(item => item.revenue > 0 || item.budget > 0 || item.expenditure > 0)
    .slice(-12) // Last 12 months
    .map(item => ({
      ...item,
      date: item.reference_date.slice(2), // YY-MM format
    }));

  return (
    <Paper sx={{ p: 3, minHeight: 420 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        월별 추이
      </Typography>

      {chartData.length === 0 ? (
        <Box textAlign="center" py={8} color="text.secondary">
          조건에 맞는 데이터가 없습니다.
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="budgetGradientLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradientLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f44336" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatValue} stroke="#999" />
            <Tooltip
              formatter={(value: number | undefined) => [
                value !== undefined ? formatValue(value) : '',
                '',
              ]}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: 'none',
              }}
              labelStyle={{ fontWeight: 'bold', marginBottom: 8 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="매출액"
              stroke="#2196f3"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2196f3', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, fill: '#2196f3', strokeWidth: 2, stroke: '#fff' }}
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="budget"
              name="예산"
              stroke="#4caf50"
              strokeWidth={3}
              dot={{ r: 4, fill: '#4caf50', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, fill: '#4caf50', strokeWidth: 2, stroke: '#fff' }}
              animationDuration={1000}
              animationBegin={200}
            />
            <Line
              type="monotone"
              dataKey="expenditure"
              name="지출"
              stroke="#f44336"
              strokeWidth={3}
              dot={{ r: 4, fill: '#f44336', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, fill: '#f44336', strokeWidth: 2, stroke: '#fff' }}
              animationDuration={1000}
              animationBegin={400}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
