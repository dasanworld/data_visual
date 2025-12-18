# Dashboard Page Implementation Plan
# 대시보드 페이지 구현 계획

**문서 버전:** 1.0
**작성일:** 2025-12-18
**페이지 번호:** UC-002
**우선순위:** High

---

## 1. 개요 (Overview)

### 1.1 목적
대학 데이터 시각화 대시보드의 메인 페이지로, 업로드된 실적 데이터를 3종 차트(월별 추이 라인 차트, 부서별 실적 막대그래프, 카테고리별 분포 파이 차트)로 시각화하고, 필터링 기능을 제공하여 사용자가 데이터를 직관적으로 분석할 수 있도록 한다.

### 1.2 참조 문서
- `/docs/usecase/002-dashboard/spec.md`: 대시보드 유스케이스 상세
- `/docs/prd.md`: 3.2 대시보드 페이지 요구사항
- `/docs/userflow.md`: 2번 대시보드 조회 플로우
- `/docs/database.md`: PerformanceData 스키마
- `/docs/common-modules.md`: 공통 모듈 사용 가이드

### 1.3 성공 지표
- 대시보드 초기 로딩 시간: 3초 이내
- 필터 적용 후 리렌더링: 1초 이내
- 사용자 교육 없이 직관적 사용 가능
- 데이터 정확성: API 원본 대비 100% 일치

---

## 2. 현재 코드베이스 상태 분석

### 2.1 Backend (구현 완료)

**API 엔드포인트:**
- ✅ `GET /api/summary/` - 대시보드 요약 데이터 제공
  - 전체 집계 (매출, 예산, 지출, 논문, 특허, 프로젝트 수)
  - 월별 추이 데이터
  - 부서별 실적 랭킹 (상위 10개)
  - 사용 가능한 기준 년월 목록
- ✅ `GET /api/data/` - 전체 데이터 조회 (필터링 지원)
  - Query params: `reference_date`, `department`

**데이터 모델:**
```python
# backend/api/models.py
class PerformanceData:
    - reference_date (YYYY-MM 형식)
    - department, department_code
    - revenue, budget, expenditure (재무 지표)
    - paper_count, patent_count, project_count (연구 실적)
    - extra_metric_1, extra_metric_2, extra_text (확장 필드)
```

**인덱스:**
- `reference_date` (단일)
- `department` (단일)
- `(reference_date, department)` (복합)

### 2.2 Frontend (미구현)

**현재 상태:**
```typescript
// frontend/src/pages/Dashboard.tsx
// 기본 레이아웃만 구현, 차트 및 필터 기능 없음
```

**공통 모듈 사용 가능:**
- ✅ `DashboardLayout` - 사이드바, 헤더 포함 레이아웃
- ✅ `performanceApi.getSummary()` - 대시보드 API 클라이언트
- ✅ MUI 테마 설정
- ✅ TypeScript 타입 정의 (`DashboardSummary`, `PerformanceData`)

---

## 3. 기술 스택 및 라이브러리

### 3.1 필수 라이브러리
```json
{
  "dependencies": {
    "recharts": "^2.10.0",           // 차트 라이브러리
    "@mui/material": "^5.14.0",       // UI 컴포넌트
    "@mui/icons-material": "^5.14.0", // 아이콘
    "@mui/x-date-pickers": "^6.18.0", // DatePicker
    "date-fns": "^3.0.0",             // 날짜 처리
    "axios": "^1.6.0"                 // API 클라이언트
  }
}
```

### 3.2 Recharts 차트 컴포넌트
- `LineChart` - 월별 추이
- `BarChart` - 부서별 실적
- `PieChart` - 카테고리별 분포

---

## 4. 구현 단계별 계획

### Phase 1: 데이터 로딩 및 상태 관리 (1-2시간)

#### 4.1.1 API 연동
**파일:** `frontend/src/pages/Dashboard.tsx`

