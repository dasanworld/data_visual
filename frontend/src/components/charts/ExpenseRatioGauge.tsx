import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface ExpenseRatioGaugeProps {
  budget: number;
  expenditure: number;
}

export default function ExpenseRatioGauge({ budget, expenditure }: ExpenseRatioGaugeProps) {
  const ratio = budget > 0 ? (expenditure / budget) * 100 : 0;
  const displayRatio = Math.min(ratio, 100);

  // Determine color based on ratio
  const getColor = (r: number) => {
    if (r <= 50) return '#4caf50'; // Green
    if (r <= 80) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const color = getColor(ratio);

  const data = [
    { name: 'used', value: displayRatio },
    { name: 'remaining', value: 100 - displayRatio },
  ];

  const formatCurrency = (value: number) => {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억원`;
    }
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만원`;
    }
    return `${value.toLocaleString()}원`;
  };

  return (
    <Paper sx={{ p: 3, minHeight: 350 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        예산 대비 지출률
      </Typography>
      <Box sx={{ position: 'relative', height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={0}
              dataKey="value"
              animationDuration={1000}
            >
              <Cell fill={color} />
              <Cell fill="#e0e0e0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -20%)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, color }}>
            {ratio.toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            지출률
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            총 예산
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2196f3' }}>
            {formatCurrency(budget)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            총 지출
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color }}>
            {formatCurrency(expenditure)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
