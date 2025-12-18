# Product Requirements Document (PRD)
# 대학 데이터 시각화 대시보드

**문서 버전:** 1.0
**작성일:** 2025-12-18
**프로젝트명:** 대학 데이터 시각화 대시보드
**배포 환경:** Railway (Django Monolith)

---

## 1. 제품 개요 (Product Overview)

### 1.1 배경 (Background)
대학교 내부에서는 실적, 논문 게재 수, 학생 수, 예산 등 다양한 데이터를 이카운트(Ecount) 시스템으로 관리하고 있습니다. 그러나 이카운트가 제공하는 기본 그래프는 시인성이 낮고 활용도가 떨어져 의사결정에 어려움이 있습니다.

### 1.2 목표 (Goals)
본 프로젝트는 이카운트에서 추출한 엑셀 데이터를 웹 기반 대시보드로 시각화하여, 대학 내부 직원들이 다음을 달성할 수 있도록 합니다:

1. **데이터 접근성 향상**: 엑셀 파일을 업로드하여 자동으로 시각화
2. **의사결정 지원**: 직관적인 그래프로 성과 및 추이 파악
3. **보안 강화**: 허가된 사용자만 접근 가능한 로그인 시스템
4. **유지보수 용이성**: Django Monolith 구조로 1인 개발자도 관리 가능

### 1.3 성공 지표 (Success Metrics)
- 엑셀 업로드 후 5초 이내 데이터 시각화 완료
- 사용자 인터페이스 직관성: 별도 교육 없이 사용 가능
- 데이터 정확성: 엑셀 원본 대비 100% 일치
- 시스템 가용성: 99% 이상 업타임 (Railway 기준)

### 1.4 제약 사항 (Constraints)
- 예산: 대학 지원사업 예산 내 개발
- 사용자: 대학 내부 직원 (약 10-50명 예상)
- 데이터 소스: 이카운트에서 추출한 엑셀 파일만 지원
- 배포: Railway 플랫폼 사용 (Docker 기반)
- 기술 스택: Django + React (Vite) + Supabase (PostgreSQL)

---

## 2. Stakeholders

| 역할 | 담당자 | 책임 범위 |
|------|--------|----------|
| **Product Owner** | 대학 행정 담당자 | 요구사항 정의, 최종 승인 |
| **Primary Users** | 대학 내부 직원 (관리자/일반 사용자) | 데이터 업로드, 대시보드 조회 |
| **Developer** | 1인 인디해커 | 풀스택 개발, 배포, 유지보수 |
| **Data Provider** | 이카운트 시스템 관리자 | 엑셀 데이터 추출 및 제공 |
| **IT Administrator** | 대학 IT 부서 | 서버 인프라 관리, 보안 정책 |

---

## 3. 포함 페이지 (Pages & Features)

### 3.1 로그인 페이지 (Login Page)
**URL:** `/admin/login/` (Django Admin 활용)
**목적:** 허가된 사용자만 시스템 접근

#### 기능 상세
- **인증 방식**: Django Native Auth (Session-based)
- **입력 필드**:
  - 아이디 (Username)
  - 비밀번호 (Password)
- **동작**:
  - 로그인 성공 시 → 대시보드 페이지로 리다이렉트
  - 로그인 실패 시 → 에러 메시지 표시 ("아이디 또는 비밀번호가 올바르지 않습니다")
- **보안**:
  - CSRF 토큰 적용
  - 비밀번호 해싱 (Django 기본 PBKDF2)
  - 세션 쿠키 HttpOnly, Secure 플래그 설정

#### UI/UX
- Material UI 기반 심플한 로그인 폼
- 반응형 디자인 (모바일 지원)

---

### 3.2 대시보드 페이지 (Dashboard Page)
**URL:** `/dashboard`
**목적:** 주요 지표를 한눈에 시각화

#### 레이아웃
- **좌측 사이드바**: 네비게이션 메뉴
  - 대시보드
  - 데이터 업로드
  - 데이터 테이블
  - 로그아웃
- **상단 헤더**: 페이지 제목 + 사용자 정보
- **메인 영역**: 그래프 카드 (Grid 레이아웃)

#### 시각화 차트
1. **월별 추이 라인 차트 (Monthly Trend Line Chart)**
   - **데이터**: 월별 실적 합계
   - **라이브러리**: Recharts LineChart
   - **X축**: 월 (YYYY-MM)
   - **Y축**: 실적 값 (금액 또는 건수)
   - **인터랙션**: 호버 시 상세 수치 표시

