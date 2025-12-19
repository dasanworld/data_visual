// Paginated response type
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Performance data type
export interface PerformanceData {
  id: number;
  reference_date: string;
  department: string;
  department_code: string;
  revenue: number;
  budget: number;
  expenditure: number;
  paper_count: number;
  patent_count: number;
  project_count: number;
  extra_metric_1?: number;
  extra_metric_2?: number;
  extra_text?: string;
  created_at: string;
  updated_at: string;
}

// Upload response type
export interface UploadResponse {
  message: string;
  reference_dates: string[];
  created_count: number;
  warnings?: string[];
}

// Dashboard summary type
export interface DashboardSummary {
  summary: {
    total_revenue: number;
    total_budget: number;
    total_expenditure: number;
    total_papers: number;
    total_patents: number;
    total_projects: number;
    department_count: number;
    avg_revenue: number;
  };
  monthly_trend: Array<{
    reference_date: string;
    revenue: number;
    budget: number;
    expenditure: number;
    papers: number;
    patents: number;
    projects: number;
  }>;
  department_ranking: Array<{
    department: string;
    total_revenue: number;
    total_budget: number;
    total_expenditure: number;
    total_papers: number;
    total_patents: number;
    total_projects: number;
  }>;
  reference_dates: string[];
}

// Upload log type
export interface UploadLog {
  id: number;
  reference_date: string;
  filename: string;
  row_count: number;
  status: 'success' | 'failed';
  error_message: string;
  uploaded_by_name: string;
  created_at: string;
}

// Student roster type
export interface StudentRoster {
  id: number;
  student_id: string;
  name: string;
  college: string;
  department: string;
  grade: number;
  program_type: '학사' | '석사' | '박사';
  enrollment_status: '재학' | '휴학' | '졸업' | '제적';
  gender: string;
  admission_year: number | null;
  advisor: string;
  email: string;
  created_at: string;
  updated_at: string;
}
