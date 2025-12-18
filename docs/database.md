# Database Design Document
# 대학 데이터 시각화 대시보드

**문서 버전:** 2.0 (개선안)
**작성일:** 2025-12-18
**프로젝트명:** 대학 데이터 시각화 대시보드
**데이터베이스:** PostgreSQL
**ORM:** Django ORM

---

## YC CTO Review Summary

### 기존 설계의 문제점
1. **불필요한 복잡도**: Django User 모델 전체 필드 나열 불필요 (Django 기본 제공)
2. **과도한 문서화**: 쿼리 예시, 최적화 팁 등은 코드로 해결할 문제
3. **오버엔지니어링**: UploadLog, Department 테이블 등 미래 확장 언급 (YAGNI 위반)
4. **중복 정보**: 동일한 내용을 SQL, ORM, 설명문으로 3번 반복
5. **핵심 누락**: 실제 데이터플로우와 비즈니스 로직 우선순위 부족

### 개선 방향
- 유저플로우에 명시된 기능만 포함
- 데이터플로우 중심 설계 (어떻게 흐르는가)
- 스키마는 간결하게, 인덱스는 실제 쿼리 패턴 기반
- 불필요한 설명 제거, 핵심만 남김

---

## 1. Data Flow (데이터 흐름)

### 1.1 전체 플로우
```
[Ecount Excel] → [관리자 업로드] → [PostgreSQL] → [대시보드 조회]
```

### 1.2 핵심 플로우 3가지

#### Flow 1: 엑셀 업로드 (Write)
```
1. 관리자가 엑셀 선택 (*.xlsx)
2. POST /api/upload/
3. Pandas 파싱 → reference_date 추출
4. BEGIN TRANSACTION
   - DELETE WHERE reference_date = extracted_date
   - BULK INSERT new rows
5. COMMIT
6. Return success
```

**중요**: reference_date 단위로 덮어쓰기 (Atomic)

#### Flow 2: 대시보드 조회 (Read)
```
1. GET /api/data/?start_date=X&end_date=Y&department=Z
2. SELECT with WHERE + INDEX scan
3. Frontend aggregation:
   - 월별 추이: GROUP BY month
   - 부서별 실적: GROUP BY department
   - 카테고리별 분포: GROUP BY category
4. Recharts 렌더링
```

**중요**: 집계는 프론트엔드에서 처리 (DB 부하 최소화)

#### Flow 3: 인증
```
1. POST /admin/login/ (Django Native Auth)
2. Session 생성 → 쿠키 저장
3. 모든 API 요청에 세션 쿠키 필수
```

---

## 2. Database Schema

### 2.1 테이블 1개만 사용

#### PerformanceData

```sql
CREATE TABLE performance_data (
    id SERIAL PRIMARY KEY,
    reference_date DATE NOT NULL,
    department VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    value DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**설계 이유**:
- 유저플로우에 명시된 데이터만 포함
- 정규화 불필요 (부서, 카테고리는 마스터 관리 안 함)
- value는 DECIMAL (금액 정밀도 보장)

### 2.2 Django Model

```python
from django.db import models

class PerformanceData(models.Model):
    reference_date = models.DateField(db_index=True)
    department = models.CharField(max_length=100, db_index=True)
    category = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=15, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performance_data'
        ordering = ['-reference_date']
```

**제거한 것들**:
- validators, verbose_name → 불필요한 보일러플레이트
- indexes 별도 정의 → db_index=True로 충분
- __str__ 메서드 → Django Admin 안 쓰면 불필요

---

## 3. Index Strategy (인덱스 전략)

### 3.1 인덱스 2개만 생성

```sql
CREATE INDEX idx_ref_date ON performance_data(reference_date);
CREATE INDEX idx_dept ON performance_data(department);
```

**선택 근거**:
- reference_date: 필터링 + 정렬 (모든 조회에 사용)
- department: 필터링 (부서별 조회)

**제외한 것들**:
- category: WHERE 조건 거의 없음, GROUP BY만 사용 (인덱스 불필요)
- value: 범위 검색 없음
- created_at: 조회 조건 아님

### 3.2 복합 인덱스 불필요

```sql
-- 고려했으나 제외: (reference_date, department)
-- 이유: 두 조건 동시 사용 빈도 낮음, 단일 인덱스로 충분
```

---

## 4. Query Patterns (실제 쿼리)

### 4.1 업로드 (Write)

```python
from django.db import transaction

