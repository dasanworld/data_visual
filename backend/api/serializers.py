from rest_framework import serializers

from .models import PerformanceData, UploadLog


class PerformanceDataSerializer(serializers.ModelSerializer):
    """
    실적 데이터 Serializer
    """

    class Meta:
        model = PerformanceData
        fields = [
            'id',
            'reference_date',
            'department',
            'department_code',
            'revenue',
            'budget',
            'expenditure',
            'paper_count',
            'patent_count',
            'project_count',
            'extra_metric_1',
            'extra_metric_2',
            'extra_text',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PerformanceDataListSerializer(serializers.ModelSerializer):
    """
    실적 데이터 목록용 간소화 Serializer
    """

    class Meta:
        model = PerformanceData
        fields = [
            'id',
            'reference_date',
            'department',
            'revenue',
            'budget',
            'paper_count',
        ]


class UploadLogSerializer(serializers.ModelSerializer):
    """
    업로드 이력 Serializer
    """

    uploaded_by_name = serializers.CharField(
        source='uploaded_by.username',
        read_only=True,
        default=''
    )

    class Meta:
        model = UploadLog
        fields = [
            'id',
            'reference_date',
            'filename',
            'row_count',
            'status',
            'error_message',
            'uploaded_by_name',
            'created_at',
        ]
