from django.db import models


class PerformanceData(models.Model):
    """
    이카운트 엑셀 데이터를 저장하는 모델
    - reference_date: 기준 년월 (YYYY-MM 형식, 데이터 교체의 기준)
    - 실적, 예산, 논문수 등 핵심 지표 포함
    """

    # 기준 년월 (필수) - 데이터 교체 시 이 필드 기준으로 DELETE
    reference_date = models.CharField(
        max_length=7, db_index=True, verbose_name="기준 년월", help_text="YYYY-MM 형식 (예: 2024-05)"  # YYYY-MM 형식
    )

    # 부서/조직 정보
    department = models.CharField(
        max_length=100,
        verbose_name="부서명",
        blank=True,
        default=""
    )
    department_code = models.CharField(
        max_length=20,
        verbose_name="부서코드",
        blank=True,
        default=""
    )

    # 실적 관련 필드
    revenue = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="매출액"
    )
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="예산"
    )
    expenditure = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="지출액"
    )

    # 연구 실적 관련 필드 (대학 특성)
    paper_count = models.IntegerField(
        default=0,
        verbose_name="논문수"
    )
    patent_count = models.IntegerField(
        default=0,
        verbose_name="특허수"
    )
    project_count = models.IntegerField(
        default=0,
        verbose_name="프로젝트수"
    )

    # 추가 지표 (확장용)
    extra_metric_1 = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="추가지표1"
    )
    extra_metric_2 = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="추가지표2"
    )
    extra_text = models.TextField(
        blank=True,
        default="",
        verbose_name="비고"
    )

    # 메타 필드
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="생성일시"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="수정일시"
    )

    class Meta:
        verbose_name = "실적 데이터"
        verbose_name_plural = "실적 데이터"
        ordering = ["-reference_date", "department"]
        indexes = [
            models.Index(fields=["reference_date"]),
            models.Index(fields=["department"]),
            models.Index(fields=["reference_date", "department"]),
        ]

    def __str__(self):
        return f"{self.reference_date} - {self.department}"


class UploadLog(models.Model):
    """
    엑셀 업로드 이력 관리 모델
    """

    reference_date = models.CharField(
        max_length=7,
        verbose_name="기준 년월"
    )
    filename = models.CharField(
        max_length=255,
        verbose_name="파일명"
    )
    row_count = models.IntegerField(
        default=0,
        verbose_name="처리 행 수"
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("success", "성공"),
            ("failed", "실패"),
        ],
        default="success",
        verbose_name="상태"
    )
    error_message = models.TextField(
        blank=True,
        default="",
        verbose_name="에러 메시지"
    )
    uploaded_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="업로드 사용자"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="업로드 일시"
    )

    class Meta:
        verbose_name = "업로드 이력"
        verbose_name_plural = "업로드 이력"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at.strftime('%Y-%m-%d %H:%M')} - {self.filename}"
