# 🚀 GitHub Actions CI/CD Setup Guide

**GitHub Actions를 사용한 자동화된 테스트 및 배포 파이프라인 설정 가이드**

---

## 📋 개요

이 프로젝트는 다음 4개의 GitHub Actions 워크플로우를 포함하고 있습니다:

| 워크플로우 | 파일 | 트리거 | 역할 |
|-----------|------|--------|------|
| **Test Suite** | `.github/workflows/test.yml` | Push, PR, 수동 | Backend + Frontend 테스트 |
| **E2E Tests** | `.github/workflows/e2e.yml` | Push, PR, 수동, 스케줄 | E2E 테스트 (매일 자정) |
| **Lint & Quality** | `.github/workflows/lint.yml` | Push, PR, 수동 | 코드 린트 및 품질 체크 |
| **PR Review** | `.github/workflows/pr-check.yml` | PR 생성/수정 | PR 자동 검증 및 리뷰 |

---

## 🛠️ 설정 준비사항

### 1. 필수 설정

#### GitHub Repository 설정
```
Settings → Code and automation → Actions → General
  ✅ Allow all actions and reusable workflows
  ✅ Require status checks to pass before merging
```

#### Branch Protection Rule (선택)
```
Settings → Code and automation → Branches → Add rule
  Branch name pattern: main
  ✅ Require a pull request before merging
  ✅ Require status checks to pass before merging
     - Select: All required checks
  ✅ Require up-to-date branches before merging
```

### 2. 필수 환경 변수 (없으면 기본값 사용)

GitHub Secrets 설정:
```
Settings → Secrets and variables → Actions → New repository secret
```

**선택적 Secrets** (Codecov 통합시):
```
CODECOV_TOKEN: <your-codecov-token>
```

**선택적 Secrets** (배포시):
```
DEPLOY_KEY: <your-deploy-key>
DEPLOY_HOST: <your-deploy-host>
DEPLOY_USER: <your-deploy-user>
```

---

## 📁 파일 구조

```
.github/
├── workflows/
│   ├── test.yml              # Backend + Frontend 테스트
│   ├── e2e.yml               # E2E 테스트
│   ├── lint.yml              # 린트 및 코드 품질
│   └── pr-check.yml          # PR 자동 검증
└── commitlint.config.js      # 커밋 메시지 검증

backend/
├── .flake8                   # Flake8 설정
├── .pylintrc                 # Pylint 설정
├── pyproject.toml            # Black, Pyright 설정
└── requirements.txt          # Python 의존성

frontend/
├── .prettierrc               # Prettier 설정
├── .prettierignore           # Prettier 제외 목록
└── package.json              # Node.js 의존성

e2e/
├── playwright.config.ts      # Playwright 설정
└── package.json              # E2E 의존성
```

---

## 🔄 Workflow 상세 설명

### 1️⃣ Test Suite Workflow (test.yml)

#### 트리거 조건
- ✅ `main` 브랜치 push
- ✅ `main` 브랜치로의 PR
- ✅ 수동 실행 (workflow_dispatch)

#### 실행 순서
```
┌─────────────────────────┐
│   Test Suite Triggered  │
└───────────┬─────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Backend Test │  │ Frontend Test│
│  (pytest)    │  │  (npm test)  │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └─────────┬───────┘
                 │
            ▼────────────▼
        ┌────────────────┐
        │ Test Summary   │
        │ & Coverage     │
        └────────────────┘
```

#### 실행 내용

**Backend Test**
```bash
1. Python 3.13 설정
2. requirements.txt 설치
3. pytest 실행
   └─ 68개 테스트 실행
4. 커버리지 리포트 생성
5. Codecov 업로드 (선택)
6. 아티팩트 저장 (7일)

예상 시간: ~60초
```

**Frontend Test**
```bash
1. Node.js 20 설정
2. npm install
3. npm test 실행
   └─ 36개 테스트 실행
4. 커버리지 리포트 생성
5. Codecov 업로드 (선택)
6. 아티팩트 저장 (7일)

예상 시간: ~60초
```

#### 성공 표시
```
✅ All tests passed
Backend: 68/68 ✓
Frontend: 36/36 ✓
Coverage: > 80%
```

