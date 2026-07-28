from django.contrib import admin

from .models import Category, Product, Topping


class ToppingInline(admin.TabularInline):
    model = Topping
    extra = 1
    fields = ("name", "extra_price", "is_active")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "restaurant", "is_active")
    list_filter = ("is_active", "restaurant")
    search_fields = ("name", "restaurant__name")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "base_price", "is_active", "label")
    list_filter = ("is_active", "category__restaurant")
    search_fields = ("name", "category__name")
    inlines = [ToppingInline]


@admin.register(Topping)
class ToppingAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "extra_price", "is_active")
    list_filter = ("is_active", "product__category__restaurant")
    search_fields = ("name", "product__name")
