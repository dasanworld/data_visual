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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridSortModel, GridPaginationModel } from '@mui/x-data-grid';
import { Search as SearchIcon, Download as DownloadIcon } from '@mui/icons-material';
import { performanceApi } from '../services/performanceApi';
import type { PerformanceData } from '../types';

export default function DataTable() {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [filteredData, setFilteredData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
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
        const response = await performanceApi.getData();
        // API returns paginated response with results array
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

  // Search filter effect
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredData(data);
      return;
    }

    const lowercased = searchText.toLowerCase();
    const filtered = data.filter(row => {
      return (
        row.reference_date.toLowerCase().includes(lowercased) ||
        row.department.toLowerCase().includes(lowercased) ||
        row.department_code.toLowerCase().includes(lowercased) ||
        row.revenue.toString().includes(lowercased) ||
        row.budget.toString().includes(lowercased)
      );
    });

    setFilteredData(filtered);
    setPaginationModel({ page: 0, pageSize: 50 });
  }, [searchText, data]);

  // CSV export handler
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      return;
    }

    // Create CSV data
    const csvData = filteredData.map(row => ({
      날짜: row.reference_date,
      부서: row.department,
      부서코드: row.department_code,
      매출액: row.revenue,
      예산: row.budget,
    }));

    // Generate CSV string
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
      ),
    ].join('\n');

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Trigger download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `data_export_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'reference_date',
      headerName: '날짜',
      width: 150,
      sortable: true,
    },
    {
      field: 'department',
      headerName: '부서',
      width: 200,
      sortable: true,
    },
    {
      field: 'department_code',
      headerName: '부서코드',
      width: 150,
      sortable: true,
    },
    {
      field: 'revenue',
      headerName: '매출액',
      width: 180,
      sortable: true,
      type: 'number',
      valueFormatter: (value: number | undefined) => {
        return value != null ? value.toLocaleString('ko-KR') : '0';
      },
    },
    {
      field: 'budget',
      headerName: '예산',
      width: 180,
      sortable: true,
      type: 'number',
      valueFormatter: (value: number | undefined) => {
        return value != null ? value.toLocaleString('ko-KR') : '0';
      },
    },
  ];

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        데이터 테이블
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
          조회된 데이터가 없습니다. 엑셀을 업로드하세요.
        </Alert>
      )}

      {data.length > 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="검색"
              variant="outlined"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="날짜, 부서, 부서코드, 금액 검색..."
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              sx={{ minWidth: 160 }}
            >
              CSV 내보내기
            </Button>
          </Box>

          {filteredData.length === 0 && searchText && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              검색 결과가 없습니다. 다른 검색어를 시도하세요.
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
                pageSizeOptions={[50]}
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