#### 실패 표시
```
❌ Tests failed
Backend: 65/68 ✗
Frontend: 36/36 ✓
Error: See logs for details
```

---

### 2️⃣ E2E Tests Workflow (e2e.yml)

#### 트리거 조건
- ✅ `main` 브랜치 push
- ✅ `main` 브랜치로의 PR
- ✅ 수동 실행
- ✅ 매일 자정 (스케줄)

#### 실행 순서
```
┌─────────────────────────────┐
│   E2E Tests Triggered       │
└──────────────┬──────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────────────┐  ┌────────────────┐
│ Setup Backend    │  │ Setup E2E      │
│ - Python 3.13    │  │ - Node.js 20   │
│ - Dependencies   │  │ - Playwright   │
│ - Migrations     │  │ - Browsers     │
│ - Test Data      │  └────────────────┘
│ - Server Start   │
└────────┬─────────┘
         │
         ▼
    ┌───────────────┐
    │ Run E2E Tests │
    │ 21 scenarios  │
    └───────┬───────┘
            │
            ▼
    ┌──────────────────┐
    │ Upload Artifacts │
    │ - Screenshots    │
    │ - Videos         │
    │ - Reports        │
    └──────────────────┘
```

#### 실행 내용

**Setup Phase**
```bash
1. 코드 체크아웃
2. Python & Node.js 설정
3. 의존성 설치
4. Django 마이그레이션
5. 테스트 데이터 생성
6. Django 서버 시작
7. Playwright 브라우저 설치
```

**Test Phase**
```bash
1. Smoke Test (3개)
   - 전체 업로드 흐름
   - 인증 검증
   - 네비게이션

2. Dashboard Filter Test (7개)
   - 필터 패널 표시
   - 날짜 범위 필터
   - 부서 필터
   - 복합 필터
   - 필터 초기화
   - 빈 결과 처리
   - 상태 유지

3. Advanced Upload Test (11개)
   - Department KPI 업로드
   - Publication 업로드
   - Research Project 업로드
   - 대용량 파일 처리
   - 데이터 타입 다양성
   - 에러 핸들링

예상 시간: 3-5분
```

**Artifact Upload**
```bash
- test-results/ → GitHub Artifacts (7일 보관)
- Screenshots (실패 시)
- 비디오 기록 (선택)
```

#### 보고서 확인
```
Actions 탭 → E2E Tests 워크플로우 → 실행 → Artifacts
  ├─ playwright-report
  ├─ screenshots (실패시)
  └─ logs (실패시)
```

---

### 3️⃣ Lint & Quality Workflow (lint.yml)

#### 트리거 조건
- ✅ `main`, `develop` 브랜치 push
- ✅ `main`, `develop` 브랜치로의 PR
- ✅ 수동 실행

#### 검사 항목

**Backend (Python)**
```
1. Black - 코드 포매팅 검사
   └─ 자동 수정: black .

2. Flake8 - PEP8 스타일 가이드
   └─ 자동 수정: 수동 적용 필요

3. Pylint - 코드 품질 (최소 점수: 8.0)
   └─ 자동 수정: pylint 제안 확인

4. Pyright - 타입 체킹
   └─ 자동 수정: 타입 어노테이션 추가

예상 시간: ~30초
```

**Frontend (TypeScript/JavaScript)**
```
1. ESLint - 코드 린팅
   └─ 자동 수정: npm run lint -- --fix

2. TypeScript - 타입 체킹
   └─ 자동 수정: 수동 적용 필요

3. Prettier - 코드 포매팅
   └─ 자동 수정: npx prettier --write .

예상 시간: ~30초
```

#### 로컬에서 실행

**Backend**
```bash
cd backend

# 자동 수정
black .
autopep8 --in-place --aggressive --aggressive -r .

# 검사
flake8 .
pylint api/ config/
pyright .
```

**Frontend**
```bash
cd frontend

# 자동 수정
npm run lint -- --fix
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"

# 검사
npm run lint
npx tsc --noEmit
npx prettier --check .
```

#### 성공 표시
```
✅ All lint checks passed
  ✓ Black OK
  ✓ Flake8 OK
  ✓ Pylint: 8.5/10
  ✓ Pyright OK
  ✓ ESLint OK
  ✓ TypeScript OK
  ✓ Prettier OK
```

