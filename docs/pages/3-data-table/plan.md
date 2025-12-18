# 데이터 테이블 페이지 구현 계획

**문서 버전:** 1.0
**작성일:** 2025-12-18
**페이지명:** 데이터 테이블 (Data Table)
**URL:** `/data-table`
**우선순위:** Medium (P1)

---

## 1. 개요

### 1.1 목적
업로드된 원본 데이터를 MUI DataGrid로 조회하고, 정렬/검색/페이지네이션/CSV 내보내기 기능을 제공하여 사용자가 상세 데이터를 확인하고 검증할 수 있도록 지원합니다.

### 1.2 핵심 요구사항 (PRD 기준)
- **URL:** `/data-table`
- **컴포넌트:** MUI DataGrid 사용
- **기능:**
  - 정렬 (Sorting): 각 컬럼 클릭 시 오름차순/내림차순
  - 검색 (Search): 전체 컬럼 대상 텍스트 검색
  - 페이지네이션 (Pagination): 한 페이지당 50개 행
  - CSV 내보내기 (Export)
- **컬럼:** 날짜, 부서, 카테고리, 실적
- **API:** GET /api/data/

### 1.3 기존 코드베이스 현황
**Backend (구현 완료):**
- `/backend/api/views.py` - `PerformanceDataViewSet` 구현됨
- `/backend/api/serializers.py` - `PerformanceDataSerializer` 구현됨
- API 엔드포인트: `GET /api/data/` (필터링 지원: reference_date, department)

**Frontend (미구현):**
- `/frontend/src/pages/DataTable.tsx` - 빈 스켈레톤만 존재
- `/frontend/src/services/performanceApi.ts` - `getData()` API 함수 구현됨
- `/frontend/src/types/index.ts` - `PerformanceData` 타입 정의됨

---

## 2. 기술 스택 및 공통 모듈 활용

### 2.1 사용 기술
| 항목 | 기술 | 비고 |
|------|------|------|
| UI 프레임워크 | React 18 + TypeScript | 기존 프로젝트 설정 |
| UI 라이브러리 | Material UI (MUI) v5 | 공통 모듈 |
| 테이블 컴포넌트 | MUI DataGrid | 공식 권장 |
| API 클라이언트 | Axios (공통 모듈) | `/services/api.ts` |
| 상태 관리 | React useState | 단순 로컬 상태 |
| 데이터 가공 | JavaScript 내장 함수 | filter, sort |

### 2.2 공통 모듈 재사용
**DRY 원칙 준수:**
- `performanceApi.getData()` - API 호출 (기존 모듈)
- `PerformanceData` 타입 - TypeScript 타입 정의 (기존)
- `DashboardLayout` - 레이아웃 컴포넌트 (공통)
- MUI 테마 - `/theme.ts` (공통)

---

## 3. 페이지 컴포넌트 구조

### 3.1 컴포넌트 트리
```
DataTablePage
├── SearchBar (검색 입력 + CSV 내보내기 버튼)
├── MUI DataGrid
│   ├── Column: reference_date (정렬 가능)
│   ├── Column: department (정렬 가능)
│   ├── Column: category (정렬 가능) ※ 현재 DB에 없음 → revenue 사용
│   └── Column: value (정렬 가능) ※ revenue로 대체
└── LoadingSpinner / ErrorBanner
```

### 3.2 주요 상태 관리
```typescript
// 데이터 상태
const [data, setData] = useState<PerformanceData[]>([]);
const [filteredData, setFilteredData] = useState<PerformanceData[]>([]);

// UI 상태
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [searchText, setSearchText] = useState('');

// DataGrid 상태 (내장)
const [sortModel, setSortModel] = useState<GridSortModel>([]);
const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });
```

---

## 4. 단계별 개발 계획

### Phase 1: 기본 테이블 렌더링 (우선순위: P0)

#### 4.1.1 API 연동 및 데이터 조회
**파일:** `/frontend/src/pages/DataTable.tsx`