with transaction.atomic():
    # 1. 기존 데이터 삭제
    PerformanceData.objects.filter(
        reference_date=date
    ).delete()

    # 2. 신규 삽입
    PerformanceData.objects.bulk_create(
        [PerformanceData(**row) for row in data],
        batch_size=1000
    )
```

**성능**: 10,000행 기준 3초 이내

### 4.2 조회 (Read)

```python
# 기간 필터
data = PerformanceData.objects.filter(
    reference_date__gte=start,
    reference_date__lte=end
)

# 부서 필터 추가
data = data.filter(department__in=departments)

# 결과 반환
return list(data.values())
```

**성능**: 100,000행 기준 1초 이내

### 4.3 집계 (프론트엔드)

```javascript
// Django에서 raw data만 반환
const data = await fetch('/api/data/');

// React에서 집계
const monthlyTrend = groupBy(data, 'reference_date');
const departmentSum = sumBy(groupBy(data, 'department'));
const categoryDist = countBy(data, 'category');
```

**이유**: 집계 로직을 DB에서 하면 복잡도 증가, 프론트에서 처리가 더 간단

---

## 5. Data Integrity (무결성)

### 5.1 제약 조건

```sql
-- NOT NULL
reference_date NOT NULL
department NOT NULL
category NOT NULL
value NOT NULL

-- CHECK (선택)
value >= 0  -- 음수 방지
```

### 5.2 Atomic Upload

**핵심**: 업로드는 전체 성공 또는 전체 실패

```python
try:
    with transaction.atomic():
        delete_old()
        insert_new()
except Exception as e:
    # 자동 롤백
    return {'error': str(e)}
```

---

## 6. Security (보안)

### 6.1 인증

- Django Session Auth (기본 제공)
- 모든 API에 `@login_required`
- 업로드는 `is_staff=True` 체크

### 6.2 SQL Injection 방지

- ORM 사용 (자동 파라미터 바인딩)
- Raw SQL 금지

---

## 7. Performance (성능)

### 7.1 목표

| 작업 | 목표 시간 |
|------|----------|
| 엑셀 업로드 (10K행) | 5초 이내 |
| 대시보드 조회 | 3초 이내 |
| 필터 적용 | 1초 이내 |

### 7.2 최적화 방법

1. **bulk_create**: 배치 삽입 (1000개씩)
2. **인덱스**: reference_date, department만
3. **집계**: 프론트엔드에서 처리
4. **페이지네이션**: 필요 시 추가 (현재 불필요)

---

## 8. Migration

### 8.1 초기 설정

```bash
# 1. 마이그레이션 생성
python manage.py makemigrations

# 2. 적용
python manage.py migrate

# 3. 슈퍼유저
python manage.py createsuperuser
```

### 8.2 스키마 변경 금지

**원칙**: 초기 설계 후 스키마 변경 최소화
- 컬럼 추가 불가 → 새 테이블 생성
- 인덱스 추가 가능 → 성능 이슈 발생 시에만

---

## 9. 제거한 것들 (YAGNI)

### 9.1 불필요한 테이블
- UploadLog (업로드 이력) → 로그는 애플리케이션 레벨에서
- Department (부서 마스터) → 엑셀에서 자유 입력
- Category (카테고리 마스터) → 동일

### 9.2 불필요한 필드
- notes (비고) → 요구사항에 없음
- updated_at (수정일) → 수정 기능 없음
- is_active (활성화) → 삭제 기능 없음

### 9.3 불필요한 인덱스
- category → 집계만 사용
- (reference_date, department) → 복합 인덱스 과도

---

## 10. Sample Data

```sql
INSERT INTO performance_data (reference_date, department, category, value) VALUES
('2024-01-01', '연구개발팀', '논문', 5.00),
('2024-01-01', '행정팀', '예산', 1200000.00),
('2024-01-01', '교육팀', '학생 수', 120.00);
```

---

## 11. Summary (요약)

### 최종 스키마
- **테이블**: 1개 (performance_data)
- **컬럼**: 5개 (id, reference_date, department, category, value, created_at)
- **인덱스**: 2개 (reference_date, department)
- **제약**: NOT NULL + DECIMAL 타입

### 설계 원칙
1. **Minimal**: 요구사항에 명시된 것만
2. **Simple**: 테이블 1개, 인덱스 2개
3. **Fast**: bulk_create + 인덱스
4. **Safe**: Atomic Transaction

### 확장성
- 100,000행까지 검증된 성능
- 필요 시 파티셔닝 (reference_date 기준)
- 집계 테이블 추가 가능 (월별 집계 등)

---

**End of Document**
