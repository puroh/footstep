from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Owner, PaymentMethod, Restaurant


@admin.register(Owner)
class OwnerAdmin(UserAdmin):
    list_display = ("email", "username", "is_active", "created_at")
    list_filter = ("is_active", "is_staff")
    search_fields = ("email", "username")
    ordering = ("-created_at",)


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "owner", "is_active", "delivery_fee", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug", "owner__email")
    readonly_fields = ("slug", "created_at")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("name", "slug", "owner", "is_active")}),
        (
            "White Label",
            {"fields": ("logo_url", "banner_url", "primary_color", "secondary_color")},
        ),
        (
            "Details",
            {
                "fields": (
                    "address_line",
                    "phone_number",
                    "delivery_fee",
                    "latitude",
                    "longitude",
                    "telegram_chat_id",
                    "created_at",
                )
            },
        ),
    )


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("restaurant", "type", "key_value", "is_active")
    list_filter = ("type", "is_active")
    search_fields = ("restaurant__name", "key_value")
