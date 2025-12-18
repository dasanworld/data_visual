# Project Architecture Report
## 대학 데이터 시각화 대시보드 MVP

---

## 1. Tech Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend** | Python | 3.11+ | Runtime |
| | Django | 5.x | Web Framework |
| | Django REST Framework | 3.14+ | API Development |
| | Pandas | 2.x | Excel Parsing |
| | Whitenoise | 6.x | Static File Serving |
| **Frontend** | React | 18.x | UI Library |
| | Vite | 5.x | Build Tool |
| | TypeScript | 5.x | Type Safety |
| | Material UI (MUI) | 5.x | UI Components |
| | Recharts | 2.x | Data Visualization |
| **Database** | PostgreSQL | 15+ | Via Supabase |
| **Infrastructure** | Railway | - | Docker Deployment |

---

## 2. Project Structure

```
04_02data_visual/
├── docs/                          # 문서
│   ├── project-architecture.md    # 본 문서
│   ├── marketing/
│   └── persona.md
├── prompt/                        # AI 프롬프트
│   └── TechStack-plan.md
│
├── backend/                       # Django Backend
│   ├── config/                    # Django 설정 (프로젝트 루트)
│   │   ├── __init__.py
│   │   ├── settings.py           # DB, Whitenoise, CORS 설정
│   │   ├── urls.py               # 메인 URL 라우팅 + React catch-all
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   ├── api/                       # API 앱
│   │   ├── __init__.py
│   │   ├── models.py             # 데이터 모델 (PerformanceData)
│   │   ├── views.py              # Excel Upload API (Atomic Transaction)
│   │   ├── serializers.py        # DRF Serializers
│   │   ├── urls.py               # API URL 라우팅
│   │   └── admin.py              # Django Admin 설정
│   │
│   ├── manage.py
│   └── requirements.txt           # Python 의존성
│
├── frontend/                      # React Frontend (Vite)
│   ├── src/
│   │   ├── components/           # 재사용 컴포넌트
│   │   │   ├── Layout/
│   │   │   │   └── DashboardLayout.tsx
│   │   │   ├── Charts/
│   │   │   │   ├── MonthlyTrendChart.tsx
│   │   │   │   └── DepartmentBarChart.tsx
│   │   │   └── Upload/
│   │   │       └── ExcelUploader.tsx
│   │   │
│   │   ├── pages/                # 페이지 컴포넌트
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Upload.tsx
│   │   │   └── DataTable.tsx
│   │   │
│   │   ├── services/             # API 통신
│   │   │   └── api.ts
│   │   │
│   │   ├── types/                # TypeScript 타입 정의
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   │
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── staticfiles/                   # collectstatic 결과물 (gitignore)
├── Dockerfile                     # Multi-stage build
├── docker-compose.yml             # 로컬 개발용
├── .env.example                   # 환경변수 템플릿
└── .gitignore
```

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Railway (Docker)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Django Application                      │  │
│  │                                                            │  │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │  │
│  │   │   Gunicorn  │───▶│    Django   │───▶│     DRF     │   │  │
│  │   │   (WSGI)    │    │   (Python)  │    │    (API)    │   │  │
│  │   └─────────────┘    └─────────────┘    └─────────────┘   │  │
│  │          │                  │                  │           │  │
│  │          │           ┌──────┴──────┐          │           │  │
│  │          │           │  Whitenoise │          │           │  │
│  │          │           │  (Static)   │          │           │  │
│  │          │           └──────┬──────┘          │           │  │
│  │          │                  │                  │           │  │
│  │          │           ┌──────┴──────┐          │           │  │
│  │          │           │ React Build │          │           │  │
│  │          │           │ (index.html)│          │           │  │
│  │          │           └─────────────┘          │           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Supabase       │
                    │    (PostgreSQL)     │
                    │  - Storage Only     │
                    │  - No Auth          │
                    └─────────────────────┘
