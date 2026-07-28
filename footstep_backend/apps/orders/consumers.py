"""WebSocket consumer for the kitchen panel."""

import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


class KitchenConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for the kitchen panel.

    Authenticates via JWT token passed as query parameter.
    Joins the Channel Layer group `kitchen_{restaurant_slug}` on connect.
    Receives `order.new` and `order.update` events and forwards them to the client.
    """

    async def connect(self):
        self.restaurant_slug = self.scope["url_route"]["kwargs"]["restaurant_slug"]
        self.group_name = f"kitchen_{self.restaurant_slug}"

        # Validate JWT from query string
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        token = self._extract_token(query_string)

        if not token or not await self._validate_token(token):
            await self.close(code=4001)
            return

        # Join restaurant kitchen group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Kitchen panel is receive-only from the server perspective.
        # Client messages are ignored.
        pass

    # --- Channel Layer event handlers ---

    async def order_new(self, event):
        """Handle new order broadcast."""
        await self.send(
            text_data=json.dumps({"type": "new_order", "order": event["order"]})
        )

    async def order_update(self, event):
        """Handle order status update broadcast."""
        await self.send(
            text_data=json.dumps(
                {"type": "order_status_changed", "order": event["order"]}
            )
        )

    # --- Helpers ---

    def _extract_token(self, query_string: str) -> str | None:
        """Extract token from query string like ?token=xyz."""
        params = dict(
            param.split("=", 1) for param in query_string.split("&") if "=" in param
        )
        return params.get("token")

    async def _validate_token(self, token: str) -> bool:
        """Validate JWT access token."""
        try:
            AccessToken(token)
            return True
        except Exception:
            logger.warning("Kitchen WebSocket: invalid JWT token rejected.")
            return False
