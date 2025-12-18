import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import { formatNumber } from '../../utils/formatters';

interface DepartmentRankingData {
  department: string;
  total_revenue: number;
  total_papers: number;
}

interface DepartmentBarChartProps {
  data: DepartmentRankingData[];
}

export default function DepartmentBarChart({ data }: DepartmentBarChartProps) {
  // Display top 10 departments
  const topDepartments = data.slice(0, 10);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        부서별 실적 (상위 10개)
      </Typography>

      {topDepartments.length === 0 ? (
        <Box textAlign="center" py={4} color="text.secondary">
          조건에 맞는 데이터가 없습니다.
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topDepartments} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="department"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatNumber}
            />
            <Tooltip
              formatter={(value: number | undefined) => value !== undefined ? formatNumber(value) : ''}
            />
            <Legend />
            <Bar
              dataKey="total_revenue"
              name="총 매출액"
              fill="#1976d2"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="total_papers"
              name="총 논문 수"
              fill="#f57c00"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