**구현 내용:**
```typescript
import { useEffect, useState } from 'react';
import { performanceApi } from '../services/performanceApi';
import type { DashboardSummary } from '../types';

const [summary, setSummary] = useState<DashboardSummary | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await performanceApi.getSummary();
      setSummary(response.data);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

**에러 처리:**
- 401 Unauthorized → 자동 로그인 페이지 리다이렉트 (api.ts에서 처리)
- 500 Server Error → 에러 배너 표시 및 재시도 버튼
- 네트워크 오류 → 타임아웃 메시지 및 재시도 버튼

#### 4.1.2 로딩 상태 UI
```typescript
{loading && (
  <Box display="flex" justifyContent="center" p={4}>
    <CircularProgress />
  </Box>
)}

{error && (
  <Alert severity="error" action={
    <Button onClick={fetchData}>재시도</Button>
  }>
    {error}
  </Alert>
)}

{!loading && !error && !summary && (
  <Alert severity="info">
    데이터가 없습니다. 엑셀을 업로드하세요.
    <Button onClick={() => navigate('/upload')}>업로드 페이지로 이동</Button>
  </Alert>
)}
```

---

### Phase 2: 필터 UI 구현 (2-3시간)

#### 4.2.1 필터 상태 관리
**파일:** `frontend/src/pages/Dashboard.tsx`

```typescript
interface FilterState {
  startDate: string | null;   // YYYY-MM
  endDate: string | null;      // YYYY-MM
  departments: string[];       // 부서명 배열
}

const [filters, setFilters] = useState<FilterState>({
  startDate: null,
  endDate: null,
  departments: [],
});

const handleFilterChange = (newFilters: Partial<FilterState>) => {
  setFilters((prev) => ({ ...prev, ...newFilters }));
};
```

#### 4.2.2 필터 패널 컴포넌트
**새 파일:** `frontend/src/components/FilterPanel.tsx`

```typescript
import { Box, Paper, Typography, TextField, Autocomplete, Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';

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
  availableDates
}: FilterPanelProps) {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        필터
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap">
        {/* 기간 선택 */}
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
          <DatePicker
            label="시작 월"
            views={['year', 'month']}
            value={filters.startDate ? new Date(filters.startDate) : null}
            onChange={(date) => onFilterChange({
              startDate: date ? format(date, 'yyyy-MM') : null
            })}
            slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
          />

          <DatePicker
            label="종료 월"
            views={['year', 'month']}
            value={filters.endDate ? new Date(filters.endDate) : null}
            onChange={(date) => onFilterChange({
              endDate: date ? format(date, 'yyyy-MM') : null
            })}
            slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
          />
        </LocalizationProvider>

        {/* 부서 선택 */}
        <Autocomplete
          multiple
          options={availableDepartments}
          value={filters.departments}
          onChange={(_, newValue) => onFilterChange({ departments: newValue })}
          renderInput={(params) => (
            <TextField {...params} label="부서 선택" size="small" />
          )}
          sx={{ width: 300 }}
        />

        {/* 필터 초기화 */}
        <Button
          variant="outlined"
          onClick={() => onFilterChange({
            startDate: null,
            endDate: null,
            departments: []
          })}
        >
          필터 초기화
        </Button>
      </Box>
    </Paper>
  );
}
```

**필터 적용 로직:**
```typescript
// 필터링된 데이터 계산
const filteredData = useMemo(() => {
  if (!summary) return null;

  let trend = summary.monthly_trend;
  let ranking = summary.department_ranking;

  // 기간 필터링
  if (filters.startDate || filters.endDate) {
    trend = trend.filter(item => {
      if (filters.startDate && item.reference_date < filters.startDate) return false;
      if (filters.endDate && item.reference_date > filters.endDate) return false;
      return true;
    });
  }

  // 부서 필터링
  if (filters.departments.length > 0) {
    ranking = ranking.filter(item =>
      filters.departments.includes(item.department)
    );
  }

  return { ...summary, monthly_trend: trend, department_ranking: ranking };
}, [summary, filters]);
```

---

### Phase 3: 차트 컴포넌트 구현 (4-6시간)

#### 4.3.1 월별 추이 라인 차트
**새 파일:** `frontend/src/components/charts/MonthlyTrendChart.tsx`

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface MonthlyTrendData {
  reference_date: string;
  revenue: number;
  budget: number;
  expenditure: number;
  papers: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
}

export default function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  // 숫자 포맷팅 (천 단위 구분)
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        월별 추이
      </Typography>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="reference_date"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatNumber}
          />
          <Tooltip
            formatter={(value: number) => formatNumber(value)}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="매출액"
            stroke="#1976d2"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="budget"
            name="예산"
            stroke="#2e7d32"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="expenditure"
            name="지출"
            stroke="#d32f2f"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      {data.length === 0 && (
        <Box textAlign="center" py={4} color="text.secondary">
          조건에 맞는 데이터가 없습니다.
        </Box>
      )}
    </Paper>
  );
}
```

