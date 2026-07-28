"""URL configuration for the orders app."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.orders.views import OrderViewSet, create_public_order, get_public_order

router = DefaultRouter()
router.register("", OrderViewSet, basename="orders")

urlpatterns = [
    path("create/", create_public_order, name="create-public-order"),
    path("track/<str:reference_number>/", get_public_order, name="track-order"),
    *router.urls,
]
