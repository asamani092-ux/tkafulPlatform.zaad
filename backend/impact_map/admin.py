from django.contrib import admin

from .models import Region, Product, Outlet, Contribution, DistributionRecord


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "priority", "is_active", "order")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "season", "is_active", "order")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Outlet)
class OutletAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "region", "is_active")


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "region", "quantity", "mode", "status", "created_at")
    list_filter = ("status", "mode")


@admin.register(DistributionRecord)
class DistributionRecordAdmin(admin.ModelAdmin):
    list_display = ("region", "product", "families_served", "quantity_distributed", "date")
