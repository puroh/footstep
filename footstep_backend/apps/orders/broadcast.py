"""Broadcast helpers for kitchen panel WebSocket events."""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def _serialize_order_for_kitchen(order) -> dict:
    """Serialize an order into the payload expected by the kitchen panel."""
    items_data = []
    for item in order.items.select_related("product").prefetch_related(
        "toppings__topping"
    ):
        toppings = [
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
                "toppings": toppings,
            }
        )

    return {
        "id": str(order.id),
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
        "created_at": order.created_at.isoformat(),
    }


def broadcast_new_order(order) -> None:
    """
    Broadcast a new order event to the kitchen panel group.

    Called after a public order is successfully created.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        logger.warning("Channel layer not available; skipping broadcast.")
        return

    group_name = f"kitchen_{order.restaurant.slug}"
    order_data = _serialize_order_for_kitchen(order)

    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": "order.new", "order": order_data},
        )
    except Exception as e:
        logger.error("Failed to broadcast new order %s: %s", order.id, e)


def broadcast_order_update(order) -> None:
    """
    Broadcast an order status update to the kitchen panel group.

    Called after an order's status is changed via PATCH.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        logger.warning("Channel layer not available; skipping broadcast.")
        return

    group_name = f"kitchen_{order.restaurant.slug}"
    order_data = _serialize_order_for_kitchen(order)

    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": "order.update", "order": order_data},
        )
    except Exception as e:
        logger.error("Failed to broadcast order update %s: %s", order.id, e)
