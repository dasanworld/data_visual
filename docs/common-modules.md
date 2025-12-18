# 공통 모듈 계획서 (Common Modules Plan)

**문서 버전:** 1.0
**작성일:** 2025-12-18
**프로젝트명:** 대학 데이터 시각화 대시보드
**작성자:** common-task-planner agent

---

## 문서 목적

페이지 단위 개발을 시작하기 전에 백엔드와 프론트엔드의 공통 로직과 라이브러리를 정의하여:
- 페이지별 병렬 개발 가능하도록 인터페이스 통일
- 중복 코드 제거 및 유지보수성 향상
- 코드 충돌 최소화 및 일관성 보장

---

## 프로젝트 현황 분석

### 기술 스택 (techstack.md 기준)
- **Backend:** Python 3.11+, Django 5.x, DRF, Pandas
- **Frontend:** React (Vite), TypeScript, MUI, Recharts
- **Database:** Supabase PostgreSQL
- **Infrastructure:** Railway, Docker, Whitenoise
- **Auth:** Django Native (Session/Token)

### 현재 구현 상태
**Backend (구현 완료):**
- ✅ Django 프로젝트 기본 설정 (`backend/config/settings.py`)
- ✅ CORS, Whitenoise 설정
- ✅ 데이터 모델 (`PerformanceData`, `UploadLog`)
- ✅ API 엔드포인트 (엑셀 업로드, 데이터 조회, 대시보드 요약)
- ✅ Atomic Transaction 기반 엑셀 파싱
- ✅ DRF ViewSet, Serializer 패턴

**Frontend (미구현):**
- ❌ Vite + TypeScript 프로젝트 초기화
- ❌ MUI 테마 설정
- ❌ API 클라이언트 (axios wrapper)
- ❌ 공통 레이아웃 컴포넌트
- ❌ 라우팅 설정

**Infrastructure (구현 완료):**
- ✅ Dockerfile (Multi-stage build)
- ✅ 환경변수 설정 (`.env.example`)

---

## 1. Backend 공통 모듈

### 1.1 Django 프로젝트 설정 (완료)

**파일:** `/backend/config/settings.py`

**구현된 설정:**
- ✅ Supabase PostgreSQL 연결 (`dj-database-url`)
- ✅ Whitenoise 정적 파일 서빙
- ✅ CORS 설정 (개발/프로덕션 분리)
- ✅ DRF 인증 (SessionAuthentication, TokenAuthentication)
- ✅ Logging 설정 (Console handler)
- ✅ 국제화 설정 (ko-kr, Asia/Seoul)