2. **부서별 실적 막대그래프 (Department Bar Chart)**
   - **데이터**: 부서별 실적 합계
   - **라이브러리**: Recharts BarChart
   - **X축**: 부서명
   - **Y축**: 실적 값
   - **색상**: 부서별 고유 색상 자동 할당

3. **카테고리별 분포 파이 차트 (Category Pie Chart)**
   - **데이터**: 카테고리별 비중
   - **라이브러리**: Recharts PieChart
   - **표시**: 퍼센트 + 절대값
   - **인터랙션**: 클릭 시 해당 카테고리 상세 보기

#### 필터링 기능
- **기간 선택**: 날짜 범위 필터 (DatePicker)
- **부서 선택**: 드롭다운 멀티 셀렉트
- **카테고리 선택**: 체크박스 그룹

#### 성능 요구사항
- 초기 로딩: 3초 이내
- 필터 적용 시 렌더링: 1초 이내
- 데이터 갱신: 실시간 (업로드 완료 후 자동 새로고침)

---

### 3.3 데이터 업로드 페이지 (Upload Page)
**URL:** `/upload`
**목적:** 엑셀 파일을 업로드하여 DB에 저장

#### 기능 상세
- **파일 선택**:
  - 지원 포맷: `.xlsx`, `.xls`
  - 최대 파일 크기: 10MB
  - Drag & Drop 지원
- **업로드 프로세스**:
  1. 파일 선택 후 "업로드" 버튼 클릭
  2. 파일 검증 (형식, 크기 체크)
  3. 서버로 POST 요청 (`/api/upload/`)
  4. 백엔드에서 Pandas로 파싱
  5. `reference_date` 추출 후 기존 데이터 삭제
  6. 새 데이터 bulk_create (Atomic Transaction)
  7. 성공/실패 응답 받아 사용자에게 피드백

- **UI 상태**:
  - **대기**: "파일을 선택하거나 드래그하세요" 안내 메시지
  - **업로드 중**: 로딩 스피너 + "업로드 중..." 메시지
  - **성공**: 초록색 체크 아이콘 + "업로드 완료! 대시보드로 이동합니다."
  - **실패**: 빨간색 경고 아이콘 + 에러 메시지 (예: "엑셀 파일 형식이 올바르지 않습니다")

#### 엑셀 파일 구조 예시
| 날짜 (reference_date) | 부서 (department) | 카테고리 (category) | 실적 (value) |
|-----------------------|-------------------|---------------------|--------------|
| 2024-01-01 | 연구개발팀 | 논문 | 5 |
| 2024-01-01 | 행정팀 | 예산 | 1200000 |

#### 에러 처리
- **파일 형식 오류**: "지원하지 않는 파일 형식입니다. .xlsx 또는 .xls 파일을 업로드하세요."
- **파일 크기 초과**: "파일 크기가 10MB를 초과합니다."
- **파싱 실패**: "엑셀 파일의 데이터 형식이 올바르지 않습니다. 샘플 템플릿을 확인하세요."
- **DB 저장 실패**: "서버 오류가 발생했습니다. 관리자에게 문의하세요."

---

### 3.4 데이터 테이블 페이지 (Data Table Page)
**URL:** `/data-table`
**목적:** 업로드된 원본 데이터를 테이블 형태로 조회

#### 기능 상세
- **테이블 컴포넌트**: MUI DataGrid
- **컬럼**:
  - 날짜 (reference_date)
  - 부서 (department)
  - 카테고리 (category)
  - 실적 (value)
- **기능**:
  - 정렬 (Sorting): 각 컬럼 클릭 시 오름차순/내림차순
  - 검색 (Search): 전체 컬럼 대상 텍스트 검색
  - 페이지네이션 (Pagination): 한 페이지당 50개 행 표시
  - 내보내기 (Export): CSV 다운로드 버튼

#### UI 요구사항
- 반응형 테이블 (모바일에서는 가로 스크롤)
- 행 호버 시 배경색 변경
- 헤더 고정 (상단 스크롤 시에도 컬럼명 유지)

---

### 3.5 관리자 페이지 (Admin Page)
**URL:** `/admin/`
**목적:** Django Admin을 통한 데이터 및 사용자 관리

#### 기능
- **사용자 관리**: 직원 계정 생성/수정/삭제
- **데이터 관리**: PerformanceData 모델 CRUD
- **권한 관리**: Superuser, Staff, 일반 사용자 권한 구분

---

## 4. 사용자 여정 (User Journey)

### 4.1 타겟 유저 Segment

