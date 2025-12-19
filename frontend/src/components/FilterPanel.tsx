import { SyntheticEvent } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete, Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale/ko';
import { format } from 'date-fns/format';

interface FilterState {
  startDate: string | null;
  endDate: string | null;
  departments: string[];
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  availableDepartments: string[];
  availableDates: string[];
}

export default function FilterPanel({
  filters,
  onFilterChange,
  availableDepartments,
}: FilterPanelProps) {
  const handleStartDateChange = (date: Date | null) => {
    onFilterChange({
      startDate: date ? format(date, 'yyyy-MM') : null,
    });
  };

  const handleEndDateChange = (date: Date | null) => {
    onFilterChange({
      endDate: date ? format(date, 'yyyy-MM') : null,
    });
  };

  const handleDepartmentChange = (_: SyntheticEvent, newValue: string[]) => {
    onFilterChange({ departments: newValue });
  };

  const handleReset = () => {
    onFilterChange({
      startDate: null,
      endDate: null,
      departments: [],
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        필터
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
          <DatePicker
            label="시작 월"
            views={['year', 'month']}
            value={filters.startDate ? new Date(filters.startDate) : null}
            onChange={handleStartDateChange}
            slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
          />

          <DatePicker
            label="종료 월"
            views={['year', 'month']}
            value={filters.endDate ? new Date(filters.endDate) : null}
            onChange={handleEndDateChange}
            slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
          />
        </LocalizationProvider>

        <Autocomplete
          multiple
          options={availableDepartments}
          value={filters.departments}
          onChange={handleDepartmentChange}
          renderInput={params => <TextField {...params} label="부서 선택" size="small" />}
          sx={{ width: 300 }}
        />

        <Button variant="outlined" onClick={handleReset}>
          필터 초기화
        </Button>
      </Box>
    </Paper>
  );
}
