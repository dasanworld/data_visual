import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import { formatNumber } from '../../utils/formatters';

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

export default function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        월별 추이
      </Typography>

      {data.length === 0 ? (
        <Box textAlign="center" py={4} color="text.secondary">
          조건에 맞는 데이터가 없습니다.
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="reference_date"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatNumber}
            />
            <Tooltip
              formatter={(value: number | undefined) => value !== undefined ? formatNumber(value) : ''}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="매출액"
              stroke="#1976d2"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="budget"
              name="예산"
              stroke="#2e7d32"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="expenditure"
              name="지출"
              stroke="#d32f2f"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
