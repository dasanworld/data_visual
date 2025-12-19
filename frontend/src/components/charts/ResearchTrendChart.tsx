import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface ResearchData {
  reference_date: string;
  papers?: number;
  patents?: number;
  projects?: number;
}

interface ResearchTrendChartProps {
  data: ResearchData[];
}

export default function ResearchTrendChart({ data }: ResearchTrendChartProps) {
  // Filter data with actual values and sort by date
  const chartData = data
    .filter(item => (item.papers || 0) + (item.patents || 0) + (item.projects || 0) > 0)
    .slice(-12) // Last 12 months
    .map(item => ({
      date: item.reference_date.slice(2), // YY-MM format
      논문: item.papers || 0,
      특허: item.patents || 0,
      프로젝트: item.projects || 0,
    }));

  return (
    <Paper sx={{ p: 3, minHeight: 420 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        연구 성과 트렌드
      </Typography>
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <AreaChart width={550} height={350} data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPapers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2196f3" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorPatents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#4caf50" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff9800" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ff9800" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="논문"
            stackId="1"
            stroke="#2196f3"
            fill="url(#colorPapers)"
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="특허"
            stackId="1"
            stroke="#4caf50"
            fill="url(#colorPatents)"
            animationDuration={1000}
            animationBegin={200}
          />
          <Area
            type="monotone"
            dataKey="프로젝트"
            stackId="1"
            stroke="#ff9800"
            fill="url(#colorProjects)"
            animationDuration={1000}
            animationBegin={400}
          />
        </AreaChart>
      </Box>
    </Paper>
  );
}
