from django.contrib import admin

from .models import Order, OrderItem, OrderItemTopping


class OrderItemToppingInline(admin.TabularInline):
    model = OrderItemTopping
    extra = 0
    readonly_fields = ("topping", "extra_price")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "unit_price", "notes")
    show_change_link = True


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "reference_number",
        "restaurant",
        "status",
        "delivery_type",
        "payment_method",
        "total",
        "created_at",
    )
    list_filter = ("status", "delivery_type", "restaurant")
    search_fields = ("reference_number", "restaurant__name")
    readonly_fields = ("reference_number", "created_at", "updated_at")
    inlines = [OrderItemInline]
    ordering = ("-created_at",)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product", "unit_price", "notes")
    search_fields = ("order__reference_number", "product__name")
    inlines = [OrderItemToppingInline]


@admin.register(OrderItemTopping)
class OrderItemToppingAdmin(admin.ModelAdmin):
    list_display = ("order_item", "topping", "extra_price")
    search_fields = ("order_item__order__reference_number", "topping__name")