#### Segment 1: 관리자 (Administrator)
- **역할**: 데이터 업로드 및 전체 시스템 관리
- **기술 수준**: 중급 (엑셀 다루기 가능, 웹 인터페이스 익숙)
- **빈도**: 주 1-2회 업로드, 일일 대시보드 모니터링

#### Segment 2: 일반 사용자 (Viewer)
- **역할**: 대시보드 조회 전용
- **기술 수준**: 초급 (간단한 웹 브라우징만 가능)
- **빈도**: 필요 시 대시보드 조회 (주 1-2회)

---

### 4.2 관리자 사용자 여정 (Administrator Journey)

#### Journey 1: 엑셀 데이터 업로드
1. **로그인 페이지** (`/admin/login/`)
   - 아이디/비밀번호 입력 후 로그인 버튼 클릭
   - 로그인 성공 시 → 대시보드 페이지로 리다이렉트

2. **데이터 업로드 페이지** (`/upload`)
   - 좌측 사이드바에서 "데이터 업로드" 메뉴 클릭
   - 이카운트에서 다운로드한 엑셀 파일을 Drag & Drop
   - "업로드" 버튼 클릭
   - 로딩 스피너 표시 (약 3-5초)
   - "업로드 완료!" 메시지 확인 후 자동으로 대시보드 이동

3. **대시보드 페이지** (`/dashboard`)
   - 업로드한 데이터가 자동으로 차트에 반영됨
   - 월별 추이, 부서별 실적, 카테고리 분포 확인
   - 필요 시 기간/부서 필터 적용하여 세부 분석

4. **데이터 테이블 페이지** (`/data-table`)
   - 원본 데이터 검증 필요 시 테이블 페이지로 이동
   - 검색 기능으로 특정 부서 데이터 확인
   - CSV 내보내기로 로컬 저장

---

### 4.3 일반 사용자 여정 (Viewer Journey)

#### Journey 2: 대시보드 조회
1. **로그인 페이지** (`/admin/login/`)
   - 부여받은 계정으로 로그인

2. **대시보드 페이지** (`/dashboard`)
   - 직접 대시보드 페이지로 이동
   - 차트를 통해 부서별 실적 비교
   - 호버 인터랙션으로 상세 수치 확인

3. **로그아웃**
   - 사이드바에서 "로그아웃" 버튼 클릭
   - 로그인 페이지로 리다이렉트

---

### 4.4 Journey Map (Flow Diagram)

```
[로그인] → [대시보드 조회] → [필터 적용] → [차트 분석]
   │
   └──→ [데이터 업로드] → [파일 선택] → [업로드 완료] → [대시보드 자동 갱신]
           │
           └──→ [데이터 테이블] → [검색/정렬] → [CSV 내보내기]
```

---

## 5. Information Architecture (IA)

### 5.1 사이트 구조 (Tree Visualization)

```
대학 데이터 시각화 대시보드
│
├── 인증 (Authentication)
│   └── 로그인 페이지 (/admin/login/)
│       ├── 아이디 입력
│       ├── 비밀번호 입력
│       └── 로그인 버튼
│
├── 메인 네비게이션 (Main Navigation)
│   │
│   ├── 1. 대시보드 (/dashboard)
│   │   ├── 헤더
│   │   │   ├── 페이지 제목
│   │   │   └── 사용자 정보
│   │   │
│   │   ├── 필터 영역
│   │   │   ├── 기간 선택 (DatePicker)
│   │   │   ├── 부서 선택 (Multi-select)
│   │   │   └── 카테고리 선택 (Checkbox)
│   │   │
│   │   └── 차트 영역 (Grid Layout)
│   │       ├── 월별 추이 라인 차트
│   │       │   ├── X축: 월 (YYYY-MM)
│   │       │   ├── Y축: 실적 값
│   │       │   └── 호버 툴팁
│   │       │
│   │       ├── 부서별 실적 막대그래프
│   │       │   ├── X축: 부서명
│   │       │   ├── Y축: 실적 값
│   │       │   └── 색상 구분
│   │       │
│   │       └── 카테고리별 분포 파이 차트
│   │           ├── 퍼센트 표시
│   │           └── 클릭 인터랙션
│   │
│   ├── 2. 데이터 업로드 (/upload)
│   │   ├── 파일 업로드 영역
│   │   │   ├── Drag & Drop Zone
│   │   │   ├── 파일 선택 버튼
│   │   │   └── 파일 형식 안내 (*.xlsx, *.xls)
│   │   │
│   │   ├── 업로드 버튼
│   │   │
│   │   └── 상태 표시 영역
│   │       ├── 로딩 스피너
│   │       ├── 성공 메시지
│   │       └── 에러 메시지
│   │
│   ├── 3. 데이터 테이블 (/data-table)
│   │   ├── 테이블 헤더
│   │   │   ├── 날짜 (정렬 가능)
│   │   │   ├── 부서 (정렬 가능)
│   │   │   ├── 카테고리 (정렬 가능)
│   │   │   └── 실적 (정렬 가능)
│   │   │
│   │   ├── 검색 바
│   │   │
│   │   ├── 페이지네이션 (50개/페이지)
│   │   │
│   │   └── CSV 내보내기 버튼
│   │
│   └── 4. 로그아웃
│       └── 세션 종료 → 로그인 페이지 리다이렉트
│
└── 관리자 전용 (Admin Only)
    └── Django Admin (/admin/)
        ├── 사용자 관리
        │   ├── 사용자 목록
        │   ├── 사용자 추가
        │   ├── 사용자 수정
        │   └── 사용자 삭제
        │
        └── 데이터 관리
            ├── PerformanceData 모델 CRUD
            ├── 데이터 필터링
            └── 데이터 검색
```

