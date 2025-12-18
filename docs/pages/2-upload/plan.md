# 엑셀 업로드 페이지 구현 계획서

**문서 버전:** 1.0
**작성일:** 2025-12-18
**페이지 ID:** Page-002 (Upload)
**우선순위:** High
**예상 작업 시간:** 4-6시간

---

## 1. 문서 개요

### 1.1 목적
이카운트(Ecount)에서 추출한 엑셀 데이터를 업로드하여 PostgreSQL 데이터베이스에 저장하는 프론트엔드 페이지를 구현한다.

### 1.2 참조 문서
- `/docs/prd.md` - 3.3 데이터 업로드 페이지
- `/docs/userflow.md` - 3. 엑셀 파일 업로드 (Atomic Transaction)
- `/docs/usecase/003-excel-upload/spec.md` - 상세 유스케이스 명세
- `/docs/common-modules.md` - 공통 모듈 (API 클라이언트, 레이아웃)

### 1.3 구현 범위
- **URL:** `/upload`
- **기능:**
  - 파일 업로드 (Drag & Drop, 파일 선택)
  - 파일 형식/크기 검증
  - 업로드 진행 상태 표시 (로딩 스피너)
  - 성공/실패 메시지 표시
  - 성공 시 대시보드로 자동 이동

---

## 2. 현재 상태 분석

### 2.1 백엔드 구현 상태 (완료)

#### API 엔드포인트
- **URL:** `POST /api/upload/`
- **파일:** `/backend/api/views.py` - `ExcelUploadView`
- **구현 완료 기능:**
  - Atomic Transaction 기반 데이터 교체
  - Pandas 기반 엑셀 파싱
  - 컬럼명 자동 매핑 (한글/영문)
  - 날짜 형식 정규화 (YYYY-MM, YYYYMM, YYYY/MM)
  - bulk_create (batch_size=1000)
  - 에러 처리 및 롤백
  - 업로드 이력 기록 (UploadLog)

#### 응답 형식
**성공 시 (HTTP 201):**
```json
{
  "message": "데이터 업로드가 완료되었습니다.",
  "reference_dates": ["2024-05"],
  "created_count": 150,
  "warnings": []
}
```

**실패 시 (HTTP 400/500):**
```json
{
  "error": "구체적인 에러 메시지"
}
```

#### 검증 로직 (백엔드)
- 파일 확장자 검증 (.xlsx, .xls)
- 빈 파일 검증
- 필수 컬럼 존재 확인 (reference_date)
- 데이터 타입 변환 (Decimal, Integer)

### 2.2 프론트엔드 구현 상태 (미구현)

#### 현재 파일
- **파일:** `/frontend/src/pages/Upload.tsx`
- **현재 코드:** 기본 레이아웃만 존재 (15줄)
- **구현 필요:** 전체 업로드 UI 및 로직

#### 사용 가능한 공통 모듈
- `/frontend/src/services/api.ts` - Axios 인스턴스 (CSRF, 인증 처리)
- `/frontend/src/services/performanceApi.ts` - API 함수 (uploadExcel 메서드)
- `/frontend/src/layouts/DashboardLayout.tsx` - 레이아웃 (사이드바, 헤더)
- `/frontend/src/types/index.ts` - TypeScript 타입 정의

---

## 3. 기술 요구사항

### 3.1 UI 컴포넌트 (MUI)

| 컴포넌트 | 용도 | 참고 |
|---------|------|------|
| `Box` | 레이아웃 컨테이너 | 전체 페이지 구조 |
| `Paper` | 카드 영역 | 업로드 영역 배경 |
| `Typography` | 텍스트 표시 | 제목, 안내 메시지 |
| `Button` | 파일 선택, 업로드 버튼 | `variant="contained"` |
| `Alert` | 성공/에러 메시지 | `severity="success/error"` |
| `CircularProgress` | 로딩 스피너 | 업로드 중 표시 |
| `Backdrop` | 전체 화면 로딩 오버레이 | 업로드 진행 중 배경 |
| `CloudUpload` (Icon) | 업로드 아이콘 | 버튼 및 Drag & Drop 영역 |

### 3.2 상태 관리 (React useState)

