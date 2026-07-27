"""Views for the orders app."""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.viewsets import GenericViewSet

from apps.notifications.services import send_order_telegram_notification
from apps.orders.models import Order
from apps.orders.serializers import (
    OrderDetailSerializer,
    OrderListSerializer,
    PublicOrderCreateSerializer,
)
from apps.restaurants.mixins import RestaurantScopedMixin
from apps.restaurants.permissions import IsRestaurantOwner


class OrderViewSet(
    RestaurantScopedMixin, ListModelMixin, RetrieveModelMixin, GenericViewSet
):
    """Read-only viewset for order history."""

    queryset = Order.objects.select_related("payment_method").order_by("-created_at")
    permission_classes = [IsAuthenticated, IsRestaurantOwner]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return OrderDetailSerializer
        return OrderListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "retrieve":
            queryset = queryset.prefetch_related(
                "items__product", "items__toppings__topping"
            )

        # Apply filters for list action
        order_status = self.request.query_params.get("status")
        if order_status:
            queryset = queryset.filter(status=order_status)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset


# ---------------------------------------------------------------------------
# Public order creation (unauthenticated)
# ---------------------------------------------------------------------------


class OrderCreateThrottle(AnonRateThrottle):
    rate = "10/minute"


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OrderCreateThrottle])
def create_public_order(request):
    """
    Public endpoint for clients to submit orders without authentication.
    Identifies the restaurant by slug in the request body.
    """
    serializer = PublicOrderCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    order = serializer.save()

    # Fire-and-forget Telegram notification
    send_order_telegram_notification(order)

    return Response(
        {"order_id": str(order.id), "reference_number": order.reference_number},
        status=status.HTTP_201_CREATED,
    )
