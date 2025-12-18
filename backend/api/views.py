import io
from decimal import Decimal, InvalidOperation

import pandas as pd
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PerformanceData, UploadLog
from .serializers import PerformanceDataSerializer, UploadLogSerializer


class ExcelUploadView(APIView):
    """
    엑셀 파일 업로드 및 데이터 저장 API

    - POST /api/upload/
    - Atomic Transaction 적용: 기준 년월 데이터 전체 교체
    - 에러 발생 시 자동 Rollback
    """

    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    # 엑셀 컬럼명 → 모델 필드 매핑
    COLUMN_MAPPING = {
        '기준년월': 'reference_date',
        '기준 년월': 'reference_date',
        'reference_date': 'reference_date',
        '부서명': 'department',
        '부서': 'department',
        'department': 'department',
        '부서코드': 'department_code',
        'department_code': 'department_code',
        '매출액': 'revenue',
        '매출': 'revenue',
        'revenue': 'revenue',
        '예산': 'budget',
        'budget': 'budget',
        '지출액': 'expenditure',
        '지출': 'expenditure',
        'expenditure': 'expenditure',
        '논문수': 'paper_count',
        '논문': 'paper_count',
        'paper_count': 'paper_count',
        '특허수': 'patent_count',
        '특허': 'patent_count',
        'patent_count': 'patent_count',
        '프로젝트수': 'project_count',
        '프로젝트': 'project_count',
        'project_count': 'project_count',
        '추가지표1': 'extra_metric_1',
        '추가지표2': 'extra_metric_2',
        '비고': 'extra_text',
    }

    def post(self, request):
        """
        엑셀 파일 업로드 처리

        1. 파일 유효성 검사
        2. Pandas로 엑셀 파싱
        3. 기준 년월 추출
        4. Atomic Transaction 내에서:
           - 해당 년월 기존 데이터 삭제
           - 새 데이터 bulk_create
        5. 업로드 이력 기록
        """
        file = request.FILES.get('file')

        if not file:
            return Response(
                {'error': '파일이 제공되지 않았습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 파일 확장자 검사
        filename = file.name.lower()
        if not (filename.endswith('.xlsx') or filename.endswith('.xls')):
            return Response(
                {'error': '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 엑셀 파일 읽기
            file_content = file.read()
            df = pd.read_excel(io.BytesIO(file_content))

            if df.empty:
                return Response(
                    {'error': '엑셀 파일에 데이터가 없습니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 컬럼명 정규화 (공백 제거, 소문자 변환하지 않음)
            df.columns = df.columns.str.strip()

            # 컬럼 매핑 적용
            mapped_columns = {}
            for col in df.columns:
                if col in self.COLUMN_MAPPING:
                    mapped_columns[col] = self.COLUMN_MAPPING[col]

            df = df.rename(columns=mapped_columns)

            # 기준 년월 필드 확인
            if 'reference_date' not in df.columns:
                return Response(
                    {'error': "'기준년월' 또는 'reference_date' 컬럼이 필요합니다."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 기준 년월 추출 (첫 번째 유효한 값 사용)
            reference_dates = df['reference_date'].dropna().unique()
            if len(reference_dates) == 0:
                return Response(
                    {'error': '기준 년월 데이터가 없습니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 데이터 변환 및 저장
            performance_objects = []
            errors = []

            for idx, row in df.iterrows():
                try:
                    obj_data = self._parse_row(row)
                    if obj_data:
                        performance_objects.append(PerformanceData(**obj_data))
                except Exception as e:
                    errors.append(f"행 {idx + 2}: {str(e)}")

            if not performance_objects:
                return Response(
                    {'error': '처리할 유효한 데이터가 없습니다.', 'details': errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Atomic Transaction으로 데이터 저장
            with transaction.atomic():
                # 해당 기준 년월의 기존 데이터 삭제
                for ref_date in reference_dates:
                    ref_date_str = self._normalize_date(ref_date)
                    deleted_count, _ = PerformanceData.objects.filter(
                        reference_date=ref_date_str
                    ).delete()

                # 새 데이터 일괄 삽입
                created_objects = PerformanceData.objects.bulk_create(
                    performance_objects,
                    batch_size=1000
                )

                # 업로드 이력 기록
                UploadLog.objects.create(
                    reference_date=str(reference_dates[0]),
                    filename=file.name,
                    row_count=len(created_objects),
                    status='success',
                    uploaded_by=request.user if request.user.is_authenticated else None
                )

            return Response({
                'message': '데이터 업로드가 완료되었습니다.',
                'reference_dates': [str(d) for d in reference_dates],
                'created_count': len(created_objects),
                'warnings': errors if errors else None
            }, status=status.HTTP_201_CREATED)

        except pd.errors.EmptyDataError:
            return Response(
                {'error': '엑셀 파일이 비어있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # 에러 발생 시 업로드 이력 기록
            UploadLog.objects.create(
                reference_date='',
                filename=file.name if file else 'unknown',
                row_count=0,
                status='failed',
                error_message=str(e),
                uploaded_by=request.user if request.user.is_authenticated else None
            )
            return Response(
                {'error': f'파일 처리 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _parse_row(self, row):
        """
        DataFrame 행을 모델 필드 딕셔너리로 변환
        """
        if pd.isna(row.get('reference_date')):
            return None

        data = {
            'reference_date': self._normalize_date(row.get('reference_date')),
            'department': str(row.get('department', '')).strip() if pd.notna(row.get('department')) else '',
            'department_code': str(row.get('department_code', '')).strip() if pd.notna(row.get('department_code')) else '',
            'revenue': self._to_decimal(row.get('revenue', 0)),
            'budget': self._to_decimal(row.get('budget', 0)),
            'expenditure': self._to_decimal(row.get('expenditure', 0)),
            'paper_count': self._to_int(row.get('paper_count', 0)),
            'patent_count': self._to_int(row.get('patent_count', 0)),
            'project_count': self._to_int(row.get('project_count', 0)),
            'extra_text': str(row.get('extra_text', '')).strip() if pd.notna(row.get('extra_text')) else '',
        }

        # 선택적 필드
        if 'extra_metric_1' in row and pd.notna(row.get('extra_metric_1')):
            data['extra_metric_1'] = self._to_decimal(row.get('extra_metric_1'))
        if 'extra_metric_2' in row and pd.notna(row.get('extra_metric_2')):
            data['extra_metric_2'] = self._to_decimal(row.get('extra_metric_2'))

        return data

    def _normalize_date(self, value):
        """
        기준 년월을 YYYY-MM 형식으로 정규화
        """
        if pd.isna(value):
            return ''

        value_str = str(value).strip()

        # 이미 YYYY-MM 형식인 경우
        if len(value_str) == 7 and value_str[4] == '-':
            return value_str

        # YYYYMM 형식인 경우
        if len(value_str) == 6 and value_str.isdigit():
            return f"{value_str[:4]}-{value_str[4:]}"

        # YYYY/MM 형식인 경우
        if len(value_str) == 7 and value_str[4] == '/':
            return f"{value_str[:4]}-{value_str[5:]}"

        # datetime 객체인 경우
        try:
            if hasattr(value, 'strftime'):
                return value.strftime('%Y-%m')
        except Exception:
            pass

        return value_str[:7] if len(value_str) >= 7 else value_str

    def _to_decimal(self, value, default=0):
        """숫자를 Decimal로 변환"""
        if pd.isna(value):
            return Decimal(default)
        try:
            return Decimal(str(value).replace(',', ''))
        except (InvalidOperation, ValueError):
            return Decimal(default)

    def _to_int(self, value, default=0):
        """숫자를 정수로 변환"""
        if pd.isna(value):
            return default
        try:
            return int(float(str(value).replace(',', '')))
        except (ValueError, TypeError):
            return default


class PerformanceDataViewSet(viewsets.ModelViewSet):
    """
    실적 데이터 CRUD API

    - GET /api/data/ : 전체 목록 조회
    - GET /api/data/?reference_date=2024-05 : 특정 월 데이터 조회
    - GET /api/data/{id}/ : 단일 조회
    """

    queryset = PerformanceData.objects.all()
    serializer_class = PerformanceDataSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PerformanceData.objects.all()

        # 기준 년월 필터링
        reference_date = self.request.query_params.get('reference_date')
        if reference_date:
            queryset = queryset.filter(reference_date=reference_date)

        # 부서 필터링
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department__icontains=department)

        return queryset


class UploadLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    업로드 이력 조회 API (읽기 전용)
    """

    queryset = UploadLog.objects.all()
    serializer_class = UploadLogSerializer
    permission_classes = [IsAuthenticated]


class DashboardSummaryView(APIView):
    """
    대시보드 요약 데이터 API

    - GET /api/summary/ : 전체 요약
    - GET /api/summary/?reference_date=2024-05 : 특정 월 요약
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        reference_date = request.query_params.get('reference_date')

        queryset = PerformanceData.objects.all()
        if reference_date:
            queryset = queryset.filter(reference_date=reference_date)

        # 집계 데이터
        from django.db.models import Sum, Count, Avg

        summary = queryset.aggregate(
            total_revenue=Sum('revenue'),
            total_budget=Sum('budget'),
            total_expenditure=Sum('expenditure'),
            total_papers=Sum('paper_count'),
            total_patents=Sum('patent_count'),
            total_projects=Sum('project_count'),
            department_count=Count('department', distinct=True),
            avg_revenue=Avg('revenue'),
        )

        # 월별 추이 데이터
        monthly_trend = (
            PerformanceData.objects
            .values('reference_date')
            .annotate(
                revenue=Sum('revenue'),
                budget=Sum('budget'),
                expenditure=Sum('expenditure'),
                papers=Sum('paper_count'),
            )
            .order_by('reference_date')
        )

        # 부서별 실적 (상위 10개)
        department_ranking = (
            queryset
            .values('department')
            .annotate(
                total_revenue=Sum('revenue'),
                total_papers=Sum('paper_count'),
            )
            .order_by('-total_revenue')[:10]
        )

        return Response({
            'summary': summary,
            'monthly_trend': list(monthly_trend),
            'department_ranking': list(department_ranking),
            'reference_dates': list(
                PerformanceData.objects
                .values_list('reference_date', flat=True)
                .distinct()
                .order_by('-reference_date')
            ),
        })
