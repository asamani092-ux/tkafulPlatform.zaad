from rest_framework import serializers

from . import services
from .models import Map, MapContribution, MapItem, MapItemField, MapLayer


# ---- عام ----
class PublicContributionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapContribution
        fields = ["item", "category", "name", "phone", "mode", "quantity", "note"]

    def validate_phone(self, value):
        return services.validate_saudi_phone(value)

    def validate_quantity(self, value):
        if value < 1 or value > 1000:
            raise serializers.ValidationError("الكمية يجب أن تكون بين 1 و 1000")
        return value

    def validate(self, attrs):
        map_obj = self.context["map"]
        item = attrs.get("item")
        if item is not None:
            if item.map_id != map_obj.id:
                raise serializers.ValidationError({"item": "العنصر لا يتبع هذه الخريطة"})
            if item.layer.visibility != "public":
                raise serializers.ValidationError({"item": "العنصر غير متاح للمساهمة العامة"})
        return attrs


# ---- أدمن ----
class MapAdminSerializer(serializers.ModelSerializer):
    project_slug = serializers.CharField(source="project.slug", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Map
        fields = [
            "id", "project", "project_slug", "project_name", "title", "description",
            "visibility", "icon_set", "color_scheme", "published_at",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]


class MapLayerAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapLayer
        fields = ["id", "map", "name", "visibility", "order", "style"]


class MapItemFieldAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapItemField
        fields = ["id", "map", "key", "label", "type", "required", "options", "is_public", "order"]

    def validate(self, attrs):
        ftype = attrs.get("type", getattr(self.instance, "type", "text"))
        options = attrs.get("options", getattr(self.instance, "options", []))
        if ftype == "select" and not options:
            raise serializers.ValidationError({"options": "حقل select يتطلب قائمة خيارات"})
        return attrs


class MapItemAdminSerializer(serializers.ModelSerializer):
    layer_name = serializers.CharField(source="layer.name", read_only=True)

    class Meta:
        model = MapItem
        fields = [
            "id", "map", "layer", "layer_name", "lat", "lng", "name", "icon",
            "data", "status", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        map_obj = attrs.get("map", getattr(self.instance, "map", None))
        layer = attrs.get("layer", getattr(self.instance, "layer", None))
        if map_obj and layer and layer.map_id != map_obj.id:
            raise serializers.ValidationError({"layer": "الطبقة لا تتبع هذه الخريطة"})
        # كل كتابة على data تمر بالتحقق الديناميكي المركزي (D-08)
        if map_obj is not None:
            partial = bool(self.instance) and self.partial
            current = (self.instance.data or {}) if self.instance else None
            attrs["data"] = services.validate_item_data(
                map_obj,
                attrs.get("data", {} if not partial else {}),
                partial=partial,
                current=current,
            )
        return attrs


class MapContributionAdminSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True, allow_null=True)

    class Meta:
        model = MapContribution
        fields = [
            "id", "map", "item", "item_name", "category", "user", "name", "phone",
            "mode", "quantity", "note", "status", "created_at",
        ]
        read_only_fields = ["status", "created_at", "user"]