**작업 내용:**
1. `performanceApi.getData()` 호출
2. 로딩/에러 상태 처리
3. 데이터를 state에 저장

**코드 예시:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await performanceApi.getData();
      setData(response.data);
      setFilteredData(response.data);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

**검증:**
- [ ] API 호출 성공
- [ ] 로딩 스피너 표시
- [ ] 에러 발생 시 에러 배너 표시
- [ ] 데이터 state에 저장 확인 (React DevTools)

#### 4.1.2 MUI DataGrid 컬럼 정의
**작업 내용:**
PRD 요구사항과 실제 DB 스키마 매핑:

| PRD 컬럼 | DB 필드 | 타입 | 비고 |
|---------|---------|------|------|
| 날짜 | reference_date | string | YYYY-MM 형식 |
| 부서 | department | string | - |
| 카테고리 | ※없음 | - | department_code로 대체 또는 생략 |
| 실적 | revenue | number | 매출액으로 해석 |

**DataGrid 컬럼 설정:**
```typescript
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
    valueFormatter: (params) => {
      return params.value?.toLocaleString('ko-KR') || '0';
    },
  },
  {
    field: 'budget',
    headerName: '예산',
    width: 180,
    sortable: true,
    type: 'number',
    valueFormatter: (params) => {
      return params.value?.toLocaleString('ko-KR') || '0';
    },
  },
];
```

**검증:**
- [ ] 테이블에 5개 컬럼 표시 (날짜, 부서, 부서코드, 매출액, 예산)
- [ ] 숫자 컬럼 1,000 단위 구분자 표시
- [ ] 컬럼 헤더 정렬 아이콘 표시

#### 4.1.3 페이지네이션 설정
**작업 내용:**
```typescript
<DataGrid
  rows={filteredData}
  columns={columns}
  pageSizeOptions={[50]}
  paginationModel={paginationModel}
  onPaginationModelChange={setPaginationModel}
  disableRowSelectionOnClick
  autoHeight
  sx={{
    '& .MuiDataGrid-row:hover': {
      backgroundColor: '#f5f5f5',
    },
  }}
/>
```

**검증:**
- [ ] 페이지당 50개 행 표시
- [ ] 페이지네이션 컨트롤 (이전/다음, 페이지 번호) 동작
- [ ] "1-50 of 1,000" 형식 표시

---

### Phase 2: 검색 기능 구현 (우선순위: P1)

#### 4.2.1 검색 바 UI
**작업 내용:**
```typescript
<Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
  <TextField
    label="검색"
    variant="outlined"
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    placeholder="날짜, 부서, 부서코드, 금액 검색..."
    fullWidth
    InputProps={{
      startAdornment: <SearchIcon />,
    }}
  />
</Box>
```

#### 4.2.2 검색 로직 (클라이언트 측 필터링)
**작업 내용:**
```typescript
useEffect(() => {
  if (!searchText.trim()) {
    setFilteredData(data);
    return;
  }

  const lowercased = searchText.toLowerCase();
  const filtered = data.filter((row) => {
    return (
      row.reference_date.toLowerCase().includes(lowercased) ||
      row.department.toLowerCase().includes(lowercased) ||
      row.department_code.toLowerCase().includes(lowercased) ||
      row.revenue.toString().includes(lowercased) ||
      row.budget.toString().includes(lowercased)
    );
  });

  setFilteredData(filtered);
}, [searchText, data]);
```

**검증:**
- [ ] 검색어 입력 시 실시간 필터링
- [ ] 대소문자 구분 없이 검색
- [ ] 모든 컬럼 대상 검색
- [ ] 검색 결과 없을 시 "검색 결과가 없습니다." 메시지 표시

---

### Phase 3: 정렬 기능 구현 (우선순위: P1)

**작업 내용:**
MUI DataGrid의 내장 정렬 기능 활용:

```typescript
<DataGrid
  sortingOrder={['asc', 'desc']}
  sortModel={sortModel}
  onSortModelChange={setSortModel}
  // ... 기타 props
/>
```