---

### 5.2 URL 라우팅 전략

| URL | 역할 | 권한 | 비고 |
|-----|------|------|------|
| `/admin/login/` | 로그인 | 공개 | Django Admin 로그인 |
| `/admin/` | Django Admin | Superuser/Staff | 사용자 및 데이터 관리 |
| `/dashboard` | 대시보드 | 인증 필요 | React 메인 페이지 |
| `/upload` | 엑셀 업로드 | 인증 필요 | React 업로드 페이지 |
| `/data-table` | 데이터 테이블 | 인증 필요 | React 테이블 페이지 |
| `/api/upload/` | 엑셀 업로드 API | 인증 필요 | POST 요청 |
| `/api/data/` | 데이터 조회 API | 인증 필요 | GET 요청 |

---

## 6. 기술 요구사항 (Technical Requirements)

### 6.1 백엔드 (Django)

#### 데이터 모델 (Data Model)
```python
# api/models.py
class PerformanceData(models.Model):
    reference_date = models.DateField()  # 기준 날짜
    department = models.CharField(max_length=100)  # 부서
    category = models.CharField(max_length=100)  # 카테고리
    value = models.DecimalField(max_digits=15, decimal_places=2)  # 실적 값
    created_at = models.DateTimeField(auto_now_add=True)  # 생성일

    class Meta:
        indexes = [
            models.Index(fields=['reference_date']),
            models.Index(fields=['department']),
        ]
```

#### API 엔드포인트

