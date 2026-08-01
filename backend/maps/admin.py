from django.contrib import admin

from .models import Map, MapContribution, MapItem, MapItemField, MapLayer


class MapLayerInline(admin.TabularInline):
    model = MapLayer
    extra = 0


class MapItemFieldInline(admin.TabularInline):
    model = MapItemField
    extra = 0


@admin.register(Map)
class MapAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "visibility", "published_at")
    list_filter = ("visibility",)
    search_fields = ("title",)
    inlines = [MapLayerInline, MapItemFieldInline]


@admin.register(MapItem)
class MapItemAdmin(admin.ModelAdmin):
    list_display = ("name", "map", "layer", "status")
    list_filter = ("status",)
    search_fields = ("name",)


@admin.register(MapContribution)
class MapContributionAdmin(admin.ModelAdmin):
    list_display = ("name", "map", "quantity", "mode", "status", "created_at")
    list_filter = ("status", "mode")
