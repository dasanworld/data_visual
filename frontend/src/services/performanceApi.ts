import api from './api';
import type { PerformanceData, PaginatedResponse, UploadResponse, DashboardSummary, UploadLog } from '../types';

export const performanceApi = {
  // Get all data with optional filters (paginated)
  getData: (params?: { reference_date?: string; department?: string }) =>
    api.get<PaginatedResponse<PerformanceData>>('/data/', { params }),

  // Get single data by ID
  getDataById: (id: number) => api.get<PerformanceData>(`/data/${id}/`),

  // Upload excel file
  uploadExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<UploadResponse>('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Get dashboard summary with optional filters
  getSummary: (params?: {
    reference_date?: string;
    departments?: string;
    start_date?: string;
    end_date?: string;
  }) => api.get<DashboardSummary>('/summary/', { params }),

  // Get upload logs
  getLogs: () => api.get<UploadLog[]>('/logs/'),
};
