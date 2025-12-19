"""
API Views for data visualization dashboard.

Views handle HTTP request/response only.
Business logic is delegated to services layer.
"""

import pandas as pd
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count, Sum
from rest_framework import status, viewsets
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PerformanceData, UploadLog
from .serializers import PerformanceDataSerializer, UploadLogSerializer
from .services import ExcelParser

# 개발 모드에서는 인증 없이 접근 허용
API_PERMISSION = [AllowAny] if settings.DEBUG else [IsAuthenticated]


class ExcelUploadView(APIView):
    """
    엑셀 파일 업로드 및 데이터 저장 API

    - POST /api/upload/
    - Atomic Transaction 적용: 기준 년월 데이터 전체 교체
    - 에러 발생 시 자동 Rollback
    """

    parser_classes = [MultiPartParser]
    permission_classes = API_PERMISSION

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.parser = ExcelParser()

    def post(self, request):
        """
        엑셀 파일 업로드 처리

        1. 파일 유효성 검사
        2. ExcelParser로 엑셀 파싱
        3. 기준 년월 추출
        4. Atomic Transaction 내에서:
           - 해당 년월 기존 데이터 삭제
           - 새 데이터 bulk_create
        5. 업로드 이력 기록
        """
        file = request.FILES.get("file")

        if not file:
            return Response(
                {"error": "파일이 제공되지 않았습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 파일 확장자 검사
        filename = file.name.lower()
        if not (filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".csv")):
            return Response(
                {"error": "엑셀 또는 CSV 파일(.xlsx, .xls, .csv)만 업로드 가능합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # 엑셀/CSV 파일 읽기 및 파싱 (서비스 레이어 사용)
            file_content = file.read()
            df = self.parser.read_excel(file_content, filename=file.name)

            # 데이터 유효성 검증
            self.parser.validate_dataframe(df)

            # 기준 년월 추출
            reference_dates = self.parser.extract_reference_dates(df)

            # 데이터 변환
            performance_objects, errors = self.parser.parse_dataframe(df)

            if not performance_objects:
                return Response(
                    {"error": "처리할 유효한 데이터가 없습니다.", "details": errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Atomic Transaction으로 데이터 저장
            with transaction.atomic():
                # 해당 기준 년월의 기존 데이터 삭제
                for ref_date in reference_dates:
                    ref_date_str = ExcelParser.normalize_date(ref_date)
                    PerformanceData.objects.filter(reference_date=ref_date_str).delete()

                # 새 데이터 일괄 삽입
                created_objects = PerformanceData.objects.bulk_create(performance_objects, batch_size=1000)

                # 업로드 이력 기록
                UploadLog.objects.create(
                    reference_date=str(reference_dates[0]),
                    filename=file.name,
                    row_count=len(created_objects),
                    status="success",
                    uploaded_by=request.user if request.user.is_authenticated else None,
                )

            return Response(
                {
                    "message": "데이터 업로드가 완료되었습니다.",
                    "reference_dates": [str(d) for d in reference_dates],
                    "created_count": len(created_objects),
                    "warnings": errors if errors else None,
                },
                status=status.HTTP_201_CREATED,
            )

        except pd.errors.EmptyDataError:
            return Response(
                {"error": "엑셀 파일이 비어있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            # 에러 발생 시 업로드 이력 기록
            UploadLog.objects.create(
                reference_date="",
                filename=file.name if file else "unknown",
                row_count=0,
                status="failed",
                error_message=str(e),
                uploaded_by=request.user if request.user.is_authenticated else None,
            )
            return Response(
                {"error": f"파일 처리 중 오류가 발생했습니다: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PerformanceDataViewSet(viewsets.ModelViewSet):
    """
    실적 데이터 CRUD API

    - GET /api/data/ : 전체 목록 조회
    - GET /api/data/?reference_date=2024-05 : 특정 월 데이터 조회
    - GET /api/data/{id}/ : 단일 조회
    """

    queryset = PerformanceData.objects.all()
    serializer_class = PerformanceDataSerializer
    permission_classes = API_PERMISSION

    def get_queryset(self):
        queryset = PerformanceData.objects.all()

        # 기준 년월 필터링
        reference_date = self.request.query_params.get("reference_date")
        if reference_date:
            queryset = queryset.filter(reference_date=reference_date)

        # 부서 필터링
        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department__icontains=department)

        return queryset


class UploadLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    업로드 이력 조회 API (읽기 전용)
    """

    queryset = UploadLog.objects.all()
    serializer_class = UploadLogSerializer
    permission_classes = API_PERMISSION


class DashboardSummaryView(APIView):
    """
    대시보드 요약 데이터 API

    - GET /api/summary/ : 전체 요약
    - GET /api/summary/?reference_date=2024-05 : 특정 월 요약
    """

    permission_classes = API_PERMISSION

    def get(self, request):
        reference_date = request.query_params.get("reference_date")

        queryset = PerformanceData.objects.all()
        if reference_date:
            queryset = queryset.filter(reference_date=reference_date)

        # 집계 데이터
        summary = queryset.aggregate(
            total_revenue=Sum("revenue"),
            total_budget=Sum("budget"),
            total_expenditure=Sum("expenditure"),
            total_papers=Sum("paper_count"),
            total_patents=Sum("patent_count"),
            total_projects=Sum("project_count"),
            department_count=Count("department", distinct=True),
            avg_revenue=Avg("revenue"),
        )

        # 월별 추이 데이터
        monthly_trend = (
            PerformanceData.objects.values("reference_date")
            .annotate(
                revenue=Sum("revenue"),
                budget=Sum("budget"),
                expenditure=Sum("expenditure"),
                papers=Sum("paper_count"),
            )
            .order_by("reference_date")
        )

        # 부서별 실적 (상위 10개)
        department_ranking = (
            queryset.values("department")
            .annotate(
                total_revenue=Sum("revenue"),
                total_budget=Sum("budget"),
                total_expenditure=Sum("expenditure"),
                total_papers=Sum("paper_count"),
                total_patents=Sum("patent_count"),
                total_projects=Sum("project_count"),
            )
            .order_by("-total_revenue")[:10]
        )

        return Response(
            {
                "summary": summary,
                "monthly_trend": list(monthly_trend),
                "department_ranking": list(department_ranking),
                "reference_dates": list(
                    PerformanceData.objects.values_list("reference_date", flat=True).distinct().order_by("-reference_date")
                ),
            }
        )