```typescript
// 파일 상태
const [selectedFile, setSelectedFile] = useState<File | null>(null);

// 업로드 진행 상태
const [uploading, setUploading] = useState(false);

// 결과 메시지 상태
const [message, setMessage] = useState<{
  type: 'success' | 'error' | null;
  text: string;
}>({ type: null, text: '' });

// Drag & Drop 상태
const [isDragging, setIsDragging] = useState(false);
```

### 3.3 파일 검증 (클라이언트)

#### 검증 규칙
```typescript
const validateFile = (file: File): string | null => {
  // 1. 파일 확장자 검증
  const validExtensions = ['.xlsx', '.xls'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return '지원하지 않는 파일 형식입니다. .xlsx 또는 .xls 파일을 업로드하세요.';
  }

  // 2. 파일 크기 검증 (10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return '파일 크기가 10MB를 초과합니다.';
  }

  return null; // 검증 성공
};
```

### 3.4 API 호출

```typescript
// performanceApi.ts에 이미 구현됨
import { performanceApi } from '../services/performanceApi';

const handleUpload = async () => {
  if (!selectedFile) {
    setMessage({ type: 'error', text: '파일을 선택해주세요.' });
    return;
  }

  setUploading(true);
  setMessage({ type: null, text: '' });

  try {
    const response = await performanceApi.uploadExcel(selectedFile);

    setMessage({
      type: 'success',
      text: `업로드 완료! ${response.data.created_count}개의 데이터가 저장되었습니다.`
    });

    // 3초 후 대시보드로 이동
    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);

  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '업로드 중 오류가 발생했습니다.';
    setMessage({ type: 'error', text: errorMessage });
  } finally {
    setUploading(false);
  }
};
```

---

## 4. 구현 설계

### 4.1 컴포넌트 구조

```
Upload.tsx (페이지)
├── Box (컨테이너)
│   ├── Typography (제목: "데이터 업로드")
│   ├── Paper (업로드 영역)
│   │   ├── Box (Drag & Drop Zone)
│   │   │   ├── CloudUpload Icon
│   │   │   └── Typography (안내 문구)
│   │   ├── input[type="file"] (숨김)
│   │   ├── Button (파일 선택)
│   │   ├── Typography (선택된 파일명)
│   │   └── Button (업로드 시작)
│   ├── Alert (성공/에러 메시지)
│   └── Backdrop + CircularProgress (로딩 오버레이)
```

### 4.2 Drag & Drop 구현

```typescript
// Drag & Drop 이벤트 핸들러
const handleDragEnter = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
};

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelect(files[0]);
  }
};

// 파일 선택 처리
const handleFileSelect = (file: File) => {
  const error = validateFile(file);
  if (error) {
    setMessage({ type: 'error', text: error });
    setSelectedFile(null);
  } else {
    setSelectedFile(file);
    setMessage({ type: null, text: '' });
  }
};
```

### 4.3 UI 상태별 렌더링

#### 상태 1: 초기 상태 (파일 미선택)
- Drag & Drop 영역 표시
- "파일을 선택하거나 드래그하세요" 안내
- "파일 선택" 버튼 활성화
- "업로드" 버튼 비활성화

#### 상태 2: 파일 선택됨
- 선택된 파일명 표시
- "파일 선택" 버튼 활성화 (재선택 가능)
- "업로드" 버튼 활성화

#### 상태 3: 업로드 중
- Backdrop + 로딩 스피너 표시
- 모든 버튼 비활성화
- "업로드 중..." 메시지

#### 상태 4: 업로드 성공
- 초록색 Alert 표시
- "업로드 완료! N개의 데이터가 저장되었습니다."
- 3초 후 자동 리다이렉트 (useNavigate)

#### 상태 5: 업로드 실패
- 빨간색 Alert 표시
- 구체적인 에러 메시지
- "업로드" 버튼 재활성화 (재시도 가능)

---

## 5. 상세 구현 계획

### Phase 1: 기본 UI 구조 (30분)
- [ ] Typography 제목 추가
- [ ] Paper 컴포넌트로 업로드 영역 구성
- [ ] 파일 선택 버튼 추가
- [ ] 업로드 버튼 추가 (비활성화 상태)
- [ ] useState 훅 추가

### Phase 2: 파일 선택 로직 (30분)
- [ ] `<input type="file">` 숨김 처리 (ref 사용)
- [ ] 파일 선택 버튼 클릭 → input 트리거
- [ ] onChange 핸들러 구현
- [ ] validateFile() 함수 구현
- [ ] 선택된 파일명 표시