---

### 4️⃣ PR Review Workflow (pr-check.yml)

#### 트리거 조건
- ✅ PR 생성
- ✅ PR 수정 (push)
- ✅ PR 재개

#### 검사 단계

```
PR 생성
   │
   ├─ 제목 형식 검증
   │  └─ feat: description ✓
   │
   ├─ Backend 체크
   │  ├─ Lint
   │  ├─ Test
   │  └─ Build
   │
   ├─ Frontend 체크
   │  ├─ Lint
   │  ├─ Type Check
   │  ├─ Test
   │  └─ Build
   │
   ├─ 파일 분석
   │  ├─ 카테고리 분류
   │  ├─ 변경 라인 수
   │  └─ 영향받은 기능
   │
   └─ 자동 코멘트 생성
      ├─ 분석 리포트
      ├─ 체크리스트
      ├─ 권장사항
      └─ 테스트 결과
```

#### PR 제목 형식 (Conventional Commits)

```
✅ 올바른 형식
- feat: Add new filtering feature
- fix: Fix date normalization bug
- docs: Update test setup guide
- test: Add E2E tests for upload
- refactor: Extract filter logic
- perf: Optimize data parsing
- chore: Update dependencies
- ci: Setup GitHub Actions

❌ 잘못된 형식
- add new feature (타입 없음)
- Feat: feature (소문자 타입)
- feature (임의 형식)
- WIP: work in progress (지원되지 않는 타입)
```

#### 자동 코멘트 예시

```markdown
## 📋 PR 분석

**제목**: feat: Add dashboard filter by date range
**변경사항**: 5 파일

### 📝 변경된 파일
- frontend/src/pages/Dashboard.tsx (+45, -23)
- frontend/src/utils/dashboardHelpers.ts (+69, -0)
- frontend/src/utils/dashboardHelpers.test.ts (+280, -0)
- docs/test-implementation-report.md (+50, -0)

### ✅ 체크리스트
- [x] Backend 테스트 통과
- [x] Frontend 테스트 통과
- [x] 린트 통과
- [x] 문서 업데이트됨
- [ ] E2E 테스트 실행 (선택)

### 💡 권장사항
1. ✅ 테스트가 잘 작성되었습니다
2. ⚠️ Frontend 문서 업데이트 권장
3. ✓ 변경 규모가 적절합니다
```

#### 병합 조건 (All Checks Must Pass)
```
✅ PR 제목 형식
✅ Backend 테스트/린트/빌드
✅ Frontend 테스트/린트/타입/빌드
✅ 최소 1명 승인 (선택)
```

---

## 📊 모니터링 및 디버깅

### 1. 워크플로우 상태 확인

```
GitHub 레포지토리 → Actions 탭
  │
  ├─ Workflows
  │  ├─ Test Suite ← 최근 실행 상태
  │  ├─ E2E Tests
  │  ├─ Lint & Quality
  │  └─ PR Review
  │
  └─ Run Details
     ├─ Jobs
     ├─ Annotations (에러)
     └─ Logs
```

### 2. 실패 디버깅

**Backend 테스트 실패**
```
1. Actions → Test Suite → 실패한 작업 클릭
2. "Run Backend Tests" 섹션 확인
3. 에러 메시지 확인
4. 로컬에서 재현:
   cd backend
   source venv/bin/activate
   pytest api/tests/test_excel_parser.py -v
```

**Frontend 테스트 실패**
```
1. Actions → Test Suite → 실패한 작업 클릭
2. "Run Frontend Tests" 섹션 확인
3. 에러 메시지 확인
4. 로컬에서 재현:
   cd frontend
   npm test
```

**E2E 테스트 실패**
```
1. Actions → E2E Tests → 실패한 작업 클릭
2. Artifacts 확인
   - playwright-report
   - screenshots
   - logs
3. 로컬에서 재현:
   cd backend && python manage.py runserver &
   cd e2e && npm test -- --headed
```

### 3. 커버리지 모니터링

```
Codecov 통합 (선택)
  1. codecov.io 가입
  2. GitHub Actions에서 자동 업로드
  3. PR에 커버리지 변화 표시
```

---

## 🔐 보안 모범 사례

