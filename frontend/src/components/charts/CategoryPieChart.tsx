import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface CategoryData {
  name: string;
  value: number;
  percentage?: string;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

const COLORS = [
  { start: '#2196f3', end: '#1565c0' },
  { start: '#4caf50', end: '#2e7d32' },
  { start: '#ff9800', end: '#e65100' },
  { start: '#e91e63', end: '#ad1457' },
  { start: '#9c27b0', end: '#6a1b9a' },
  { start: '#00bcd4', end: '#00838f' },
];

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  // Calculate percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartData = data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0',
  }));

  return (
    <Paper sx={{ p: 3, minHeight: 350 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        연구 성과 분포
      </Typography>

      {chartData.length === 0 ? (
        <Box textAlign="center" py={8} color="text.secondary">
          조건에 맞는 데이터가 없습니다.
        </Box>
      ) : (
        <Box sx={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {COLORS.map((color, index) => (
                <linearGradient
                  key={`pieGradient-${index}`}
                  id={`pieGradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color.start} stopOpacity={1} />
                  <stop offset="100%" stopColor={color.end} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              animationDuration={1000}
              label={({ name, payload }) =>
                `${name} ${(payload as CategoryData).percentage || 0}%`
              }
              labelLine={{ stroke: '#999', strokeWidth: 1 }}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#pieGradient-${index % COLORS.length})`}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [
                value !== undefined ? `${value}건` : '',
                name || '',
              ]}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: 'none',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