**차트 기능:**
- X축: 월 (YYYY-MM 형식)
- Y축: 금액 (천 단위 콤마)
- 3개 라인: 매출, 예산, 지출
- 호버: 툴팁으로 정확한 수치 표시
- 반응형: 부모 컨테이너에 맞춰 크기 조정

#### 4.3.2 부서별 실적 막대그래프
**새 파일:** `frontend/src/components/charts/DepartmentBarChart.tsx`

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface DepartmentRankingData {
  department: string;
  total_revenue: number;
  total_papers: number;
}

interface DepartmentBarChartProps {
  data: DepartmentRankingData[];
}

export default function DepartmentBarChart({ data }: DepartmentBarChartProps) {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  // 상위 10개 부서만 표시
  const topDepartments = data.slice(0, 10);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        부서별 실적 (상위 10개)
      </Typography>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topDepartments} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="department"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatNumber}
          />
          <Tooltip
            formatter={(value: number) => formatNumber(value)}
          />
          <Legend />
          <Bar
            dataKey="total_revenue"
            name="총 매출액"
            fill="#1976d2"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="total_papers"
            name="총 논문 수"
            fill="#f57c00"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {topDepartments.length === 0 && (
        <Box textAlign="center" py={4} color="text.secondary">
          조건에 맞는 데이터가 없습니다.
        </Box>
      )}
    </Paper>
  );
}
```

**차트 기능:**
- X축: 부서명 (45도 회전으로 가독성 향상)
- Y축: 실적 값 (콤마 포맷)
- 2개 막대: 총 매출액, 총 논문 수
- 상위 10개 부서만 표시
- 막대 모서리 둥글게 처리

#### 4.3.3 카테고리별 분포 파이 차트
**새 파일:** `frontend/src/components/charts/CategoryPieChart.tsx`

```typescript
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  // 백분율 계산
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartData = data.map(item => ({
    ...item,
    percentage: ((item.value / total) * 100).toFixed(1)
  }));

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        카테고리별 분포
      </Typography>

      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) => `${name}: ${percentage}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `${value}건 (${props.payload.percentage}%)`,
              name
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
          />
        </PieChart>
      </ResponsiveContainer>

      {data.length === 0 && (
        <Box textAlign="center" py={4} color="text.secondary">
          조건에 맞는 데이터가 없습니다.
        </Box>
      )}
    </Paper>
  );
}
```

**차트 기능:**
- 퍼센트 + 절대값 표시
- 카테고리별 고유 색상 자동 할당
- 호버: 툴팁으로 상세 정보 표시
- 라벨: 카테고리명 + 백분율

**카테고리 데이터 생성:**
```typescript
// Dashboard.tsx에서 카테고리 데이터 가공
const categoryData = useMemo(() => {
  if (!filteredData?.monthly_trend) return [];

  // 논문, 특허, 프로젝트 수 집계
  const papers = filteredData.monthly_trend.reduce((sum, item) => sum + item.papers, 0);

  // 실제로는 /api/data/ 엔드포인트에서 전체 데이터를 가져와 집계해야 함
  // 여기서는 summary 데이터 활용
  return [
    { name: '논문', value: filteredData.summary.total_papers || 0 },
    { name: '특허', value: filteredData.summary.total_patents || 0 },
    { name: '프로젝트', value: filteredData.summary.total_projects || 0 },
  ].filter(item => item.value > 0);
}, [filteredData]);
```

---

### Phase 4: 레이아웃 구성 (1-2시간)

#### 4.4.1 Grid 레이아웃
**파일:** `frontend/src/pages/Dashboard.tsx`

