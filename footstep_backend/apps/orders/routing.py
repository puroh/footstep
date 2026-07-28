"""WebSocket URL routing for the orders app (kitchen panel)."""

from django.urls import path

from .consumers import KitchenConsumer

websocket_urlpatterns = [
    path("ws/kitchen/<str:restaurant_slug>/", KitchenConsumer.as_asgi()),
]
