from django.contrib import admin

from .models import PerformanceData, UploadLog


@admin.register(PerformanceData)
class PerformanceDataAdmin(admin.ModelAdmin):
    list_display = [
        'reference_date',
        'department',
        'revenue',
        'budget',
        'paper_count',
        'created_at',
    ]
    list_filter = ['reference_date', 'department']
    search_fields = ['department', 'department_code']
    ordering = ['-reference_date', 'department']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('기본 정보', {
            'fields': ('reference_date', 'department', 'department_code')
        }),
        ('재무 실적', {
            'fields': ('revenue', 'budget', 'expenditure')
        }),
        ('연구 실적', {
            'fields': ('paper_count', 'patent_count', 'project_count')
        }),
        ('추가 정보', {
            'fields': ('extra_metric_1', 'extra_metric_2', 'extra_text'),
            'classes': ('collapse',)
        }),
        ('메타 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UploadLog)
class UploadLogAdmin(admin.ModelAdmin):
    list_display = [
        'created_at',
        'filename',
        'reference_date',
        'row_count',
        'status',
        'uploaded_by',
    ]
    list_filter = ['status', 'reference_date']
    search_fields = ['filename']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
