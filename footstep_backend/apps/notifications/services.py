import asyncio
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def format_order_message(order) -> str:
    """Build a Markdown-formatted Telegram message with order details."""
    delivery_labels = {
        "delivery": "Domicilio",
        "pickup": "Recoger",
        "dine_in": "Comer en el local",
    }

    lines = [
        f"\U0001f9fe *Pedido #{order.reference_number}*",
        f"Restaurante: {order.restaurant.name}",
        "",
        "*Productos:*",
    ]

    for item in order.items.all():
        item_line = f"  \u2022 {item.product.name} \u2014 ${item.unit_price:,}"
        lines.append(item_line)
        for topping in item.toppings.all():
            lines.append(f"    + {topping.topping.name} (${topping.extra_price:,})")
        if item.notes:
            lines.append(f"    _Nota: {item.notes}_")

    lines.append("")
    delivery_label = delivery_labels.get(order.delivery_type, order.delivery_type)
    lines.append(f"*Tipo de entrega:* {delivery_label}")
    if order.address_line:
        lines.append(f"*Direcci\u00f3n:* {order.address_line}")
    lines.append(f"*M\u00e9todo de pago:* {order.payment_method.get_type_display()}")
    lines.append(f"*Total:* ${order.total:,}")

    return "\n".join(lines)


def send_order_telegram_notification(order) -> None:
    """
    Send order confirmation to the client's Telegram chat.
    Fire-and-forget: logs errors but does not raise.
    """
    chat_id = getattr(order, "_telegram_chat_id", "")
    if not chat_id or not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram notification skipped: missing chat_id or bot token.")
        return

    try:
        from telegram import Bot

        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        message = format_order_message(order)

        # python-telegram-bot 22.x is fully async; run in a new event loop
        asyncio.run(
            bot.send_message(chat_id=chat_id, text=message, parse_mode="Markdown")
        )
    except Exception as e:
        logger.error("Telegram notification failed for order %s: %s", order.id, e)