**검증:**
- [ ] 컬럼 헤더 클릭 시 정렬 토글
- [ ] 오름차순/내림차순 화살표 아이콘 표시
- [ ] 날짜 정렬 시 시간순 정렬 (문자열 아님)
- [ ] 숫자 컬럼 정렬 시 숫자 기준 정렬

---

### Phase 4: CSV 내보내기 구현 (우선순위: P1)

#### 4.4.1 CSV 내보내기 버튼
**작업 내용:**
```typescript
<Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
  <TextField /* 검색 바 */ />
  <Button
    variant="contained"
    startIcon={<DownloadIcon />}
    onClick={handleExportCSV}
  >
    CSV 내보내기
  </Button>
</Box>
```

#### 4.4.2 CSV 생성 로직
**작업 내용:**
```typescript
const handleExportCSV = () => {
  // 현재 필터/정렬 상태의 데이터 사용
  const csvData = filteredData.map((row) => ({
    날짜: row.reference_date,
    부서: row.department,
    부서코드: row.department_code,
    매출액: row.revenue,
    예산: row.budget,
  }));

  // CSV 문자열 생성 (UTF-8 with BOM)
  const headers = Object.keys(csvData[0]);
  const csvContent = [
    headers.join(','),
    ...csvData.map((row) =>
      headers.map((header) => `"${row[header as keyof typeof row]}"`).join(',')
    ),
  ].join('\n');

  // BOM 추가 (한글 엑셀 호환)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // 다운로드 트리거
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  link.setAttribute('href', url);
  link.setAttribute('download', `data_export_${today}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

**검증:**
- [ ] CSV 내보내기 버튼 클릭 시 파일 다운로드
- [ ] 파일명에 날짜 포함 (예: data_export_20250118.csv)
- [ ] UTF-8 with BOM 인코딩 (엑셀에서 한글 정상 표시)
- [ ] 현재 필터/정렬 상태 반영
- [ ] 엑셀에서 열 시 깨짐 없음

---

### Phase 5: 에러 처리 및 UX 개선 (우선순위: P2)

#### 4.5.1 엣지케이스 처리
**작업 내용:**

1. **데이터 없음**
```typescript
{data.length === 0 && !loading && (
  <Alert severity="info">
    조회된 데이터가 없습니다. <Link to="/upload">엑셀을 업로드</Link>하세요.
  </Alert>
)}
```

2. **검색 결과 없음**
```typescript
{filteredData.length === 0 && searchText && (
  <Alert severity="warning">
    검색 결과가 없습니다. 다른 검색어를 시도하세요.
  </Alert>
)}
```

3. **네트워크 오류**
```typescript
{error && (
  <Alert severity="error" action={
    <Button color="inherit" size="small" onClick={fetchData}>
      재시도
    </Button>
  }>
    {error}
  </Alert>
)}
```

4. **세션 만료 (API 인터셉터에서 처리)**
기존 `/services/api.ts`에서 401 에러 시 자동 로그인 페이지 리다이렉트 구현됨.

#### 4.5.2 로딩 상태 개선
```typescript
{loading && (
  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
    <CircularProgress />
  </Box>
)}
```

**검증:**
- [ ] 데이터 없을 시 안내 메시지 + 업로드 페이지 링크
- [ ] 검색 결과 없을 시 안내 메시지
- [ ] 네트워크 오류 시 재시도 버튼
- [ ] 로딩 중 스피너 표시

---

## 5. 파일 구조

### 5.1 생성/수정할 파일
```
frontend/src/
├── pages/
│   └── DataTable.tsx (수정 - 전체 구현)
└── components/ (선택적)
    └── ExportButton.tsx (CSV 내보내기 버튼 컴포넌트화)
```

### 5.2 재사용할 파일 (수정 없음)
- `/frontend/src/services/api.ts` - Axios 인터셉터
- `/frontend/src/services/performanceApi.ts` - API 함수
- `/frontend/src/types/index.ts` - 타입 정의
- `/frontend/src/layouts/DashboardLayout.tsx` - 레이아웃
- `/frontend/src/theme.ts` - MUI 테마

