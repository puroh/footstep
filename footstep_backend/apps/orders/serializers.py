"""Serializers for the orders app."""

import secrets

from rest_framework import serializers

from apps.catalog.models import Product, Topping
from apps.orders.models import Order, OrderItem, OrderItemTopping
from apps.restaurants.models import PaymentMethod, Restaurant


class OrderItemToppingSerializer(serializers.ModelSerializer):
    """Topping within an order item."""

    name = serializers.CharField(source="topping.name", read_only=True)

    class Meta:
        model = OrderItemTopping
        fields = ["name", "extra_price"]


class OrderItemSerializer(serializers.ModelSerializer):
    """Line item within an order detail."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    toppings = OrderItemToppingSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["product_name", "unit_price", "notes", "toppings"]


class OrderListSerializer(serializers.ModelSerializer):
    """Serializer for the order list endpoint."""

    payment_method_type = serializers.CharField(
        source="payment_method.type", read_only=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "reference_number",
            "created_at",
            "status",
            "delivery_type",
            "total",
            "payment_method_type",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    """Serializer for the order detail endpoint."""

    payment_method_type = serializers.CharField(
        source="payment_method.type", read_only=True
    )
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "reference_number",
            "created_at",
            "status",
            "delivery_type",
            "total",
            "payment_method_type",
            "items",
        ]


class OrderStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating order status with state machine validation."""

    # Valid state transitions: current_status -> [allowed next statuses]
    VALID_TRANSITIONS = {
        Order.Status.RECEIVED: [Order.Status.CONFIRMED, Order.Status.CANCELLED],
        Order.Status.CONFIRMED: [Order.Status.IN_PREPARATION, Order.Status.CANCELLED],
        Order.Status.IN_PREPARATION: [Order.Status.COMPLETED, Order.Status.CANCELLED],
        Order.Status.COMPLETED: [],
        Order.Status.CANCELLED: [],
    }

    status = serializers.ChoiceField(choices=Order.Status.choices)
    updated_description = serializers.CharField(
        required=False, allow_blank=True, default=""
    )

    def validate_status(self, value):
        order = self.context["order"]
        allowed = self.VALID_TRANSITIONS.get(order.status, [])

        if value not in allowed:
            raise serializers.ValidationError(
                f"No se puede cambiar el estado de '{order.get_status_display()}' "
                f"a '{dict(Order.Status.choices).get(value, value)}'."
            )
        return value


# ---------------------------------------------------------------------------
# Public order creation serializers (client-ordering)
# ---------------------------------------------------------------------------


class OrderItemToppingCreateSerializer(serializers.Serializer):
    """Topping selection within an order item creation payload."""

    topping_id = serializers.UUIDField()


