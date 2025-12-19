import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridSortModel, GridPaginationModel } from '@mui/x-data-grid';
import { Search as SearchIcon, Download as DownloadIcon } from '@mui/icons-material';
import { performanceApi } from '../services/performanceApi';
import type { StudentRoster } from '../types';

// Status color mapping
const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  '재학': 'success',
  '휴학': 'warning',
  '졸업': 'default',
  '제적': 'error',
};

// Program type color mapping
const programColors: Record<string, 'primary' | 'secondary' | 'info'> = {
  '학사': 'primary',
  '석사': 'secondary',
  '박사': 'info',
};

export default function StudentTable() {
  const [data, setData] = useState<StudentRoster[]>([]);
  const [filteredData, setFilteredData] = useState<StudentRoster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>('');
  const [programFilter, setProgramFilter] = useState<string>('');
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await performanceApi.getStudents();
        const results = response.data.results || [];
        setData(results);
        setFilteredData(results);
      } catch {
        setError('데이터를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Search and filter effect
  useEffect(() => {
    let filtered = data;

    // Apply enrollment status filter
    if (enrollmentFilter) {
      filtered = filtered.filter(row => row.enrollment_status === enrollmentFilter);
    }

    // Apply program type filter
    if (programFilter) {
      filtered = filtered.filter(row => row.program_type === programFilter);
    }

    // Apply search text filter
    if (searchText.trim()) {
      const lowercased = searchText.toLowerCase();
      filtered = filtered.filter(row => {
        return (
          row.student_id.toLowerCase().includes(lowercased) ||
          row.name.toLowerCase().includes(lowercased) ||
          row.college.toLowerCase().includes(lowercased) ||
          row.department.toLowerCase().includes(lowercased) ||
          row.advisor.toLowerCase().includes(lowercased) ||
          row.email.toLowerCase().includes(lowercased)
        );
      });
    }

    setFilteredData(filtered);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, [searchText, data, enrollmentFilter, programFilter]);

  // CSV export handler
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      return;
    }

    const csvData = filteredData.map(row => ({
      학번: row.student_id,
      이름: row.name,
      단과대학: row.college,
      학과: row.department,
      학년: row.grade,
      과정구분: row.program_type,
      학적상태: row.enrollment_status,
      성별: row.gender,
      입학년도: row.admission_year || '',
      지도교수: row.advisor,
      이메일: row.email,
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
      ),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `student_roster_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'student_id',
      headerName: '학번',
      width: 120,
      sortable: true,
    },
    {
      field: 'name',
      headerName: '이름',
      width: 100,
      sortable: true,
    },
    {
      field: 'college',
      headerName: '단과대학',
      width: 120,
      sortable: true,
    },
    {
      field: 'department',
      headerName: '학과',
      width: 140,
      sortable: true,
    },
    {
      field: 'grade',
      headerName: '학년',
      width: 80,
      sortable: true,
      type: 'number',
    },
    {
      field: 'program_type',
      headerName: '과정',
      width: 80,
      sortable: true,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={programColors[params.value as string] || 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'enrollment_status',
      headerName: '학적상태',
      width: 100,
      sortable: true,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={statusColors[params.value as string] || 'default'}
        />
      ),
    },
    {
      field: 'gender',
      headerName: '성별',
      width: 70,
      sortable: true,
    },
    {
      field: 'admission_year',
      headerName: '입학년도',
      width: 100,
      sortable: true,
      type: 'number',
    },
    {
      field: 'advisor',
      headerName: '지도교수',
      width: 100,
      sortable: true,
    },
    {
      field: 'email',
      headerName: '이메일',
      width: 200,
      sortable: true,
    },
  ];

  const handleRetry = () => {
    window.location.reload();
  };

  const clearFilters = () => {
    setSearchText('');
    setEnrollmentFilter('');
    setProgramFilter('');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        학생 명단
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              재시도
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {data.length === 0 && !loading && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          조회된 학생 데이터가 없습니다.
        </Alert>
      )}

      {data.length > 0 && (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="검색"
              variant="outlined"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="학번, 이름, 학과, 교수, 이메일 검색..."
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>학적상태</InputLabel>
              <Select
                value={enrollmentFilter}
                label="학적상태"
                onChange={e => setEnrollmentFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="재학">재학</MenuItem>
                <MenuItem value="휴학">휴학</MenuItem>
                <MenuItem value="졸업">졸업</MenuItem>
                <MenuItem value="제적">제적</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 100 }}>
              <InputLabel>과정</InputLabel>
              <Select
                value={programFilter}
                label="과정"
                onChange={e => setProgramFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="학사">학사</MenuItem>
                <MenuItem value="석사">석사</MenuItem>
                <MenuItem value="박사">박사</MenuItem>
              </Select>
            </FormControl>
            {(searchText || enrollmentFilter || programFilter) && (
              <Button variant="outlined" onClick={clearFilters}>
                필터 초기화
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              sx={{ minWidth: 160 }}
            >
              CSV 내보내기
            </Button>
          </Stack>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              총 {filteredData.length}명 / 전체 {data.length}명
            </Typography>
          </Box>

          {filteredData.length === 0 && (searchText || enrollmentFilter || programFilter) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              검색 조건에 맞는 학생이 없습니다.
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper sx={{ height: 650, width: '100%' }}>
              <DataGrid
                rows={filteredData}
                columns={columns}
                pageSizeOptions={[25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortingOrder={['asc', 'desc']}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                disableRowSelectionOnClick
                sx={{
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              />
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