```typescript
import { Grid, Container } from '@mui/material';

return (
  <Container maxWidth="xl">
    <Typography variant="h4" gutterBottom>
      대시보드
    </Typography>

    {/* 필터 패널 */}
    <FilterPanel
      filters={filters}
      onFilterChange={handleFilterChange}
      availableDepartments={availableDepartments}
      availableDates={summary?.reference_dates || []}
    />

    {/* 차트 영역 */}
    <Grid container spacing={3}>
      {/* 월별 추이 - 전체 너비 */}
      <Grid item xs={12}>
        <MonthlyTrendChart data={filteredData?.monthly_trend || []} />
      </Grid>

      {/* 부서별 실적 - 반 너비 */}
      <Grid item xs={12} md={6}>
        <DepartmentBarChart data={filteredData?.department_ranking || []} />
      </Grid>

      {/* 카테고리별 분포 - 반 너비 */}
      <Grid item xs={12} md={6}>
        <CategoryPieChart data={categoryData} />
      </Grid>
    </Grid>
  </Container>
);
```

**반응형 디자인:**
- 데스크탑 (md 이상): 2열 그리드 (부서별, 카테고리별 나란히)
- 태블릿/모바일 (sm 이하): 1열 그리드 (세로 배치)

---

### Phase 5: 성능 최적화 (1-2시간)

#### 4.5.1 메모이제이션
```typescript
import { useMemo, useCallback } from 'react';

// 필터링된 데이터 캐싱
const filteredData = useMemo(() => {
  // 필터링 로직
}, [summary, filters]);

// 카테고리 데이터 캐싱
const categoryData = useMemo(() => {
  // 집계 로직
}, [filteredData]);

// 필터 변경 핸들러 캐싱
const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
  setFilters((prev) => ({ ...prev, ...newFilters }));
}, []);
```

#### 4.5.2 대용량 데이터 처리
```typescript
// 데이터 포인트가 너무 많을 경우 샘플링
const sampledData = useMemo(() => {
  if (data.length <= 1000) return data;

  // 매 N개마다 샘플링
  const step = Math.ceil(data.length / 1000);
  return data.filter((_, index) => index % step === 0);
}, [data]);
```

#### 4.5.3 Lazy Loading (선택 사항)
```typescript
// 차트 컴포넌트 지연 로딩
const MonthlyTrendChart = lazy(() => import('../components/charts/MonthlyTrendChart'));
const DepartmentBarChart = lazy(() => import('../components/charts/DepartmentBarChart'));
const CategoryPieChart = lazy(() => import('../components/charts/CategoryPieChart'));

// Suspense로 로딩 상태 처리
<Suspense fallback={<CircularProgress />}>
  <MonthlyTrendChart data={data} />
</Suspense>
```

---

### Phase 6: 테스트 (1-2시간)

#### 4.6.1 수동 테스트 시나리오

**정상 동작 테스트:**
1. [ ] 로그인 후 대시보드 접근 시 3종 차트 정상 렌더링
2. [ ] 필터 적용 시 1초 이내 리렌더링
3. [ ] 차트 호버 시 툴팁 정확한 수치 표시
4. [ ] 필터 초기화 시 전체 데이터 복원

**엣지케이스 테스트:**
5. [ ] 데이터 없는 경우 빈 상태 메시지 표시
6. [ ] 필터 결과 없는 경우 메시지 표시
7. [ ] 10,000건 이상 데이터 조회 시 샘플링 적용
8. [ ] 세션 만료 시 자동 로그인 페이지 리다이렉트

**오류 처리 테스트:**
9. [ ] 네트워크 오류 시 에러 배너 및 재시도 버튼
10. [ ] 서버 오류 (500) 시 에러 메시지 표시
11. [ ] 인증 실패 (401) 시 로그인 페이지 리다이렉트

**성능 테스트:**
12. [ ] 초기 로딩 3초 이내 완료
13. [ ] 필터 적용 후 1초 이내 렌더링
14. [ ] 반응형 디자인 모바일/태블릿/데스크탑 확인

