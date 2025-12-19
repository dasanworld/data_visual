import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface DepartmentRankingData {
  department: string;
  total_revenue: number;
  total_papers: number;
}

interface DepartmentBarChartProps {
  data: DepartmentRankingData[];
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

export default function DepartmentBarChart({ data }: DepartmentBarChartProps) {
  // Display top 10 departments
  const topDepartments = data.slice(0, 10);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        부서별 실적 (상위 10개)
      </Typography>

      {topDepartments.length === 0 ? (
        <Box textAlign="center" py={8} color="text.secondary">
          조건에 맞는 데이터가 없습니다.
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topDepartments} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <defs>
              <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2196f3" stopOpacity={1} />
                <stop offset="100%" stopColor="#1565c0" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="papersBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff9800" stopOpacity={1} />
                <stop offset="100%" stopColor="#e65100" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="department"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={100}
              stroke="#999"
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatValue} stroke="#999" />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [
                value !== undefined ? formatValue(value) : '',
                name || '',
              ]}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: 'none',
              }}
              labelStyle={{ fontWeight: 'bold', marginBottom: 8 }}
            />
            <Legend wrapperStyle={{ paddingTop: 16 }} iconType="circle" />
            <Bar
              dataKey="total_revenue"
              name="총 매출액"
              fill="url(#revenueBarGradient)"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            />
            <Bar
              dataKey="total_papers"
              name="총 논문 수"
              fill="url(#papersBarGradient)"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
              animationBegin={200}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