**핵심 설정 포인트:**
```python
# 정적 파일: React 빌드 결과물 서빙
STATIC_ROOT = BASE_DIR / 'staticfiles_collected'
STATICFILES_DIRS = [BASE_DIR / 'staticfiles']
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# DRF 인증: Session + Token 병행
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

**추가 작업 불필요:** 페이지 개발 시 그대로 사용 가능.

---

### 1.2 데이터 모델 (완료)

**파일:** `/backend/api/models.py`

**구현된 모델:**

#### 1.2.1 PerformanceData
- **목적:** 이카운트 엑셀 데이터 저장
- **핵심 필드:**
  - `reference_date` (YYYY-MM): 데이터 교체 기준
  - `department`, `department_code`: 부서 정보
  - `revenue`, `budget`, `expenditure`: 재무 지표
  - `paper_count`, `patent_count`, `project_count`: 연구 실적
  - `extra_metric_1`, `extra_metric_2`, `extra_text`: 확장 필드
- **인덱스:**
  - `reference_date` (단일)
  - `department` (단일)
  - `(reference_date, department)` (복합)

#### 1.2.2 UploadLog
- **목적:** 엑셀 업로드 이력 관리
- **핵심 필드:**
  - `reference_date`, `filename`, `row_count`
  - `status` (success/failed)
  - `error_message`
  - `uploaded_by` (ForeignKey to User)

**페이지별 개발 가이드:**
- 모든 페이지는 `PerformanceData` 모델을 직접 조회
- 필터링: `reference_date`, `department` 사용
- 집계: 프론트엔드에서 처리 (DB 부하 최소화)

---

### 1.3 API 구조 (완료)

**파일:** `/backend/api/views.py`, `/backend/api/serializers.py`

**구현된 API 엔드포인트:**

| Endpoint | Method | 인증 | 설명 |
|----------|--------|------|------|
| `/api/upload/` | POST | Required | 엑셀 업로드 (Atomic Transaction) |
| `/api/data/` | GET | Required | 전체 데이터 조회 (필터링 지원) |
| `/api/data/{id}/` | GET | Required | 단일 데이터 조회 |
| `/api/summary/` | GET | Required | 대시보드 요약 (집계 데이터) |
| `/api/logs/` | GET | Required | 업로드 이력 조회 |

**공통 API 패턴:**
```python
# ViewSet 패턴 (CRUD)
class PerformanceDataViewSet(viewsets.ModelViewSet):
    queryset = PerformanceData.objects.all()
    serializer_class = PerformanceDataSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 쿼리 파라미터 기반 필터링
        queryset = super().get_queryset()
        reference_date = self.request.query_params.get('reference_date')
        if reference_date:
            queryset = queryset.filter(reference_date=reference_date)
        return queryset
```

**페이지별 개발 가이드:**
- 새 API 추가 시 `api/views.py`에 View 추가
- `api/urls.py`에 라우팅 등록
- Serializer는 `api/serializers.py`에 정의
- 인증 필수: `permission_classes = [IsAuthenticated]`

---

### 1.4 엑셀 파싱 로직 (완료)

**파일:** `/backend/api/views.py` - `ExcelUploadView`

**핵심 구현:**
```python
with transaction.atomic():
    # 1. 기존 데이터 삭제 (reference_date 기준)
    PerformanceData.objects.filter(
        reference_date=extracted_date
    ).delete()

    # 2. 신규 데이터 bulk_create
    PerformanceData.objects.bulk_create(
        performance_objects,
        batch_size=1000
    )

    # 3. 업로드 이력 기록
    UploadLog.objects.create(...)
