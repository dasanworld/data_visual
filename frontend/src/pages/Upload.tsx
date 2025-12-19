import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Backdrop,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { CloudUpload, Download, Description } from '@mui/icons-material';
import { performanceApi } from '../services/performanceApi';

// 샘플 데이터 파일 목록
const SAMPLE_FILES = [
  { name: 'sample_data.xlsx', description: '기본 샘플 데이터 (5개 부서, Excel)' },
  { name: 'sample_data.csv', description: '기본 샘플 데이터 (5개 부서, CSV)' },
  { name: 'department_kpi.xlsx', description: '부서별 KPI 데이터' },
  { name: 'publication_list.xlsx', description: '연구 논문 목록' },
  { name: 'research_project_data.xlsx', description: '연구 프로젝트 데이터' },
  { name: 'large_dataset.xlsx', description: '대용량 데이터셋 (1000개 행)' },
];

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });
  const [isDragging, setIsDragging] = useState(false);

  // File validation
  const validateFile = (file: File): string | null => {
    // 1. File extension validation
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return '지원하지 않는 파일 형식입니다. .xlsx, .xls 또는 .csv 파일을 업로드하세요.';
    }

    // 2. File size validation (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return '파일 크기가 10MB를 초과합니다.';
    }

    return null; // Validation success
  };

  // File selection handler
  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setMessage({ type: 'error', text: error });
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
      setMessage({ type: null, text: '' });
    }
  };

  // File button click handler
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // File input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Upload execution
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: '파일을 선택해주세요.' });
      return;
    }

    setUploading(true);
    setMessage({ type: null, text: '' });

    try {
      const response = await performanceApi.uploadExcel(selectedFile);

      setMessage({
        type: 'success',
        text: `업로드 완료! ${response.data.created_count}개의 데이터가 저장되었습니다.`,
      });

      // Redirect to data table after 2 seconds to show uploaded data
      setTimeout(() => {
        navigate('/data');
      }, 2000);
    } catch (error) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ||
        '업로드 중 오류가 발생했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      {/* Title */}
      <Typography variant="h4" gutterBottom>
        데이터 업로드
      </Typography>

      {/* Upload area */}
      <Paper sx={{ p: 4, mt: 2 }}>
        {/* Drag & Drop Zone */}
        <Box
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          sx={{
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: isDragging ? 'action.hover' : 'transparent',
            cursor: 'pointer',
            mb: 3,
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="body1" gutterBottom>
            파일을 여기에 드래그하거나 버튼을 클릭하세요
          </Typography>
          <Typography variant="caption" color="text.secondary">
            지원 형식: .xlsx, .xls, .csv (최대 10MB)
          </Typography>
        </Box>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
        />

        {/* File selection button */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={handleFileButtonClick}
            disabled={uploading}
          >
            파일 선택
          </Button>

          {/* Selected filename */}
          {selectedFile && (
            <Typography variant="body2" color="text.secondary">
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </Typography>
          )}
        </Box>

        {/* Upload button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          sx={{ mt: 2 }}
        >
          {uploading ? '업로드 중...' : '업로드 시작'}
        </Button>
      </Paper>

      {/* Sample Data Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          <Download sx={{ verticalAlign: 'middle', mr: 1 }} />
          샘플 데이터 다운로드
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          테스트용 샘플 엑셀 파일을 다운로드하여 업로드해보세요.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <List dense>
          {SAMPLE_FILES.map(file => (
            <ListItem key={file.name} disablePadding>
              <ListItemButton
                component="a"
                href={`/samples/${file.name}`}
                download={file.name}
              >
                <ListItemIcon>
                  <Description color="primary" />
                </ListItemIcon>
                <ListItemText primary={file.name} secondary={file.description} />
                <Download fontSize="small" color="action" />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Success/Error message */}
      {message.type && (
        <Alert severity={message.type} sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Loading overlay */}
      <Backdrop open={uploading} sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
            업로드 중입니다...
          </Typography>
        </Box>
      </Backdrop>
    </Box>
  );
}