1. **POST /api/upload/**
   - **기능**: 엑셀 파일 업로드 및 파싱
   - **Request**: `multipart/form-data` (파일)
   - **Response**: `{ "message": "업로드 완료", "count": 150 }`
   - **에러**: `{ "error": "파일 형식 오류" }` (400 Bad Request)

2. **GET /api/data/**
   - **기능**: 전체 데이터 조회
   - **Query Params**:
     - `start_date` (optional): YYYY-MM-DD
     - `end_date` (optional): YYYY-MM-DD
     - `department` (optional): 부서명
   - **Response**: `[ { "reference_date": "2024-01-01", "department": "연구팀", ... } ]`

#### 보안 요구사항
- CSRF 보호 (Django 기본 설정)
- SQL Injection 방지 (ORM 사용)
- XSS 방지 (React 기본 이스케이핑)
- Atomic Transaction (데이터 업로드 시)

---

### 6.2 프론트엔드 (React + Vite)

#### 컴포넌트 구조
```
src/
├── components/
│   ├── Layout/
│   │   └── DashboardLayout.tsx
│   ├── Charts/
│   │   ├── MonthlyTrendChart.tsx
│   │   ├── DepartmentBarChart.tsx
│   │   └── CategoryPieChart.tsx
│   └── Upload/
│       └── ExcelUploader.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Upload.tsx
│   └── DataTable.tsx
├── services/
│   └── api.ts
└── types/
    └── index.ts
```

#### 상태 관리
- **Local State**: React useState (페이지별 상태)
- **Global State**: 필요 시 Context API (사용자 정보)
- **서버 상태**: API 호출 후 직접 관리 (React Query는 향후 검토)

#### UI 라이브러리
- **Material UI (MUI)**: 버튼, 폼, 레이아웃
- **Recharts**: 차트 시각화
- **MUI DataGrid**: 테이블 컴포넌트

---

### 6.3 데이터베이스 (Supabase PostgreSQL)

#### 테이블 스키마
```sql
CREATE TABLE api_performancedata (
    id SERIAL PRIMARY KEY,
    reference_date DATE NOT NULL,
    department VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    value DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reference_date ON api_performancedata(reference_date);
CREATE INDEX idx_department ON api_performancedata(department);
```

---

### 6.4 배포 (Railway)

#### Dockerfile
- **Multi-stage Build**:
  1. Node.js 20-alpine으로 React 빌드
  2. Python 3.11-slim으로 Django 실행
- **정적 파일**: Whitenoise로 서빙

#### 환경변수
```bash
DEBUG=False
SECRET_KEY=<django-secret-key>
DATABASE_URL=postgres://user:pass@host:5432/dbname
ALLOWED_HOSTS=.railway.app,localhost
```

---

## 7. 비기능 요구사항 (Non-Functional Requirements)

### 7.1 성능
- 엑셀 업로드 처리 시간: 10,000행 기준 5초 이내
- 대시보드 초기 로딩: 3초 이내 (캐싱 없이)
- 차트 렌더링: 1초 이내

### 7.2 확장성
- 데이터베이스: PostgreSQL 인덱싱으로 10만 행까지 지원
- 동시 사용자: 50명까지 원활한 사용

### 7.3 유지보수성
- 코드 표준: PEP 8 (Python), ESLint (TypeScript)
- 주석: 복잡한 로직에 한글 주석 필수
- 문서화: API 문서 자동 생성 (DRF Swagger 향후 검토)

### 7.4 접근성
- WCAG 2.1 Level A 준수 (키보드 네비게이션, 대체 텍스트)
- 반응형 디자인: 데스크탑, 태블릿, 모바일 지원

---

## 8. 개발 단계 (Development Phases)

### Phase 1: MVP (Minimum Viable Product) - 2주
- [x] Django 프로젝트 초기 설정
- [x] Supabase PostgreSQL 연결
- [ ] 엑셀 업로드 API 구현
- [ ] React 대시보드 기본 레이아웃
- [ ] 로그인 기능 (Django Admin)

### Phase 2: 시각화 및 UI 개선 - 1주
- [ ] Recharts 차트 3종 구현
- [ ] MUI DataGrid 테이블 구현
- [ ] 필터링 기능 추가
- [ ] 반응형 디자인 적용

### Phase 3: 배포 및 테스트 - 1주
- [ ] Dockerfile 최적화
- [ ] Railway 배포
- [ ] 엑셀 샘플 데이터로 통합 테스트
- [ ] 사용자 수락 테스트 (UAT)

---

## 9. 위험 요소 및 대응 방안 (Risks & Mitigation)

| 위험 요소 | 영향도 | 대응 방안 |
|-----------|--------|----------|
| 엑셀 파일 형식 불일치 | 높음 | 템플릿 제공 + 파싱 에러 핸들링 강화 |
| 대용량 엑셀 업로드 시 타임아웃 | 중간 | 청크 단위 처리 또는 백그라운드 작업 (Celery) |
| Railway 무료 플랜 제한 | 중간 | 유료 플랜 전환 또는 다른 PaaS 검토 |
| Django Session 만료 | 낮음 | Session Timeout 설정 연장 (7일) |

---

## 10. 후속 작업 (Future Enhancements)

- **대시보드 커스터마이징**: 사용자별 차트 레이아웃 저장
- **알림 기능**: 특정 지표 임계값 도달 시 이메일 알림
- **권한 세분화**: 부서별 데이터 접근 제한
- **엑셀 템플릿 다운로드**: 표준 양식 제공
- **데이터 이력 관리**: 업로드된 파일 버전 관리

---

## 11. 부록 (Appendix)

### 11.1 용어 정리
- **이카운트 (Ecount)**: 대학에서 사용하는 ERP 시스템
- **Atomic Transaction**: 데이터 업로드 시 전부 성공 또는 전부 실패 보장
- **Whitenoise**: Django에서 정적 파일을 서빙하는 미들웨어
- **Monolith**: 프론트엔드와 백엔드를 하나의 Django 프로젝트로 배포

### 11.2 참고 자료
- Django 공식 문서: https://docs.djangoproject.com/
- Recharts 공식 문서: https://recharts.org/
- Material UI 공식 문서: https://mui.com/
- Railway 배포 가이드: https://docs.railway.app/

---

**문서 승인**
- [ ] Product Owner
- [ ] Developer
- [ ] IT Administrator

**변경 이력**
| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2025-12-18 | 초안 작성 | PRD Writer Agent |