```

**컬럼 매핑:**
- 한글/영문 컬럼명 자동 매핑 (`COLUMN_MAPPING`)
- 날짜 형식 정규화 (YYYY-MM, YYYYMM, YYYY/MM)
- 데이터 타입 변환 (Decimal, Integer)

**에러 처리:**
- 파일 형식 검증 (.xlsx, .xls)
- 필수 컬럼 존재 확인
- Transaction 롤백 (에러 발생 시)

**페이지별 개발 가이드:**
- 엑셀 업로드 페이지는 이 View를 그대로 사용
- 추가 검증 로직 필요 시 `_parse_row()` 메서드 수정

---

### 1.5 인증 미들웨어 (완료)

**Django Native Auth 사용:**
- Django Admin 로그인 (`/admin/login/`)
- Session 기반 인증 (쿠키)
- Token 인증 지원 (API 전용)

**설정:**
```python
# settings.py
MIDDLEWARE = [
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
}
```

**페이지별 개발 가이드:**
- 모든 API는 `@login_required` 또는 `IsAuthenticated` 필요
- 프론트엔드에서 세션 쿠키 자동 전송 (CORS_ALLOW_CREDENTIALS=True)
- 로그아웃: `/admin/logout/` (POST)

---

## 2. Frontend 공통 모듈 (미구현)

### 2.1 Vite + TypeScript 프로젝트 초기화

**작업 범위:**
1. Vite 프로젝트 생성
   ```bash
   cd frontend
   npm create vite@latest . -- --template react-ts
   ```

2. 필수 의존성 설치
   ```json
   {
     "dependencies": {
       "react": "^18.3.0",
       "react-dom": "^18.3.0",
       "react-router-dom": "^6.20.0",
       "@mui/material": "^5.14.0",
       "@mui/icons-material": "^5.14.0",
       "@emotion/react": "^11.11.0",
       "@emotion/styled": "^11.11.0",
       "recharts": "^2.10.0",
       "axios": "^1.6.0"
     },
     "devDependencies": {
       "@types/react": "^18.2.0",
       "@types/react-dom": "^18.2.0",
       "@vitejs/plugin-react": "^4.2.0",
       "typescript": "^5.3.0",
       "vite": "^5.0.0"
     }
   }
   ```

3. `vite.config.ts` 설정
   ```typescript
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     build: {
       outDir: 'dist',
       emptyOutDir: true,
     },
     server: {
       port: 5173,
       proxy: {
         '/api': {
           target: 'http://localhost:8000',
           changeOrigin: true,
         },
         '/admin': {
           target: 'http://localhost:8000',
           changeOrigin: true,
         },
       },
     },
   })
   ```

**디렉토리 구조:**
```
frontend/
├── src/
│   ├── components/       # 공통 컴포넌트
│   ├── layouts/          # 레이아웃
│   ├── pages/            # 페이지 컴포넌트
│   ├── services/         # API 클라이언트
│   ├── types/            # TypeScript 타입
│   ├── utils/            # 유틸리티 함수
│   ├── App.tsx           # 메인 앱
│   └── main.tsx          # 엔트리 포인트
├── public/
├── package.json
└── vite.config.ts
```

**우선순위:** 높음 (모든 페이지 개발의 전제 조건)

---

### 2.2 MUI 테마 설정

**파일:** `/frontend/src/theme.ts`

**구현 내용:**
```typescript
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // 대학 브랜드 컬러로 변경 가능
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // 버튼 텍스트 소문자 유지
        },
      },
    },
  },
});
```

**적용 방법:**
```typescript
// src/App.tsx
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* 앱 컴포넌트 */}
    </ThemeProvider>
  );
}
```

**우선순위:** 높음 (UI 일관성 보장)

---

### 2.3 API 클라이언트 (Axios Wrapper)

**파일:** `/frontend/src/services/api.ts`

**구현 내용:**
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

// Axios 인스턴스 생성
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 세션 쿠키 전송
});

// 요청 인터셉터 (CSRF 토큰 추가)
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 인증 실패 시 로그인 페이지로 리다이렉트
      window.location.href = '/admin/login/';
    }
    return Promise.reject(error);
  }
);

// 쿠키 읽기 헬퍼
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default api;
```

**API 함수 정의:**
```typescript
// src/services/performanceApi.ts
import api from './api';
import { PerformanceData, UploadResponse } from '../types';

export const performanceApi = {
  // 데이터 조회
  getData: (params?: { reference_date?: string; department?: string }) =>
    api.get<PerformanceData[]>('/data/', { params }),

  // 엑셀 업로드
  uploadExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<UploadResponse>('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 대시보드 요약
  getSummary: (reference_date?: string) =>
    api.get('/summary/', { params: { reference_date } }),
};
```

**우선순위:** 높음 (모든 페이지에서 사용)

---

### 2.4 공통 레이아웃 컴포넌트

#### 2.4.1 DashboardLayout

**파일:** `/frontend/src/layouts/DashboardLayout.tsx`

**구현 내용:**
```typescript
import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Dashboard,
  UploadFile,
  TableChart,
  Logout,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate, Outlet } from 'react-router-dom';

const DRAWER_WIDTH = 240;

const menuItems = [
  { text: '대시보드', icon: <Dashboard />, path: '/dashboard' },
  { text: '데이터 업로드', icon: <UploadFile />, path: '/upload' },
  { text: '데이터 테이블', icon: <TableChart />, path: '/data-table' },
];

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    // Django 로그아웃 엔드포인트 호출
    await fetch('/admin/logout/', {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = '/admin/login/';
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          대학 데이터 대시보드
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><Logout /></ListItemIcon>
            <ListItemText primary="로그아웃" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            대학 데이터 시각화 대시보드
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer (Sidebar) */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
```