#### 4.6.2 테스트 데이터 준비
```typescript
// 테스트용 Mock 데이터
const mockSummary: DashboardSummary = {
  summary: {
    total_revenue: 50000000,
    total_budget: 60000000,
    total_expenditure: 45000000,
    total_papers: 120,
    total_patents: 30,
    total_projects: 15,
    department_count: 8,
    avg_revenue: 6250000,
  },
  monthly_trend: [
    { reference_date: '2024-01', revenue: 5000000, budget: 6000000, expenditure: 4500000, papers: 10 },
    { reference_date: '2024-02', revenue: 5500000, budget: 6000000, expenditure: 5000000, papers: 12 },
    // ...
  ],
  department_ranking: [
    { department: '연구개발팀', total_revenue: 15000000, total_papers: 50 },
    { department: '행정팀', total_revenue: 10000000, total_papers: 20 },
    // ...
  ],
  reference_dates: ['2024-05', '2024-04', '2024-03', '2024-02', '2024-01'],
};
```

---

## 5. DRY 원칙 준수

### 5.1 공통 모듈 재사용

**기존 공통 모듈 활용:**
- ✅ `DashboardLayout` - 레이아웃 컴포넌트
- ✅ `performanceApi.getSummary()` - API 클라이언트
- ✅ MUI 테마 - 일관된 스타일링
- ✅ TypeScript 타입 - 타입 안정성

**신규 공통 컴포넌트 제안:**
```typescript
// frontend/src/utils/formatters.ts
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(value);
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ko-KR').format(value);
};

export const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};
```

### 5.2 코드 중복 방지
- 숫자 포맷팅 유틸리티 함수 분리
- 차트 공통 속성 (색상, 크기) 상수화
- 에러 처리 로직 공통 모듈화

---

## 6. 충돌 방지 전략

### 6.1 파일 구조
```
frontend/src/
├── pages/
│   └── Dashboard.tsx                      # 메인 페이지 (수정)
├── components/
│   ├── FilterPanel.tsx                    # 필터 패널 (신규)
│   └── charts/                            # 차트 컴포넌트 (신규)
│       ├── MonthlyTrendChart.tsx
│       ├── DepartmentBarChart.tsx
│       └── CategoryPieChart.tsx
├── utils/
│   └── formatters.ts                      # 포맷팅 유틸리티 (신규)
└── types/
    └── index.ts                           # 타입 정의 (기존 사용)
```

### 6.2 네이밍 컨벤션
- 컴포넌트: PascalCase (`MonthlyTrendChart`)
- 파일명: PascalCase (`.tsx`)
- 함수: camelCase (`formatCurrency`)
- 상수: UPPER_SNAKE_CASE (`COLORS`)

### 6.3 Git 브랜치 전략
```bash
# 작업 브랜치 생성
git checkout -b feature/dashboard-page

# 개발 완료 후
git add .
git commit -m "feat: implement dashboard page with 3 charts"
git push origin feature/dashboard-page
```

---

## 7. 단계별 작업 순서 (Step-by-Step)

### Step 1: 환경 설정 (10분)
```bash
cd frontend
npm install @mui/x-date-pickers date-fns
```

### Step 2: 유틸리티 함수 작성 (10분)
- `frontend/src/utils/formatters.ts` 생성
- 숫자 포맷팅 함수 구현

### Step 3: 차트 컴포넌트 작성 (3시간)
- `MonthlyTrendChart.tsx` 구현 (1시간)
- `DepartmentBarChart.tsx` 구현 (1시간)
- `CategoryPieChart.tsx` 구현 (1시간)

### Step 4: 필터 패널 작성 (2시간)
- `FilterPanel.tsx` 구현
- 필터 상태 관리 로직

### Step 5: 메인 페이지 통합 (2시간)
- `Dashboard.tsx` 수정
- API 연동 및 데이터 가공
- 레이아웃 구성

### Step 6: 테스트 및 디버깅 (2시간)
- 수동 테스트 시나리오 실행
- 성능 최적화
- 반응형 디자인 검증

**총 예상 시간: 9-10시간**

---

## 8. 테스트 계획

### 8.1 단위 테스트 (선택 사항)
```typescript
// frontend/src/components/charts/__tests__/MonthlyTrendChart.test.tsx
import { render, screen } from '@testing-library/react';
import MonthlyTrendChart from '../MonthlyTrendChart';

describe('MonthlyTrendChart', () => {
  it('renders chart with data', () => {
    const data = [
      { reference_date: '2024-01', revenue: 1000, budget: 1200, expenditure: 900, papers: 5 }
    ];
    render(<MonthlyTrendChart data={data} />);
    expect(screen.getByText('월별 추이')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<MonthlyTrendChart data={[]} />);
    expect(screen.getByText('조건에 맞는 데이터가 없습니다.')).toBeInTheDocument();
  });
});
```