### Phase 3: Drag & Drop 구현 (45분)
- [ ] onDragEnter/Leave/Over/Drop 핸들러 구현
- [ ] isDragging 상태 기반 스타일 변경
- [ ] 드래그 영역 UI 구성 (CloudUpload 아이콘, 안내 문구)
- [ ] 파일 드롭 시 handleFileSelect 호출

### Phase 4: API 연동 및 업로드 (1시간)
- [ ] handleUpload() 함수 구현
- [ ] performanceApi.uploadExcel() 호출
- [ ] try-catch 에러 처리
- [ ] setUploading(true/false) 상태 관리
- [ ] 응답 처리 (성공/실패 메시지)

### Phase 5: 로딩 UI (30분)
- [ ] Backdrop 컴포넌트 추가
- [ ] CircularProgress 스피너 추가
- [ ] uploading 상태 기반 표시/숨김

### Phase 6: 메시지 표시 및 리다이렉트 (30분)
- [ ] Alert 컴포넌트 추가 (severity 동적 변경)
- [ ] message 상태 기반 렌더링
- [ ] 성공 시 setTimeout + useNavigate('/dashboard')
- [ ] 3초 카운트다운 표시 (선택)

### Phase 7: 스타일링 및 반응형 (45분)
- [ ] Drag & Drop 영역 스타일 (border, hover 효과)
- [ ] 버튼 간격 및 정렬
- [ ] 모바일 반응형 레이아웃 (sx prop)
- [ ] 파일명 표시 영역 스타일링

### Phase 8: 테스트 및 버그 픽스 (1시간)
- [ ] 정상 업로드 시나리오 테스트
- [ ] 잘못된 파일 형식 테스트
- [ ] 10MB 초과 파일 테스트
- [ ] 네트워크 에러 시뮬레이션
- [ ] 동시 업로드 방지 확인 (버튼 비활성화)

---

## 6. 코드 구현 예시

### 6.1 전체 컴포넌트 스켈레톤

```typescript
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Backdrop,
  CircularProgress,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { performanceApi } from '../services/performanceApi';

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 상태 관리
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });
  const [isDragging, setIsDragging] = useState(false);

  // 파일 검증
  const validateFile = (file: File): string | null => {
    // 구현...
  };

  // 파일 선택 처리
  const handleFileSelect = (file: File) => {
    // 구현...
  };

  // 파일 선택 버튼 클릭
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 파일 input onChange
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Drag & Drop 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    // 구현...
  };

  const handleDrop = (e: React.DragEvent) => {
    // 구현...
  };

  // 업로드 실행
  const handleUpload = async () => {
    // 구현...
  };

  return (
    <Box>
      {/* 제목 */}
      <Typography variant="h4" gutterBottom>
        데이터 업로드
      </Typography>

      {/* 업로드 영역 */}
      <Paper sx={{ p: 4, mt: 2 }}>
        {/* Drag & Drop Zone */}
        <Box
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          sx={{
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: isDragging ? 'action.hover' : 'transparent',
            cursor: 'pointer',
            mb: 3,
          }}
        >
          <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="body1" gutterBottom>
            파일을 여기에 드래그하거나 버튼을 클릭하세요
          </Typography>
          <Typography variant="caption" color="text.secondary">
            지원 형식: .xlsx, .xls (최대 10MB)
          </Typography>
        </Box>

        {/* 숨김 파일 input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xlsx,.xls"
          onChange={handleFileInputChange}
        />

        {/* 파일 선택 버튼 */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={handleFileButtonClick}
            disabled={uploading}
          >
            파일 선택
          </Button>

          {/* 선택된 파일명 */}
          {selectedFile && (
            <Typography variant="body2" color="text.secondary">
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </Typography>
          )}
        </Box>

        {/* 업로드 버튼 */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          sx={{ mt: 2 }}
        >
          {uploading ? '업로드 중...' : '업로드 시작'}
        </Button>
      </Paper>

      {/* 성공/에러 메시지 */}
      {message.type && (
        <Alert severity={message.type} sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* 로딩 오버레이 */}
      <Backdrop open={uploading} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
            업로드 중입니다...
          </Typography>
        </Box>
      </Backdrop>
    </Box>
  );
}
```

---

## 7. DRY 원칙 준수

### 7.1 재사용 공통 모듈