**우선순위:** 높음 (모든 페이지의 기본 레이아웃)

---

### 2.5 라우팅 설정

**파일:** `/frontend/src/App.tsx`

**구현 내용:**
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import DashboardLayout from './layouts/DashboardLayout';

// 페이지 컴포넌트 (각 페이지팀이 개발)
import DashboardPage from './pages/Dashboard';
import UploadPage from './pages/Upload';
import DataTablePage from './pages/DataTable';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* 루트 경로: 대시보드로 리다이렉트 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 대시보드 레이아웃 */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/data-table" element={<DataTablePage />} />
          </Route>

          {/* 404 페이지 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
```

**우선순위:** 높음 (페이지별 병렬 개발의 전제)

---

### 2.6 TypeScript 타입 정의

**파일:** `/frontend/src/types/index.ts`

**구현 내용:**
```typescript
// 실적 데이터 타입
export interface PerformanceData {
  id: number;
  reference_date: string; // YYYY-MM
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

// 업로드 응답 타입
export interface UploadResponse {
  message: string;
  reference_dates: string[];
  created_count: number;
  warnings?: string[];
}

// 대시보드 요약 타입
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
  }>;
  department_ranking: Array<{
    department: string;
    total_revenue: number;
    total_papers: number;
  }>;
  reference_dates: string[];
}

// 업로드 이력 타입
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
```

**우선순위:** 높음 (타입 안정성 보장)

---

## 3. Testing 환경 (선택적)

### 3.1 Backend 테스트

**파일:** `/backend/api/tests.py`

**최소 구현:**
```python
from django.test import TestCase
from .models import PerformanceData

class PerformanceDataTestCase(TestCase):
    def setUp(self):
        PerformanceData.objects.create(
            reference_date='2024-01',
            department='테스트부서',
            revenue=1000000,
        )

    def test_data_creation(self):
        data = PerformanceData.objects.get(department='테스트부서')
        self.assertEqual(data.reference_date, '2024-01')
```

**실행:**
```bash
python manage.py test
```

**우선순위:** 낮음 (MVP 후 추가)

---

### 3.2 Frontend 테스트

**라이브러리:** Vitest (Vite 공식 권장)

**설정:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**우선순위:** 낮음 (MVP 후 추가)

---

## 4. 개발 워크플로우 가이드

### 4.1 로컬 개발 환경 세팅

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

**접속:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

---

### 4.2 페이지별 병렬 개발 가이드

**원칙:**
1. 각 페이지는 독립적인 컴포넌트로 개발
2. 공통 API는 `/frontend/src/services/` 사용
3. 공통 레이아웃은 `DashboardLayout` 사용
4. 타입 정의는 `/frontend/src/types/` 추가

**예시: 대시보드 페이지 개발**
```typescript
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { performanceApi } from '../services/performanceApi';
import { DashboardSummary } from '../types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    performanceApi.getSummary().then((res) => setSummary(res.data));
  }, []);

  return (
    <div>
      <h1>대시보드</h1>
      {/* 차트 컴포넌트 구현 */}
    </div>
  );
}
```

**충돌 방지:**
- 페이지 파일명: `Dashboard.tsx`, `Upload.tsx`, `DataTable.tsx`
- 각 페이지는 `src/pages/` 디렉토리에 독립적으로 위치
- 공통 컴포넌트 추가 시 `src/components/`에 배치

---

### 4.3 빌드 및 배포

**로컬 빌드 테스트:**
```bash
# 1. Frontend 빌드
cd frontend
npm run build  # dist/ 생성

