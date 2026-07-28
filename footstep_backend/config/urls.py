"""
URL configuration for FootStep backend.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

api_v1_patterns = [
    path("auth/", include("apps.restaurants.urls")),
    path("restaurants/", include("apps.restaurants.profile_urls")),
    path("catalog/", include("apps.catalog.urls")),
    path("orders/", include("apps.orders.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1_patterns)),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