---

## 6. 데이터 플로우

### 6.1 초기 로딩
```
[사용자] → [/data-table 접근]
    ↓
[DataTablePage 마운트]
    ↓
[useEffect → performanceApi.getData()]
    ↓
[GET /api/data/ → Django ORM]
    ↓
[PerformanceDataSerializer → JSON]
    ↓
[setData(response.data) → MUI DataGrid 렌더링]
```

### 6.2 검색
```
[사용자] → [검색어 입력]
    ↓
[setSearchText(value)]
    ↓
[useEffect → 클라이언트 측 필터링]
    ↓
[setFilteredData(filtered) → DataGrid 리렌더링]
```

### 6.3 정렬
```
[사용자] → [컬럼 헤더 클릭]
    ↓
[MUI DataGrid 내장 정렬 로직]
    ↓
[setSortModel → 화살표 아이콘 변경]
```

### 6.4 CSV 내보내기
```
[사용자] → [CSV 내보내기 버튼 클릭]
    ↓
[filteredData 추출]
    ↓
[CSV 문자열 생성 (헤더 + 데이터)]
    ↓
[Blob 생성 + BOM 추가]
    ↓
[a 태그로 다운로드 트리거]
```

---

## 7. 테스트 계획

### 7.1 단위 테스트 (선택적 - MVP 후)
- CSV 생성 로직
- 검색 필터링 로직

### 7.2 통합 테스트
| 시나리오 | 확인 사항 |
|---------|----------|
| 초기 로딩 | 데이터 정상 표시, 50개/페이지 |
| 검색 | 검색어 입력 시 실시간 필터링 |
| 정렬 | 날짜/부서/숫자 정렬 동작 |
| 페이지네이션 | 페이지 이동 정상 동작 |
| CSV 내보내기 | 파일 다운로드, 한글 정상 표시 |
| 에러 처리 | 네트워크 오류 시 재시도 버튼 |

### 7.3 성능 테스트
| 항목 | 목표 | 측정 방법 |
|------|------|----------|
| 초기 로딩 | 3초 이내 | Network 탭 + Lighthouse |
| 검색 응답 | 200ms 이내 | React DevTools Profiler |
| 정렬 응답 | 200ms 이내 | React DevTools Profiler |
| CSV 생성 | 2초 이내 (10,000개 행 기준) | Performance API |

---

## 8. DRY 원칙 준수 체크리스트

### 8.1 공통 모듈 재사용
- [x] API 클라이언트: `performanceApi.getData()` 사용
- [x] 타입 정의: `PerformanceData` 재사용
- [x] 레이아웃: `DashboardLayout` 사용
- [x] 테마: MUI 공통 테마 적용
- [x] 에러 처리: API 인터셉터 활용

### 8.2 중복 코드 방지
- [ ] CSV 내보내기 로직 → 공통 유틸 함수로 추출 가능 (향후 개선)
- [ ] 검색 바 컴포넌트 → 다른 페이지에서도 사용 시 공통화

---

## 9. 충돌 방지 전략

### 9.1 기존 코드 변경 사항
**없음** - 기존 백엔드 API 및 프론트엔드 공통 모듈 수정 불필요

### 9.2 새로 생성하는 코드
- `/frontend/src/pages/DataTable.tsx` - 전체 재작성
- 다른 페이지(Dashboard, Upload)와 독립적으로 동작

### 9.3 API 엔드포인트 확인
**사용 API:** `GET /api/data/`
- 이미 구현됨 (`PerformanceDataViewSet`)
- 필터링 파라미터: `reference_date`, `department` (선택적 사용)

---

## 10. 개발 우선순위 및 예상 시간