| 모듈 | 위치 | 사용 방법 |
|------|------|-----------|
| API 클라이언트 | `/services/api.ts` | `import api from '../services/api'` |
| Upload API | `/services/performanceApi.ts` | `performanceApi.uploadExcel(file)` |
| 레이아웃 | `/layouts/DashboardLayout.tsx` | 자동 적용 (React Router) |
| 타입 정의 | `/types/index.ts` | `UploadResponse` 타입 |

### 7.2 중복 방지 체크리스트
- [ ] Axios 인스턴스 직접 생성 금지 → `api.ts` 재사용
- [ ] CSRF 토큰 수동 추가 금지 → `api.ts` 인터셉터 자동 처리
- [ ] 401 에러 처리 중복 금지 → `api.ts` 인터셉터에서 자동 리다이렉트
- [ ] MUI 테마 직접 정의 금지 → `theme.ts` 재사용

---

## 8. 테스트 계획

### 8.1 단위 테스트 (수동)

#### 테스트 케이스 1: 파일 선택 검증
- **입력:** .csv 파일 선택
- **예상 결과:** 에러 메시지 "지원하지 않는 파일 형식입니다."

#### 테스트 케이스 2: 파일 크기 검증
- **입력:** 15MB 엑셀 파일
- **예상 결과:** 에러 메시지 "파일 크기가 10MB를 초과합니다."

#### 테스트 케이스 3: 정상 업로드
- **입력:** 올바른 형식의 5MB 엑셀 파일
- **예상 결과:**
  1. 로딩 스피너 표시
  2. 성공 메시지 표시
  3. 3초 후 `/dashboard` 이동

#### 테스트 케이스 4: 서버 에러
- **입력:** 잘못된 형식의 엑셀 (필수 컬럼 누락)
- **예상 결과:** 빨간색 Alert + 서버 에러 메시지

#### 테스트 케이스 5: Drag & Drop
- **입력:** 파일을 Drag & Drop 영역에 드롭
- **예상 결과:** 파일 선택됨 + 파일명 표시

### 8.2 통합 테스트 (E2E)

#### 시나리오 1: 전체 업로드 플로우
1. `/upload` 페이지 접근
2. 파일 선택 버튼 클릭
3. 올바른 엑셀 파일 선택
4. 업로드 시작 버튼 클릭
5. 로딩 스피너 확인
6. 성공 메시지 확인
7. 3초 후 대시보드로 이동
8. 대시보드에서 새 데이터 확인

#### 시나리오 2: 에러 복구
1. 잘못된 파일 업로드 → 에러 발생
2. 올바른 파일 재선택
3. 재업로드 → 성공

---

## 9. 에러 처리 전략

### 9.1 클라이언트 에러

| 에러 상황 | 처리 방법 | 사용자 메시지 |
|-----------|-----------|---------------|
| 파일 미선택 | Alert 표시 | "파일을 선택해주세요." |
| 파일 형식 오류 | Alert 표시 | "지원하지 않는 파일 형식입니다. .xlsx 또는 .xls 파일을 업로드하세요." |
| 파일 크기 초과 | Alert 표시 | "파일 크기가 10MB를 초과합니다." |

### 9.2 서버 에러

| HTTP 코드 | 처리 방법 | 사용자 메시지 |
|-----------|-----------|---------------|
| 400 | response.data.error 표시 | 서버 에러 메시지 그대로 표시 |
| 401 | 자동 리다이렉트 | api.ts 인터셉터에서 자동 처리 |
| 500 | Alert 표시 | "서버 오류가 발생했습니다. 관리자에게 문의하세요." |
| Timeout | Alert 표시 | "업로드 시간이 초과되었습니다. 다시 시도해주세요." |

### 9.3 네트워크 에러

```typescript
catch (error: any) {
  if (error.response) {
    // 서버 응답 있음
    const errorMessage = error.response.data?.error || '업로드에 실패했습니다.';
    setMessage({ type: 'error', text: errorMessage });
  } else if (error.request) {
    // 요청은 보냈으나 응답 없음
    setMessage({ type: 'error', text: '서버에 연결할 수 없습니다. 네트워크를 확인하세요.' });
  } else {
    // 기타 에러
    setMessage({ type: 'error', text: '알 수 없는 오류가 발생했습니다.' });
  }
}
```

---

## 10. 성능 최적화

