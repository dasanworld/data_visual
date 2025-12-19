import api from './api';
import type { PerformanceData, PaginatedResponse, UploadResponse, DashboardSummary, UploadLog, StudentRoster } from '../types';

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

  // Get student roster data
  getStudents: (params?: {
    department?: string;
    enrollment_status?: string;
    program_type?: string;
    college?: string;
  }) => api.get<PaginatedResponse<StudentRoster>>('/students/', { params }),

  // Get single student by ID
  getStudentById: (id: number) => api.get<StudentRoster>(`/students/${id}/`),
};