class OrderItemCreateSerializer(serializers.Serializer):
    """Single line item in the order creation payload."""

    product_id = serializers.UUIDField()
    toppings = OrderItemToppingCreateSerializer(many=True, required=False, default=[])
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PublicOrderCreateSerializer(serializers.Serializer):
    """
    Serializer for public (unauthenticated) order creation.

    Validates ownership of products/toppings to the restaurant, computes
    totals, and persists Order + OrderItem + OrderItemTopping records.
    """

    restaurant_slug = serializers.SlugField()
    items = OrderItemCreateSerializer(many=True, min_length=1)
    delivery_type = serializers.ChoiceField(choices=["delivery", "pickup", "dine_in"])
    payment_method_id = serializers.UUIDField()
    customer_name = serializers.CharField(max_length=200, required=False, default="")
    customer_phone = serializers.CharField(max_length=50)
    cash_denomination = serializers.IntegerField(required=False, allow_null=True)
    address_line = serializers.CharField(required=False, allow_blank=True, default="")
    telegram_chat_id = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )

    def validate(self, attrs):
        # --- Restaurant ---
        try:
            restaurant = Restaurant.objects.get(
                slug=attrs["restaurant_slug"], is_active=True
            )
        except Restaurant.DoesNotExist:
            raise serializers.ValidationError(
                {"restaurant_slug": "Restaurant not found or inactive."}
            )
        attrs["restaurant"] = restaurant

        # --- Operating hours check ---
        from django.utils import timezone

        from apps.restaurants.models import OperatingHour

        now = timezone.localtime(timezone.now())
        current_weekday = now.weekday()
        current_time = now.time()

        schedule = OperatingHour.objects.filter(
            restaurant=restaurant, weekday=current_weekday
        ).first()

        if schedule is None:
            raise serializers.ValidationError(
                {"restaurant_slug": ("El restaurante no está en horario de atención.")}
            )
        if not (schedule.open_time <= current_time <= schedule.close_time):
            raise serializers.ValidationError(
                {"restaurant_slug": ("El restaurante no está en horario de atención.")}
            )

        # --- Payment method ---
        try:
            payment_method = PaymentMethod.objects.get(
                id=attrs["payment_method_id"],
                restaurant=restaurant,
                is_active=True,
            )
        except PaymentMethod.DoesNotExist:
            raise serializers.ValidationError(
                {"payment_method_id": "Payment method not found or inactive."}
            )
        attrs["payment_method_obj"] = payment_method

        # --- Phone required ---
        if not attrs.get("customer_phone", "").strip():
            raise serializers.ValidationError(
                {"customer_phone": "Phone number is required."}
            )

        # --- Address required for delivery ---
        if attrs["delivery_type"] == "delivery" and not attrs.get("address_line"):
            raise serializers.ValidationError(
                {"address_line": "This field is required for delivery."}
            )

        # --- Cash denomination required for cash payment ---
        if payment_method.type == "cash" and not attrs.get("cash_denomination"):
            raise serializers.ValidationError(
                {"cash_denomination": "Required when paying with cash."}
            )

        # --- Product ownership and active check ---
        product_ids = [item["product_id"] for item in attrs["items"]]
        valid_products = Product.objects.filter(
            id__in=product_ids,
            category__restaurant=restaurant,
            is_active=True,
        )
        products_map = {p.id: p for p in valid_products}
        invalid_product_ids = set(product_ids) - set(products_map.keys())
        if invalid_product_ids:
            raise serializers.ValidationError(
                {
                    "items": (
                        f"Products {invalid_product_ids} not found or unavailable "
                        f"for this restaurant."
                    )
                }
            )
        attrs["products_map"] = products_map

        # --- Topping ownership and active check ---
        for item_data in attrs["items"]:
            product = products_map[item_data["product_id"]]
            topping_ids = [t["topping_id"] for t in item_data.get("toppings", [])]
            if topping_ids:
                valid_toppings = Topping.objects.filter(
                    id__in=topping_ids,
                    product=product,
                    is_active=True,
                )
                if valid_toppings.count() != len(topping_ids):
                    valid_ids = set(valid_toppings.values_list("id", flat=True))
                    invalid_topping_ids = set(topping_ids) - valid_ids
                    raise serializers.ValidationError(
                        {
                            "items": (
                                f"Toppings {invalid_topping_ids} not valid or "
                                f"inactive for product {product.id}."
                            )
                        }
                    )

        return attrs

    def create(self, validated_data):
        restaurant = validated_data["restaurant"]
        payment_method = validated_data["payment_method_obj"]
        products_map = validated_data["products_map"]
        items_data = validated_data["items"]

        # --- Calculate subtotal ---
        subtotal = 0
        for item_data in items_data:
            product = products_map[item_data["product_id"]]
            item_total = product.base_price
            topping_ids = [t["topping_id"] for t in item_data.get("toppings", [])]
            if topping_ids:
                toppings_qs = Topping.objects.filter(id__in=topping_ids)
                for topping in toppings_qs:
                    item_total += topping.extra_price
            subtotal += item_total

        # --- Delivery fee ---
        delivery_fee = (
            restaurant.delivery_fee
            if validated_data["delivery_type"] == "delivery"
            else 0
        )

        total = subtotal + delivery_fee

        # --- Persist Order ---
        order = Order.objects.create(
            restaurant=restaurant,
            reference_number=secrets.token_hex(5).upper(),
            delivery_type=validated_data["delivery_type"],
            address_line=validated_data.get("address_line", ""),
            customer_phone=validated_data.get("customer_phone", ""),
            payment_method=payment_method,
            cash_denomination=validated_data.get("cash_denomination"),
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total=total,
            status=Order.Status.RECEIVED,
        )

        # --- Persist OrderItems and OrderItemToppings ---
        for item_data in items_data:
            product = products_map[item_data["product_id"]]
            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                notes=item_data.get("notes", ""),
                unit_price=product.base_price,
            )
            topping_ids = [t["topping_id"] for t in item_data.get("toppings", [])]
            if topping_ids:
                toppings_qs = Topping.objects.filter(id__in=topping_ids)
                for topping in toppings_qs:
                    OrderItemTopping.objects.create(
                        order_item=order_item,
                        topping=topping,
                        extra_price=topping.extra_price,
                    )

        # Store telegram_chat_id for notification service
        order._telegram_chat_id = validated_data.get("telegram_chat_id", "")
        return order