# 2. Django로 정적 파일 복사
cd ../backend
mkdir -p staticfiles
cp -r ../frontend/dist/* staticfiles/

# 3. Collectstatic
python manage.py collectstatic --noinput

# 4. Gunicorn 실행
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

**Docker 빌드:**
```bash
docker build -t university-dashboard .
docker run -p 8000:8000 --env-file .env university-dashboard
```

**Railway 배포:**
- GitHub 연동 후 자동 배포
- 환경변수 설정 (`DATABASE_URL`, `SECRET_KEY`)

---

## 5. 공통 모듈 우선순위 및 작업 순서

### Phase 1: Frontend 초기화 (최우선)
1. ✅ **Vite + TypeScript 프로젝트 생성**
2. ✅ **의존성 설치** (React, MUI, Recharts, Axios)
3. ✅ **디렉토리 구조 생성**
4. ✅ **MUI 테마 설정**
5. ✅ **API 클라이언트 구현**

### Phase 2: 레이아웃 및 라우팅 (높음)
6. ✅ **DashboardLayout 컴포넌트**
7. ✅ **React Router 설정**
8. ✅ **TypeScript 타입 정의**

### Phase 3: 페이지 개발 준비 완료
- 이후 각 페이지팀이 병렬 개발 시작 가능

---

## 6. 검증 체크리스트

### Backend 검증
- [x] Django 서버 정상 실행 (`python manage.py runserver`)
- [x] API 엔드포인트 접근 가능 (`/api/data/`)
- [x] Django Admin 접속 가능 (`/admin/`)
- [x] 엑셀 업로드 API 동작 (`POST /api/upload/`)
- [x] Atomic Transaction 롤백 테스트

### Frontend 검증
- [ ] Vite 개발 서버 실행 (`npm run dev`)
- [ ] MUI 컴포넌트 렌더링 확인
- [ ] API 호출 성공 (CORS 해결)
- [ ] DashboardLayout 렌더링
- [ ] React Router 페이지 전환
- [ ] 프로덕션 빌드 성공 (`npm run build`)

### Integration 검증
- [ ] Frontend → Backend API 통신
- [ ] 세션 쿠키 인증 동작
- [ ] CSRF 토큰 전송 확인
- [ ] 로그아웃 기능 동작
- [ ] Whitenoise 정적 파일 서빙

### Deployment 검증
- [ ] Docker 빌드 성공
- [ ] Multi-stage build 동작
- [ ] Gunicorn 실행 확인
- [ ] Railway 배포 성공

---

## 7. 추가 고려사항

### 7.1 오버엔지니어링 방지
- **제외 항목:**
  - Redux/Zustand 등 상태 관리 라이브러리 (Context API로 충분)
  - React Query (단순 axios 사용)
  - 복잡한 폼 라이브러리 (MUI 기본 폼으로 충분)
  - E2E 테스트 (MVP 단계에서는 불필요)

### 7.2 성능 최적화
- **지연 로딩:** 페이지 컴포넌트 `React.lazy()` 사용 가능
- **메모이제이션:** 필요 시 `React.memo()` 적용
- **차트 샘플링:** 데이터 포인트 1,000개 이상 시 고려

### 7.3 보안
- **CSRF:** API 요청 시 자동 토큰 전송
- **XSS:** React 기본 이스케이핑 활용
- **인증:** 모든 API에 `IsAuthenticated` 적용

---

## 8. 문서 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2025-12-18 | 초안 작성 | common-task-planner agent |

---

## 부록: 참고 자료

- Django 공식 문서: https://docs.djangoproject.com/
- DRF 공식 문서: https://www.django-rest-framework.org/
- Vite 공식 문서: https://vitejs.dev/
- React Router 공식 문서: https://reactrouter.com/
- Material UI 공식 문서: https://mui.com/
- Recharts 공식 문서: https://recharts.org/

---

**문서 승인**
- [ ] Product Owner
- [ ] Backend Developer
- [ ] Frontend Developer

**다음 단계:**
1. Frontend 프로젝트 초기화 (Phase 1)
2. 공통 레이아웃 구현 (Phase 2)
3. 페이지별 병렬 개발 시작 (Phase 3)
