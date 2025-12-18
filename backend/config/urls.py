"""
URL Configuration

- /admin/       : Django Admin
- /api/         : REST API Endpoints
- /*            : React SPA (catch-all)
"""

import os

from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path, re_path
from django.views.static import serve


def serve_react(request):
    """
    React SPA의 index.html 서빙

    - API가 아닌 모든 요청을 React로 라우팅
    - React Router가 클라이언트 사이드에서 라우팅 처리
    """
    # staticfiles 디렉토리에서 index.html 찾기
    index_path = os.path.join(settings.STATICFILES_DIRS[0], 'index.html')

    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')

    # 개발 모드에서 React 빌드가 없는 경우
    return HttpResponse(
        """
        <!DOCTYPE html>
        <html>
        <head><title>Dashboard</title></head>
        <body>
            <h1>React 빌드가 필요합니다</h1>
            <p>frontend/ 디렉토리에서 <code>npm run build</code>를 실행하세요.</p>
            <p>개발 모드에서는 <code>npm run dev</code>로 별도 실행하세요.</p>
        </body>
        </html>
        """,
        content_type='text/html'
    )


urlpatterns = [
    # Django Admin (인증/사용자 관리)
    path('admin/', admin.site.urls),

    # REST API
    path('api/', include('api.urls')),

    # React SPA catch-all (API와 Admin 외 모든 요청)
    # 주의: 이 패턴은 반드시 마지막에 위치해야 함
    re_path(r'^(?!api/|admin/|static/).*$', serve_react, name='react-app'),
]

# 개발 모드에서 정적 파일 서빙 (DEBUG=True)
if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