### 10.1 파일 크기 제한
- 클라이언트: 10MB (검증 후 업로드 차단)
- 백엔드: Django 기본 설정 (`FILE_UPLOAD_MAX_MEMORY_SIZE`)

### 10.2 응답 시간 목표
- 1,000행: 2초 이내
- 10,000행: 5초 이내
- 50,000행: 15초 이내

### 10.3 사용자 경험
- 로딩 스피너로 진행 상태 표시
- 업로드 중 버튼 비활성화 (동시 업로드 방지)
- 성공 후 3초 자동 리다이렉트 (카운트다운 표시 선택)

---

## 11. 접근성 (Accessibility)

### 11.1 키보드 네비게이션
- [ ] Tab 키로 버튼 포커스 이동
- [ ] Enter/Space 키로 버튼 클릭
- [ ] Escape 키로 Backdrop 닫기 (선택)

### 11.2 스크린 리더
- [ ] 버튼에 `aria-label` 추가
- [ ] 파일 input에 `aria-describedby` 추가
- [ ] Alert에 `role="alert"` 자동 적용 (MUI 기본)

---

## 12. 보안 고려사항

### 12.1 클라이언트 검증
- 파일 확장자 화이트리스트 (.xlsx, .xls)
- 파일 크기 제한 (10MB)

### 12.2 서버 검증 (백엔드에서 처리)
- MIME 타입 재검증
- 파일 내용 파싱 (Pandas)
- CSRF 토큰 검증 (api.ts 인터셉터)
- 인증 확인 (IsAuthenticated)

---

## 13. 배포 체크리스트

### 13.1 개발 환경 테스트
- [ ] `npm run dev` 실행 확인
- [ ] Vite 프록시 동작 확인 (`/api` → `http://localhost:8000`)
- [ ] 파일 업로드 정상 동작
- [ ] 대시보드 리다이렉트 확인

### 13.2 프로덕션 빌드
- [ ] `npm run build` 성공
- [ ] `frontend/dist/` 생성 확인
- [ ] Django `collectstatic` 실행
- [ ] Whitenoise로 정적 파일 서빙 확인

### 13.3 Railway 배포
- [ ] Docker 빌드 성공
- [ ] 환경변수 설정 (`DATABASE_URL`, `SECRET_KEY`)
- [ ] 업로드 기능 동작 확인
- [ ] CORS 설정 확인

---

## 14. 후속 작업 (선택적 개선)

### 14.1 단기 (1-2주)
- [ ] 업로드 진행률 표시 (0% → 100%)
- [ ] 다중 파일 업로드 지원
- [ ] 엑셀 템플릿 다운로드 버튼

### 14.2 중기 (1-2개월)
- [ ] 업로드 이력 페이지 (`/upload-history`)
- [ ] 파일 미리보기 (파싱 전 데이터 확인)
- [ ] 데이터 검증 실패 시 수정 UI

### 14.3 장기 (3개월+)
- [ ] 대용량 파일 청크 업로드
- [ ] 백그라운드 작업 (Celery + Redis)
- [ ] 실시간 업로드 진행 상태 (WebSocket)

---

## 15. 참고 자료

### 15.1 MUI 공식 문서
- File Upload: https://mui.com/material-ui/react-text-field/#file-input
- Backdrop: https://mui.com/material-ui/react-backdrop/
- Alert: https://mui.com/material-ui/react-alert/

### 15.2 React Drag & Drop
- MDN Web API: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API

### 15.3 참조 구현 예시
- React Dropzone (라이브러리 대안): https://react-dropzone.js.org/
  - **주의:** 이 프로젝트에서는 외부 라이브러리 없이 직접 구현 (YAGNI 원칙)

---

## 16. 문서 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2025-12-18 | 초안 작성 | plan-writer agent |

---

## 17. 승인 및 리뷰

### 17.1 코드 리뷰 체크리스트
- [ ] DRY 원칙 준수 (공통 모듈 재사용)
- [ ] 타입 안정성 (TypeScript strict mode)
- [ ] 에러 처리 완전성
- [ ] 접근성 (a11y) 준수
- [ ] 반응형 레이아웃
- [ ] 보안 검증 (파일 형식/크기)

### 17.2 승인 필요
- [ ] Product Owner
- [ ] Frontend Developer
- [ ] Backend Developer (API 확인)

---

**End of Document**
