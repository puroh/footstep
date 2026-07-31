"""URL configuration for restaurant profile and payment methods."""

from django.urls import path

from .views import (
    OperatingHoursView,
    PaymentMethodDetailView,
    PaymentMethodListCreateView,
    RestaurantProfileView,
    RestaurantUploadBannerView,
    RestaurantUploadLogoView,
)

app_name = "restaurants"

urlpatterns = [
    path("me/", RestaurantProfileView.as_view(), name="profile"),
    path("me/upload-logo/", RestaurantUploadLogoView.as_view(), name="upload-logo"),
    path(
        "me/upload-banner/",
        RestaurantUploadBannerView.as_view(),
        name="upload-banner",
    ),
    path(
        "me/payment-methods/",
        PaymentMethodListCreateView.as_view(),
        name="payment-methods-list",
    ),
    path(
        "me/payment-methods/<uuid:pk>/",
        PaymentMethodDetailView.as_view(),
        name="payment-methods-detail",
    ),
    path(
        "me/operating-hours/",
        OperatingHoursView.as_view(),
        name="operating-hours",
    ),
]
