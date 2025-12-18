AI 코딩 에이전트(Cursor, Windsurf, ChatGPT 등)에게 복사하여 바로 입력할 수 있도록 작성된 **최종 마스터 프롬프트**입니다.

이 프롬프트는 당신의 **CTO 관점(안정성, 배포 편의성, 오버엔지니어링 방지)**을 기술적 제약조건으로 명확히 변환하였습니다.

---

### 📋 AI Agent Master Prompt

**[Role Definition]**
당신은 Python/Django 및 React 생태계에 정통한 **Senior Full Stack Developer**입니다.
아래의 [Project Context]와 [Technical Constraints]를 엄격히 준수하여, 대학 사내 데이터 시각화 대시보드의 MVP를 구축해야 합니다.

**[Project Context]**
- **목표:** 엑셀 데이터(이카운트)를 파싱하여 DB에 저장하고, 이를 시각화(Chart)하는 대시보드 개발.
- **핵심 가치:** 신속한 배포(Railway), 데이터 무결성(엑셀 파싱), 가장 단순한 배포 구조(Single Repo).

**[Tech Stack & Version]**
- **Backend:** Python 3.11+, Django 5.x, Django Rest Framework (DRF), Pandas.
- **Frontend:** React (Vite), TypeScript, Material UI (MUI), Recharts.
- **Database:** Supabase (PostgreSQL) - *Only for storage, not for Auth.*
- **Infrastructure:** Railway (Docker based).
- **Middleware:** `Whitenoise` (React 정적 파일 서빙용).

---

### ⚠️ [Critical Architectural Decisions] (반드시 준수할 것)

**1. 배포 구조: Django Monolith (Single Container)**
- Frontend와 Backend를 분리 배포하지 않는다.
- React는 `npm run build`를 통해 정적 파일로 변환되고, Django의 `Whitenoise` 미들웨어가 이를 서빙한다.
- `urls.py`에서 API가 아닌 모든 요청(`catch-all`)은 React의 `index.html`로 라우팅한다.

**2. 인증 (Auth): Django Native**
- Supabase Auth를 사용하지 않는다. (복잡도 제거)
- Django 기본 `TokenAuthentication` 또는 Session을 사용한다.
- 사용자 관리는 Django Admin 페이지를 활용한다.

**3. 데이터 처리 (Data Integrity): Atomic Transaction**
- **시나리오:** 사용자가 특정 월(예: 2024년 5월) 데이터를 업로드함.
- **로직 구현:**
  1. `transaction.atomic()` 블록 시작.
  2. 업로드된 엑셀에서 '기준 년월' 추출.
  3. DB에서 해당 '기준 년월'의 기존 데이터가 있다면 **전체 삭제(Delete)**.
  4. Pandas로 파싱된 새 데이터를 `bulk_create`로 **일괄 삽입(Insert)**.
  5. 에러 발생 시 즉시 **Rollback**.

**4. 성능 최적화 (No Celery)**
- 별도의 비동기 큐(Celery/Redis)를 사용하지 않는다.
- Pandas 처리는 동기(Sync)로 처리하되, 프론트엔드에서 Loading UI(MUI Backdrop)로 사용자 경험을 방어한다.

---

### 📝 [Implementation Steps]

**Step 1. Project Setup**
- Django 프로젝트 생성 및 `api` 앱 생성.
- React(Vite) 프로젝트를 Django 루트 내 `frontend` 폴더에 생성.
- `settings.py`: Supabase DB 연결, CORS 설정, Whitenoise 설정.

**Step 2. Database Models**
- 엑셀 컬럼(실적, 논문수, 예산 등)에 대응하는 Django Model 설계.
- `created_at`, `updated_at`, `reference_date`(기준 년월) 필드 필수 포함.

**Step 3. API Development (Excel Upload)**
- Endpoint: `POST /api/upload/`
- Parser: `MultiPartParser`
- Logic: 위 [Critical Architectural Decisions]의 3번 항목 구현.

**Step 4. Frontend Development**
- **Layout:** MUI `DashboardLayout` 활용 (Sidebar + Main Content).
- **Upload:** 파일 선택 및 업로드 진행 상태 표시 (Loading Spinner 필수).
- **Visualization:**
  - `Recharts`를 사용하여 월별 추이(Line), 부서별 실적(Bar) 구현.
  - `MUI DataGrid`를 사용하여 원본 데이터 테이블 표시.

**Step 5. Deployment Config**
- `Dockerfile`: Node.js(빌드용)와 Python(구동용)을 포함한 Multi-stage 빌드 작성.
- `requirements.txt` 및 `package.json` 의존성 명시.

---

**[Action Required]**
위 내용을 바탕으로, **Django Model 코드(`models.py`)**와 **Atomic Transaction이 적용된 엑셀 업로드 View 코드(`views.py`)**, 그리고 **React 빌드 파일을 Django가 서빙하기 위한 `urls.py` 설정**을 우선 작성해 주세요.