### 10.1 개발 단계별 시간 배분
| Phase | 작업 내용 | 예상 시간 | 우선순위 |
|-------|----------|----------|---------|
| Phase 1 | 기본 테이블 렌더링 (API + DataGrid) | 2시간 | P0 |
| Phase 2 | 검색 기능 | 1시간 | P1 |
| Phase 3 | 정렬 기능 (MUI 내장) | 30분 | P1 |
| Phase 4 | CSV 내보내기 | 1.5시간 | P1 |
| Phase 5 | 에러 처리 및 UX 개선 | 1시간 | P2 |
| **합계** | | **6시간** | |

### 10.2 마일스톤
- **M1 (2시간):** 기본 테이블 조회 및 페이지네이션 동작
- **M2 (4시간):** 검색 + 정렬 기능 추가
- **M3 (6시간):** CSV 내보내기 + 에러 처리 완료

---

## 11. 검증 기준 (Acceptance Criteria)

### 11.1 기능 요구사항
- [ ] `/data-table` 접근 시 데이터 테이블 표시
- [ ] 5개 컬럼 표시 (날짜, 부서, 부서코드, 매출액, 예산)
- [ ] 페이지당 50개 행 표시
- [ ] 검색 기능 동작 (모든 컬럼 대상)
- [ ] 정렬 기능 동작 (각 컬럼 클릭)
- [ ] CSV 내보내기 버튼 클릭 시 파일 다운로드
- [ ] CSV 파일 한글 정상 표시 (UTF-8 with BOM)

### 11.2 비기능 요구사항
- [ ] 초기 로딩 3초 이내
- [ ] 검색 응답 200ms 이내
- [ ] 1,000개 데이터 렌더링 정상 동작
- [ ] 로딩 스피너 표시
- [ ] 에러 발생 시 재시도 버튼 제공

### 11.3 UX 요구사항
- [ ] 행 호버 시 배경색 변경
- [ ] 반응형 디자인 (모바일 가로 스크롤)
- [ ] 데이터 없을 시 안내 메시지
- [ ] 검색 결과 없을 시 안내 메시지

---

## 12. 향후 개선 사항 (YAGNI 준수)

### 12.1 현재 구현 범위 외
- 날짜 범위 필터 (DatePicker)
- 부서 멀티 셀렉트 필터
- 컬럼 커스터마이징 (보기/숨기기)
- 테이블에서 직접 수정 (inline editing)
- Excel 내보내기 (.xlsx)

### 12.2 추가 고려 시점
- 사용자 요구 발생 시
- MVP 완료 후 피드백 반영

---

## 13. 관련 문서

- [PRD 문서](/docs/prd.md) - 3.4절 데이터 테이블 페이지
- [User Flow 문서](/docs/userflow.md) - 4번 데이터 테이블 조회
- [Database 문서](/docs/database.md) - PerformanceData 모델
- [Common Modules 문서](/docs/common-modules.md) - API 클라이언트, 타입 정의
- [Use Case 004](/docs/usecase/004-data-table/spec.md) - 데이터 테이블 상세 스펙
- [Tech Stack 문서](/docs/techstack.md) - MUI DataGrid 사용 이유

---

## 14. 최종 체크리스트

### 14.1 개발 시작 전
- [x] PRD 요구사항 파악
- [x] Use Case 문서 검토
- [x] 기존 API 엔드포인트 확인
- [x] 공통 모듈 파악 (API 클라이언트, 타입)
- [x] 데이터베이스 스키마 확인

### 14.2 개발 중
- [ ] Phase 1-5 단계별 구현
- [ ] 각 Phase 완료 후 검증
- [ ] DRY 원칙 준수 확인
- [ ] 코드 리뷰 (본인 또는 팀)

### 14.3 개발 완료 후
- [ ] Acceptance Criteria 모두 통과
- [ ] 성능 테스트 (초기 로딩 3초 이내)
- [ ] 에러 시나리오 테스트
- [ ] 다른 페이지와 충돌 없음 확인
- [ ] Git Commit & Push

---

**문서 작성자:** plan-writer agent
**검토자:** 대기 중
**최종 승인:** 대기 중

**변경 이력:**
| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2025-12-18 | 초안 작성 | plan-writer agent |
