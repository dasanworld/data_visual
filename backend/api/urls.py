from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardSummaryView,
    ExcelUploadView,
    PerformanceDataViewSet,
    UploadLogViewSet,
)

router = DefaultRouter()
router.register(r"data", PerformanceDataViewSet, basename="performance-data")
router.register(r"logs", UploadLogViewSet, basename="upload-logs")

urlpatterns = [
    # 엑셀 업로드 엔드포인트
    path("upload/", ExcelUploadView.as_view(), name="excel-upload"),
    # 대시보드 요약 데이터
    path("summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    # ViewSet 라우터
    path("", include(router.urls)),
]
