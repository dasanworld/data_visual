import { Paper, Typography, Box, LinearProgress, Chip } from '@mui/material';
import { EmojiEvents, TrendingUp } from '@mui/icons-material';

interface DepartmentData {
  department: string;
  total_revenue?: number;
  total_papers?: number;
}

interface TopDepartmentsCardProps {
  data: DepartmentData[];
}

const formatCurrency = (value: number) => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return value.toLocaleString();
};

const getRankColor = (rank: number) => {
  if (rank === 1) return '#ffd700'; // Gold
  if (rank === 2) return '#c0c0c0'; // Silver
  if (rank === 3) return '#cd7f32'; // Bronze
  return '#9e9e9e';
};

export default function TopDepartmentsCard({ data }: TopDepartmentsCardProps) {
  // Show top 5 departments, don't filter out zero values to show all data
  const topDepartments = data.slice(0, 5);

  const maxRevenue = Math.max(...topDepartments.map(d => d.total_revenue || 0), 1);

  return (
    <Paper sx={{ p: 3, minHeight: 350 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <EmojiEvents sx={{ color: '#ffd700' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          TOP 5 부서
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {topDepartments.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            데이터가 없습니다
          </Typography>
        ) : (
          topDepartments.map((dept, index) => (
            <Box key={dept.department}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={index + 1}
                    size="small"
                    sx={{
                      bgcolor: getRankColor(index + 1),
                      color: index < 3 ? '#000' : '#fff',
                      fontWeight: 700,
                      minWidth: 28,
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {dept.department}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    {formatCurrency(dept.total_revenue || 0)}
                  </Typography>
                  {(dept.total_papers || 0) > 0 && (
                    <Chip
                      icon={<TrendingUp sx={{ fontSize: 14 }} />}
                      label={`${dept.total_papers}건`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: 11 } }}
                    />
                  )}
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={((dept.total_revenue || 0) / maxRevenue) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: index === 0 ? '#1976d2' : index === 1 ? '#42a5f5' : '#90caf9',
                  },
                }}
              />
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}