### 8.2 통합 테스트
```typescript
// E2E 테스트 (Playwright/Cypress)
describe('Dashboard Page', () => {
  it('loads dashboard and displays charts', async () => {
    await page.goto('/dashboard');
    await expect(page.locator('h4')).toContainText('대시보드');
    await expect(page.locator('canvas')).toHaveCount(3); // 3개 차트
  });

  it('applies filters and updates charts', async () => {
    await page.goto('/dashboard');
    await page.fill('[label="시작 월"]', '2024-01');
    await page.fill('[label="종료 월"]', '2024-03');
    // 차트 업데이트 확인
  });
});
```

### 8.3 성능 테스트
```bash
# Lighthouse 성능 측정
npm run build
npx lighthouse http://localhost:8000/dashboard --view

# 목표 지표:
# - Performance: 90 이상
# - Accessibility: 90 이상
# - First Contentful Paint: 1.5초 이내
# - Time to Interactive: 3초 이내
```

---

## 9. 체크리스트

### 개발 완료 체크리스트
- [ ] 의존성 설치 완료 (`@mui/x-date-pickers`, `date-fns`)
- [ ] 유틸리티 함수 작성 (`formatters.ts`)
- [ ] 월별 추이 라인 차트 구현
- [ ] 부서별 실적 막대그래프 구현
- [ ] 카테고리별 분포 파이 차트 구현
- [ ] 필터 패널 구현
- [ ] API 연동 및 데이터 가공
- [ ] 레이아웃 구성 (Grid)
- [ ] 로딩 상태 UI
- [ ] 에러 처리 UI
- [ ] 빈 상태 메시지
- [ ] 성능 최적화 (메모이제이션)
- [ ] 반응형 디자인 검증
- [ ] 테스트 시나리오 실행
- [ ] 코드 리뷰 완료

### 품질 체크리스트
- [ ] TypeScript 타입 오류 없음
- [ ] ESLint 경고 없음
- [ ] Console 에러 없음
- [ ] 접근성 (WCAG 2.1 Level A)
- [ ] 브라우저 호환성 (Chrome, Firefox, Safari, Edge)
- [ ] 모바일/태블릿 디자인 확인

---

## 10. 위험 요소 및 대응 방안

| 위험 요소 | 영향도 | 대응 방안 |
|-----------|--------|----------|
| 대용량 데이터 렌더링 지연 | 중간 | 데이터 샘플링 (1,000개 포인트 제한) |
| Recharts 라이브러리 버그 | 낮음 | 공식 문서 참조, 대안 라이브러리 검토 |
| 필터 적용 시 성능 저하 | 중간 | 디바운싱, 메모이제이션 적용 |
| API 응답 지연 | 높음 | 로딩 스피너, 타임아웃 설정, 재시도 버튼 |
| 세션 만료 | 중간 | 401 응답 시 자동 리다이렉트 (api.ts에서 처리) |
| 날짜 포맷 불일치 | 낮음 | date-fns로 일관된 포맷 처리 |

---

## 11. 후속 개선사항

### 단기 개선 (MVP 이후)
- 차트 이미지 다운로드 기능 (PNG, SVG)
- 필터 저장 기능 (즐겨찾기)
- 차트 레이아웃 커스터마이징 (드래그 앤 드롭)
- 실시간 데이터 갱신 (WebSocket 또는 Polling)

### 장기 개선
- 대시보드 공유 기능 (URL 링크 생성)
- 고급 필터 (다중 조건, AND/OR 로직)
- 집계 테이블 추가로 대용량 데이터 성능 개선
- 사용자별 맞춤 대시보드 설정

---

## 12. 참고 자료

### 공식 문서
- Recharts: https://recharts.org/
- MUI DatePicker: https://mui.com/x/react-date-pickers/
- date-fns: https://date-fns.org/

### 내부 문서
- `/docs/usecase/002-dashboard/spec.md`
- `/docs/prd.md`
- `/docs/userflow.md`
- `/docs/common-modules.md`

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2025-12-18 | 초안 작성 | plan-writer agent |

---

**End of Document**