```

---

## 4. Key File Descriptions

### 4.1 Backend Files

| File | Purpose |
|------|---------|
| `config/settings.py` | Supabase DB 연결, Whitenoise 설정, CORS 허용, Static 경로 설정 |
| `config/urls.py` | `/api/*` 라우팅 + React SPA catch-all (`re_path(r'^.*$')`) |
| `api/models.py` | `PerformanceData` 모델 - 엑셀 컬럼 매핑 |
| `api/views.py` | `ExcelUploadView` - Atomic Transaction 적용 업로드 |
| `api/serializers.py` | DRF Serializer 정의 |

### 4.2 Frontend Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | React Router 설정 |
| `src/components/Layout/DashboardLayout.tsx` | MUI 기반 사이드바 레이아웃 |
| `src/components/Upload/ExcelUploader.tsx` | 파일 업로드 + Loading UI |
| `src/components/Charts/*.tsx` | Recharts 기반 시각화 컴포넌트 |
| `src/services/api.ts` | Axios 기반 API 통신 레이어 |

### 4.3 Deployment Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (Node.js → Python) |
| `requirements.txt` | Python 패키지 의존성 |
| `frontend/package.json` | Node.js 패키지 의존성 |

---

## 5. Data Flow

### 5.1 Excel Upload Flow

```
[User] ──▶ [React Upload UI] ──▶ POST /api/upload/
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │  ExcelUploadView    │
                              │                     │
                              │  1. Parse Excel     │
                              │     (Pandas)        │
                              │                     │
                              │  2. Extract         │
                              │     reference_date  │
                              │                     │
                              │  3. transaction.    │
                              │     atomic():       │
                              │     - DELETE old    │
                              │     - bulk_create   │
                              │                     │
                              │  4. Return Response │
                              └─────────────────────┘
                                        │
                                        ▼
                              [Supabase PostgreSQL]
```

### 5.2 Data Visualization Flow

```
[User] ──▶ [Dashboard Page] ──▶ GET /api/data/
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  DataListView   │
                            │  (DRF ViewSet)  │
                            └─────────────────┘
                                      │
                                      ▼
                            [JSON Response]
                                      │
                                      ▼
                ┌─────────────────────┴─────────────────────┐
                │                                           │
                ▼                                           ▼
        [Recharts]                                  [MUI DataGrid]
        - LineChart (월별 추이)                      - 원본 데이터 테이블
        - BarChart (부서별 실적)
```

---

## 6. Authentication Strategy

```
┌─────────────────────────────────────────────────────────┐
│                  Django Native Auth                      │
│                                                          │
│   ┌─────────────┐     ┌─────────────┐                   │
│   │   Login     │────▶│   Session   │                   │
│   │   (Admin)   │     │   Cookie    │                   │
│   └─────────────┘     └─────────────┘                   │
│          │                                               │
│          ▼                                               │
│   ┌─────────────────────────────────────────────────┐   │
│   │              Django Admin Panel                  │   │
│   │              /admin/                             │   │
│   │              - User CRUD                         │   │
│   │              - Data Management                   │   │
│   └─────────────────────────────────────────────────┘   │
│                                                          │
│   Alternative: TokenAuthentication (for API clients)     │
└─────────────────────────────────────────────────────────┘
```

---

## 7. URL Routing Strategy

```python
# config/urls.py

urlpatterns = [
    path('admin/', admin.site.urls),          # Django Admin
    path('api/', include('api.urls')),        # API Endpoints
    re_path(r'^.*$', serve_react),            # React SPA Catch-all
]
```

**우선순위:**
1. `/admin/*` → Django Admin
2. `/api/*` → DRF API Endpoints
3. `/*` (나머지 전부) → React index.html

---

## 8. Environment Variables

```bash
# .env.example

# Django
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=.railway.app,localhost

# Supabase PostgreSQL
DATABASE_URL=postgres://user:password@host:5432/dbname

# CORS (개발 시)
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## 9. Deployment Strategy (Railway)

### Dockerfile Multi-stage Build

```dockerfile
# Stage 1: Build React
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Runtime
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./staticfiles/
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## 10. Next Steps

1. **Django 프로젝트 생성** - `backend/` 디렉토리 구성
2. **Models 작성** - `api/models.py`
3. **Views 작성** - Atomic Transaction 적용 Excel Upload
4. **URLs 설정** - API + React catch-all
5. **Frontend 구성** - Vite + React + TypeScript
6. **배포 설정** - Dockerfile, Railway 연동

---

*Generated: 2024-12-18*
