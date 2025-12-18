AI 코딩 에이전트에게 입력할 **최종 기술 구축 지침서(Final Technical Blueprint)**입니다.
프롬프트 엔지니어링의 **Role-Playing(페르소나)**, **Constraints(제약 조건)**, **Few-Shot Prompting(예시 제공)** 기법을 적용하여 명확한 실행 지침을 담았습니다.

---

# 📋 최종 기술 구축 지침서: 품질 보증 중심의 테스트 환경

## 1. 페르소나 및 목표 설정 (Role & Goal)
**당신은 'Strict Standard CTO'입니다.**
우리는 현재 1인 개발 체제의 `Django + React` 모놀리식 프로젝트를 진행 중입니다. 당신의 목표는 **"최소한의 유지보수 비용으로 최대의 안정성을 확보"**하는 테스트 환경을 구축하는 것입니다. 모든 코드는 **방어적(Defensive)**이어야 하며, 미래의 CI/CD 파이프라인(Github Actions) 통합을 고려해야 합니다.

## 2. 핵심 전략 지침 (Strategic Directives)

### 2-1. 테스트 피라미드 재설계 (The Testing Trophy)
*   **Backend (Heavy):** 비즈니스 로직, 특히 **엑셀 파싱 및 데이터 정합성** 검증에 집중한다. View와 로직을 분리하여 테스트한다.
*   **Frontend (Light):** UI 렌더링 테스트는 지양한다(ROI 낮음). `src/utils/*.ts` 같은 **순수 함수**만 Unit Test로 검증한다.
*   **E2E (Critical):** 사용자 핵심 시나리오(Happy Path)만 검증한다. (로그인 -> 업로드 -> 대시보드 확인)

### 2-2. 환경 일관성 (Environment Consistency)
*   **Timezone:** 모든 테스트는 `Asia/Seoul`을 기준으로 동작해야 한다.
*   **Isolation:** 테스트 실행 시 DB는 항상 격리되어야 하며, 데이터는 `Factory` 패턴으로 생성한다.

---

## 3. 기술 스택 및 세부 설정 (Tech Stack & Configuration)

### 3-1. Backend: `pytest` Ecosystem
*   **패키지:** `pytest`, `pytest-django`, `factory_boy`, `pytest-xdist`
*   **설정 원칙 (`pytest.ini`):**
    *   `--reuse-db`는 로컬 속도를 위해 사용하되, CI 환경을 대비해 설정을 분리 가능하게 한다.
    *   테스트 속도 향상을 위해 Password Hasher를 `MD5`로 강제 다운그레이드한다.

### 3-2. Frontend: `Vitest`
*   **설정 원칙 (`vite.config.ts`):**
    *   Vite 설정을 그대로 상속받는다.
    *   **Snapshot Test 금지:** UI 변경에 취약하므로 사용하지 않는다.

### 3-3. E2E: `Playwright`
*   **설정 원칙:**
    *   Django가 정적 파일(`collectstatic`)을 서빙하는 상태에서 테스트하여 실제 배포 환경과 일치시킨다.

---

## 4. 구현 단계별 지침 (Step-by-Step Instructions)

AI 에이전트는 아래 순서대로 코드를 작성 및 수정하십시오.

### STEP 1: Backend 테스트 환경 구성 (속도 및 Timezone 최적화)
`backend/config/settings.py`에 테스트 전용 설정을 주입하는 로직을 추가하십시오.

```python
# settings.py 예시
import sys

# 테스트 실행 시 보안성을 낮추고 속도를 높임 (MD5 사용)
if 'test' in sys.argv or 'pytest' in sys.modules:
    PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ]
    # CI/CD Timezone 불일치 방지
    TIME_ZONE = 'Asia/Seoul' 
    USE_TZ = True
```

### STEP 2: Business Logic 분리 및 테스트 (Refactoring)
현재 `views.py`에 있는 엑셀 파싱 로직(`_parse_row`, `_normalize_date`)을 별도 서비스 레이어(`services/excel_parser.py`)로 분리하고, 이에 대한 Unit Test를 작성하십시오.

*   **요구사항:** `views.py`는 오직 요청/응답만 처리해야 합니다.
*   **테스트 케이스:** 다양한 날짜 포맷('202405', '2024-05', 엑셀 날짜 서식)이 정확히 `YYYY-MM`으로 변환되는지 검증하십시오.

### STEP 3: Frontend 유틸리티 테스트
`frontend/src/utils/formatters.ts` 파일에 대한 Unit Test만 작성하십시오. 컴포넌트 테스트(`*.tsx`)는 작성하지 마십시오.

### STEP 4: E2E Smoke Test 작성
`Playwright`를 설치하고, 다음 단 하나의 시나리오만 `e2e/smoke.spec.ts`에 작성하십시오.
1.  Admin 로그인 수행 (Factory로 생성된 임시 유저 사용)
2.  엑셀 업로드 페이지 진입
3.  샘플 파일 업로드
4.  대시보드로 리다이렉트 확인 및 데이터 렌더링 확인

---

## 5. 보안 및 제약 사항 (Security & Constraints)
1.  **NO Hardcoded Credentials:** 테스트 코드 내에 비밀번호나 API Key를 하드코딩하지 마십시오. 환경변수나 Faker를 사용하십시오.
2.  **Explicit Timezone:** 날짜 관련 테스트 시 `datetime.now()` 대신 `timezone.now()`를 사용하고, 명시적으로 Timezone을 주입하여 검증하십시오.
3.  **Clean Up:** E2E 테스트에서 생성된 데이터는 테스트 종료 후 반드시 정리(Teardown)되어야 합니다 (`django_db` 픽스처 활용).

---

**위 지침을 바탕으로 테스트 환경 구축 코드를 생성해 주십시오.**