### 1. Secrets 관리
```
❌ 코드에 직접 작성
❌ .env 파일 커밋

✅ GitHub Secrets 사용
✅ Actions에서 환경변수로 주입
✅ 로그에서 자동 마스킹
```

### 2. 권한 관리
```
Settings → Actions → General
  ├─ Actions permissions: 제한적으로 설정
  ├─ Default permissions: Read-only 권장
  └─ Workflow permissions: 필요한 것만 활성화
```

### 3. 코드 리뷰
```
Settings → Branches → Branch protection rules
  ├─ Require a pull request before merging ✅
  ├─ Require status checks to pass ✅
  ├─ Require branches to be up to date ✅
  └─ Dismiss stale pull request approvals ✅
```

---

## 📈 성능 최적화

### 1. 캐싱 활용
```
GitHub Actions 자동 캐싱:
  - pip 패키지 (backend)
  - npm 패키지 (frontend)
  - Playwright 브라우저

효과: 실행 시간 30-50% 감소
```

### 2. 병렬 실행
```
- Backend/Frontend 테스트 병렬 실행
- 여러 OS/브라우저에서 동시 테스트 (선택)

효과: 전체 시간 50% 단축
```

### 3. 선택적 실행
```
E2E 테스트는 매일 자정 + 수동 실행으로 설정
  → 모든 PR마다 실행하지 않아 시간 단축

또는 특정 파일 변경시만 실행:
  - backend/** 변경 → Backend 테스트만
  - frontend/** 변경 → Frontend 테스트만
```

---

## 📚 로컬 설정

### 1. Pre-commit Hook (선택)

`.git/hooks/pre-commit` 생성:
```bash
#!/bin/bash
# Backend lint
cd backend
black . --check || exit 1
flake8 . || exit 1

# Frontend lint
cd ../frontend
npm run lint || exit 1

cd ..
```

실행 권한 추가:
```bash
chmod +x .git/hooks/pre-commit
```

### 2. 로컬 테스트 스크립트

`scripts/test.sh` 생성:
```bash
#!/bin/bash
set -e

echo "Running Backend Tests..."
cd backend
source venv/bin/activate
pytest api/tests/test_excel_parser.py -v

echo "Running Frontend Tests..."
cd ../frontend
npm test

echo "Running E2E Tests..."
cd ../e2e
npm test

echo "✅ All tests passed!"
```

실행:
```bash
chmod +x scripts/test.sh
./scripts/test.sh
```

---

## 🚀 배포 자동화 (선택)

GitHub Actions로 배포 자동화:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Server
        run: |
          # 배포 스크립트 실행
          ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
            "cd /app && ./deploy.sh"
```

---

## 📝 체크리스트

### 초기 설정
- [ ] Repository 클론
- [ ] `.github/workflows/` 파일 확인
- [ ] GitHub Secrets 설정 (선택)
- [ ] Branch Protection Rules 설정 (선택)

### 첫 실행
- [ ] 코드 커밋 및 푸시
- [ ] Actions 탭에서 워크플로우 실행 확인
- [ ] 테스트 결과 확인
- [ ] PR 생성하여 자동 검증 확인

### 모니터링
- [ ] 매일 E2E 테스트 결과 확인
- [ ] 커버리지 변화 모니터링
- [ ] 실패한 워크플로우 분석 및 수정

---

## 🆘 문제 해결

### 워크플로우 실행 안 됨
```
확인 사항:
1. .github/workflows/ 폴더 위치 확인
2. 파일명 정확성 확인
3. YAML 문법 확인 (온라인 검증기 사용)
4. 브랜치 설정 확인
5. Actions 권한 확인
```

### 테스트 실패
```
1. 로컬에서 동일한 테스트 실행
2. GitHub Actions 로그 확인
3. 의존성 버전 확인
4. 환경변수 확인
5. 캐시 초기화: Actions → Clear all caches
```

### 성능 문제
```
1. 캐싱 활성화 확인
2. 불필요한 작업 제거
3. 병렬 실행 최적화
4. 워커 크기 확인 (ubuntu-latest vs ubuntu-24.04)
```

---

## 📞 지원

GitHub Actions 문서: https://docs.github.com/en/actions
Marketplace: https://github.com/marketplace?type=actions

---

**최종 업데이트**: 2025-12-18
**상태**: ✅ Complete
