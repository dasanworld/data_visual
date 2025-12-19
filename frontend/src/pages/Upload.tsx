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
  Chip,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { CloudUpload, Download, Description, Delete, CheckCircle, Error } from '@mui/icons-material';
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

interface FileWithStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
  createdCount?: number;
}

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | null;
    text: string;
  }>({ type: null, text: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  // Add files to selection
  const handleFilesSelect = (files: FileList) => {
    const newFiles: FileWithStatus[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      // Check for duplicates
      const isDuplicate = selectedFiles.some(f => f.file.name === file.name);
      if (isDuplicate) {
        errors.push(`${file.name}: 이미 선택된 파일입니다.`);
        return;
      }

      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        newFiles.push({ file, status: 'pending' });
      }
    });

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }

    if (errors.length > 0) {
      setMessage({ type: 'error', text: errors.join('\n') });
    } else {
      setMessage({ type: null, text: '' });
    }
  };

  // Remove file from selection
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // File button click handler
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // File input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
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
      handleFilesSelect(files);
    }
  };

  // Upload all files sequentially
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: '파일을 선택해주세요.' });
      return;
    }

    setUploading(true);
    setMessage({ type: null, text: '' });
    setUploadProgress(0);

    let totalCreated = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileWithStatus = selectedFiles[i];

      // Skip already processed files
      if (fileWithStatus.status === 'success') {
        successCount++;
        continue;
      }

      // Update status to uploading
      setSelectedFiles(prev =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      );

      try {
        const response = await performanceApi.uploadExcel(fileWithStatus.file);
        const createdCount = response.data.created_count;
        totalCreated += createdCount;
        successCount++;

        // Update status to success
        setSelectedFiles(prev =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'success', createdCount, message: `${createdCount}개 저장됨` }
              : f
          )
        );
      } catch (error) {
        errorCount++;
        const errorMessage =
          (error as { response?: { data?: { error?: string } } }).response?.data?.error ||
          '업로드 실패';

        // Update status to error
        setSelectedFiles(prev =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'error', message: errorMessage } : f))
        );
      }

      // Update progress
      setUploadProgress(((i + 1) / selectedFiles.length) * 100);
    }

    setUploading(false);

    // Show final message
    if (errorCount === 0) {
      setMessage({
        type: 'success',
        text: `모든 파일 업로드 완료! 총 ${totalCreated}개의 데이터가 저장되었습니다.`,
      });

      // Redirect to data table after 2 seconds
      setTimeout(() => {
        navigate('/data');
      }, 2000);
    } else if (successCount > 0) {
      setMessage({
        type: 'info',
        text: `${successCount}개 파일 성공, ${errorCount}개 파일 실패. 총 ${totalCreated}개 데이터 저장.`,
      });
    } else {
      setMessage({
        type: 'error',
        text: '모든 파일 업로드에 실패했습니다.',
      });
    }
  };

  // Clear all files
  const handleClearAll = () => {
    setSelectedFiles([]);
    setMessage({ type: null, text: '' });
    setUploadProgress(0);
  };

  const getStatusIcon = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" fontSize="small" />;
      case 'error':
        return <Error color="error" fontSize="small" />;
      case 'uploading':
        return <CircularProgress size={16} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
        return 'primary';
      default:
        return 'default';
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
          onClick={handleFileButtonClick}
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
            '&:hover': {
              borderColor: 'primary.light',
              bgcolor: 'action.hover',
            },
          }}
        >
          <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="body1" gutterBottom>
            파일을 여기에 드래그하거나 클릭하여 선택하세요
          </Typography>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
            여러 파일을 한번에 선택할 수 있습니다
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            지원 형식: .xlsx, .xls, .csv (최대 10MB)
          </Typography>
        </Box>

        {/* Hidden file input - multiple enabled */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xlsx,.xls,.csv"
          multiple
          onChange={handleFileInputChange}
        />

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                선택된 파일 ({selectedFiles.length}개)
              </Typography>
              <Button size="small" color="error" onClick={handleClearAll} disabled={uploading}>
                전체 삭제
              </Button>
            </Box>
            <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
              <List dense>
                {selectedFiles.map((fileWithStatus, index) => (
                  <ListItem
                    key={`${fileWithStatus.file.name}-${index}`}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {fileWithStatus.message && (
                          <Typography variant="caption" color="text.secondary">
                            {fileWithStatus.message}
                          </Typography>
                        )}
                        {getStatusIcon(fileWithStatus.status)}
                        {fileWithStatus.status === 'pending' && (
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveFile(index)}
                            disabled={uploading}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Description fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={fileWithStatus.file.name}
                      secondary={`${(fileWithStatus.file.size / 1024).toFixed(1)} KB`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <Chip
                      label={
                        fileWithStatus.status === 'pending'
                          ? '대기'
                          : fileWithStatus.status === 'uploading'
                            ? '업로드 중'
                            : fileWithStatus.status === 'success'
                              ? '완료'
                              : '실패'
                      }
                      size="small"
                      color={getStatusColor(fileWithStatus.status)}
                      sx={{ mr: 1 }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Upload progress */}
            {uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {Math.round(uploadProgress)}% 완료
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={handleFileButtonClick}
            disabled={uploading}
          >
            파일 추가
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading ? '업로드 중...' : `업로드 시작 (${selectedFiles.length}개 파일)`}
          </Button>
        </Box>
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
        <Alert severity={message.type} sx={{ mt: 2, whiteSpace: 'pre-line' }}>
          {message.text}
        </Alert>
      )}

      {/* Loading overlay */}
      <Backdrop open={uploading} sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
            파일 업로드 중... ({Math.round(uploadProgress)}%)
          </Typography>
        </Box>
      </Backdrop>
    </Box>
  );
}
