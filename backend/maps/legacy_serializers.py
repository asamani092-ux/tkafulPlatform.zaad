import re

from rest_framework import serializers

from maps.legacy_services import (
    find_product_by_slug,
    find_region_item_by_slug,
    get_legacy_map,
    region_item_to_legacy,
    region_items_qs,
    outlet_item_to_legacy,
)
from maps.models import MapContribution, MapDistributionRecord, MapItem, MapProduct
from maps.services import mask_small_count, validate_saudi_phone


def mask_families_count(value: int):
    """Privacy: counts under 5 are never exposed as integers."""
    return mask_small_count(value)


class PublicProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapProduct
        fields = ["id", "name", "slug", "icon", "season", "target_families", "order"]


class PublicOutletSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    type = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    region_slug = serializers.CharField(allow_null=True)
    address = serializers.CharField()
    working_hours = serializers.CharField()


class PublicRegionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    center_lat = serializers.FloatField()
    center_lng = serializers.FloatField()
    boundary = serializers.CharField(allow_null=True)
    priority = serializers.CharField()
    order = serializers.IntegerField()
    families_served = serializers.JSONField()
    quantity_distributed = serializers.IntegerField()
    completion_percent = serializers.FloatField()
    outlets_count = serializers.IntegerField()


class PublicSummarySerializer(serializers.Serializer):
    families_served = serializers.IntegerField()
    products_distributed = serializers.IntegerField()
    completion_percent = serializers.FloatField()
    regions_active = serializers.IntegerField()
    outlets_active = serializers.IntegerField()
    contributions_pending = serializers.IntegerField()


class ContributionCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    region = serializers.SlugField()
    product = serializers.SlugField()
    quantity = serializers.IntegerField()
    mode = serializers.ChoiceField(choices=MapContribution.MODE_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_phone(self, value):
        return validate_saudi_phone(value)

    def validate_quantity(self, value):
        if value < 1 or value > 1000:
            raise serializers.ValidationError("الكمية يجب أن تكون بين 1 و 1000")
        return value

    def create(self, validated_data):
        map_obj = get_legacy_map()
        if map_obj is None:
            raise serializers.ValidationError("خريطة تفقدهم غير متوفرة")
        region_item = find_region_item_by_slug(map_obj, validated_data["region"])
        if region_item is None or region_item.status != "active":
            raise serializers.ValidationError({"region": "المنطقة غير صالحة"})
        product = find_product_by_slug(map_obj, validated_data["product"])
        if product is None:
            raise serializers.ValidationError({"product": "المنتج غير صالح"})
        request = self.context.get("request")
        extra = {}
        if request and request.user.is_authenticated:
            extra["user"] = request.user
        return MapContribution.objects.create(
            map=map_obj,
            item=region_item,
            category=product.slug,
            name=validated_data["name"],
            phone=validated_data["phone"],
            mode=validated_data["mode"],
            quantity=validated_data["quantity"],
            note=validated_data.get("note", ""),
            **extra,
        )


class RegionAdminSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=120)
    slug = serializers.SlugField()
    center_lat = serializers.FloatField()
    center_lng = serializers.FloatField()
    boundary = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    priority = serializers.ChoiceField(choices=["high", "medium", "low"], default="medium")
    is_active = serializers.BooleanField(default=True)
    order = serializers.IntegerField(default=0)

    def create(self, validated_data):
        from maps.constants import REGIONS_LAYER_NAME
        from maps.legacy_services import get_regions_layer

        map_obj = get_legacy_map()
        layer = get_regions_layer(map_obj)
        data = {
            "kind": "region",
            "slug": validated_data["slug"],
            "priority": validated_data.get("priority", "medium"),
            "order": validated_data.get("order", 0),
        }
        if validated_data.get("boundary"):
            data["boundary"] = validated_data["boundary"]
        item = MapItem.objects.create(
            map=map_obj,
            layer=layer,
            name=validated_data["name"],
            lat=validated_data["center_lat"],
            lng=validated_data["center_lng"],
            icon="map-pin",
            status="active" if validated_data.get("is_active", True) else "hidden",
            data=data,
        )
        return region_item_to_legacy(item)

    def update(self, instance, validated_data):
        item = MapItem.objects.get(pk=instance["id"])
        data = dict(item.data or {})
        if "slug" in validated_data:
            data["slug"] = validated_data["slug"]
        if "priority" in validated_data:
            data["priority"] = validated_data["priority"]
        if "order" in validated_data:
            data["order"] = validated_data["order"]
        if "boundary" in validated_data:
            if validated_data["boundary"]:
                data["boundary"] = validated_data["boundary"]
            else:
                data.pop("boundary", None)
        if "name" in validated_data:
            item.name = validated_data["name"]
        if "center_lat" in validated_data:
            item.lat = validated_data["center_lat"]
        if "center_lng" in validated_data:
            item.lng = validated_data["center_lng"]
        if "is_active" in validated_data:
            item.status = "active" if validated_data["is_active"] else "hidden"
        item.data = data
        item.save()
        return region_item_to_legacy(item)


class ProductAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapProduct
        fields = "__all__"
        read_only_fields = ["map", "external_id"]

    def create(self, validated_data):
        map_obj = get_legacy_map()
        return MapProduct.objects.create(map=map_obj, **validated_data)


class OutletAdminSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=120)
    type = serializers.ChoiceField(
        choices=["sale_point", "permanent_corner", "participation_point"]
    )
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    region = serializers.IntegerField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, default="")
    working_hours = serializers.CharField(required=False, allow_blank=True, default="")
    is_active = serializers.BooleanField(default=True)

    def _region_slug(self, map_obj, region_id):
        if not region_id:
            return None
        item = MapItem.objects.filter(pk=region_id, map=map_obj, data__kind="region").first()
        return (item.data or {}).get("slug") if item else None

    def create(self, validated_data):
        from maps.legacy_services import get_outlets_layer

        map_obj = get_legacy_map()
        layer = get_outlets_layer(map_obj)
        region_id = validated_data.pop("region", None)
        region_slug = self._region_slug(map_obj, region_id)
        data = {
            "kind": "outlet",
            "outlet_type": validated_data["type"],
            "address": validated_data.get("address", ""),
            "working_hours": validated_data.get("working_hours", ""),
        }
        if region_slug:
            data["region_slug"] = region_slug
        item = MapItem.objects.create(
            map=map_obj,
            layer=layer,
            name=validated_data["name"],
            lat=validated_data["lat"],
            lng=validated_data["lng"],
            icon="store",
            status="active" if validated_data.get("is_active", True) else "hidden",
            data=data,
        )
        return outlet_item_to_legacy(item)

    def update(self, instance, validated_data):
        item = MapItem.objects.get(pk=instance["id"])
        data = dict(item.data or {})
        if "type" in validated_data:
            data["outlet_type"] = validated_data["type"]
        if "address" in validated_data:
            data["address"] = validated_data["address"]
        if "working_hours" in validated_data:
            data["working_hours"] = validated_data["working_hours"]
        if "region" in validated_data:
            slug = self._region_slug(item.map, validated_data["region"])
            if slug:
                data["region_slug"] = slug
            else:
                data.pop("region_slug", None)
        if "name" in validated_data:
            item.name = validated_data["name"]
        if "lat" in validated_data:
            item.lat = validated_data["lat"]
        if "lng" in validated_data:
            item.lng = validated_data["lng"]
        if "is_active" in validated_data:
            item.status = "active" if validated_data["is_active"] else "hidden"
        item.data = data
        item.save()
        return outlet_item_to_legacy(item)


class ContributionAdminSerializer(serializers.ModelSerializer):
    region_name = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    region = serializers.IntegerField(source="item_id")
    product = serializers.SerializerMethodField()

    class Meta:
        model = MapContribution
        fields = [
            "id", "user", "name", "phone", "region", "region_name", "product", "product_name",
            "quantity", "mode", "status", "note", "created_at",
        ]
        read_only_fields = ["status", "created_at", "user"]

    def get_region_name(self, obj):
        return obj.item.name if obj.item_id else ""

    def get_product(self, obj):
        if not obj.category:
            return None
        p = MapProduct.objects.filter(map=obj.map_id, slug=obj.category).first()
        return p.id if p else None

    def get_product_name(self, obj):
        if not obj.category:
            return ""
        p = MapProduct.objects.filter(map=obj.map_id, slug=obj.category).first()
        return p.name if p else ""


class DistributionRecordAdminSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source="region_item.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    region = serializers.PrimaryKeyRelatedField(source="region_item", queryset=MapItem.objects.none())

    class Meta:
        model = MapDistributionRecord
        fields = [
            "id", "region", "region_name", "product", "product_name",
            "families_served", "quantity_distributed", "recorded_by", "date",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        map_obj = get_legacy_map()
        if map_obj:
            self.fields["region"].queryset = region_items_qs(map_obj)
            self.fields["product"].queryset = MapProduct.objects.filter(map=map_obj)

    def create(self, validated_data):
        map_obj = get_legacy_map()
        return MapDistributionRecord.objects.create(map=map_obj, **validated_data)
