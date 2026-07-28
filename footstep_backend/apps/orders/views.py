"""Views for the orders app."""

from rest_framework import status
from rest_framework.decorators import (
    action,
    api_view,
    permission_classes,
    throttle_classes,
)
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.viewsets import GenericViewSet

from apps.notifications.services import send_order_telegram_notification
from apps.orders.broadcast import broadcast_new_order, broadcast_order_update
from apps.orders.models import Order
from apps.orders.serializers import (
    OrderDetailSerializer,
    OrderListSerializer,
    OrderStatusUpdateSerializer,
    PublicOrderCreateSerializer,
)
from apps.restaurants.mixins import RestaurantScopedMixin
from apps.restaurants.permissions import IsRestaurantOwner


class OrderViewSet(
    RestaurantScopedMixin, ListModelMixin, RetrieveModelMixin, GenericViewSet
):
    """ViewSet for order history and status management."""

    queryset = Order.objects.select_related("payment_method").order_by("-created_at")
    permission_classes = [IsAuthenticated, IsRestaurantOwner]

    def get_serializer_class(self):
        if self.action == "update_status":
            return OrderStatusUpdateSerializer
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

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """
        PATCH /api/v1/orders/{id}/status/

        Advances or cancels an order's status following the state machine:
        received -> confirmed -> in_preparation -> completed
        Any non-terminal state -> cancelled
        """
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(
            data=request.data, context={"order": order}
        )
        serializer.is_valid(raise_exception=True)

        order.status = serializer.validated_data["status"]
        order.updated_description = serializer.validated_data.get(
            "updated_description", ""
        )
        order.save(update_fields=["status", "updated_description", "updated_at"])

        # Broadcast status change to kitchen panel
        broadcast_order_update(order)

        return Response(
            {
                "id": str(order.id),
                "reference_number": order.reference_number,
                "status": order.status,
                "updated_description": order.updated_description,
            }
        )


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

    # Broadcast new order to kitchen panel
    broadcast_new_order(order)

    return Response(
        {"order_id": str(order.id), "reference_number": order.reference_number},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_public_order(request, reference_number):
    """
    Public endpoint to get order details by reference number.
    No authentication required.
    """
    try:
        order = (
            Order.objects.select_related("restaurant", "payment_method")
            .prefetch_related("items__product", "items__toppings__topping")
            .get(reference_number=reference_number)
        )
    except Order.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "Pedido no encontrado."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Build response data
    items_data = []
    for item in order.items.all():
        toppings_data = [
            {"name": t.topping.name, "extra_price": t.extra_price}
            for t in item.toppings.all()
        ]
        items_data.append(
            {
                "product_name": (
                    item.product.name if item.product else "Producto eliminado"
                ),
                "unit_price": item.unit_price,
                "notes": item.notes,
                "toppings": toppings_data,
            }
        )

    data = {
        "reference_number": order.reference_number,
        "status": order.status,
        "delivery_type": order.delivery_type,
        "address_line": order.address_line,
        "customer_phone": order.customer_phone,
        "payment_method_type": (
            order.payment_method.type if order.payment_method else None
        ),
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "total": order.total,
        "items": items_data,
        "restaurant_name": order.restaurant.name,
        "restaurant_slug": order.restaurant.slug,
        "restaurant_logo_url": order.restaurant.logo_url,
        "restaurant_address": order.restaurant.address_line,
        "created_at": order.created_at.isoformat(),
    }

    return Response(data)
