import re

from rest_framework import serializers

from .models import Region, Product, Outlet, Contribution, DistributionRecord


def mask_families_count(value: int):
    """Privacy: counts under 5 are never exposed as integers."""
    if value < 5:
        return "<5"
    return value


class PublicProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "slug", "icon", "season", "target_families", "order"]


class PublicOutletSerializer(serializers.ModelSerializer):
    region_slug = serializers.CharField(source="region.slug", read_only=True, allow_null=True)

    class Meta:
        model = Outlet
        fields = [
            "id", "name", "type", "lat", "lng", "region_slug",
            "address", "working_hours",
        ]


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


class ContributionCreateSerializer(serializers.ModelSerializer):
    region = serializers.SlugRelatedField(slug_field="slug", queryset=Region.objects.filter(is_active=True))
    product = serializers.SlugRelatedField(slug_field="slug", queryset=Product.objects.filter(is_active=True))

    class Meta:
        model = Contribution
        fields = ["name", "phone", "region", "product", "quantity", "mode", "note"]

    def validate_phone(self, value):
        digits = re.sub(r"\D", "", value or "")
        if digits.startswith("966"):
            digits = digits[3:]
        if digits.startswith("0"):
            digits = digits[1:]
        if not re.fullmatch(r"5\d{8}", digits):
            raise serializers.ValidationError("رقم الجوال غير صالح (5XXXXXXXX)")
        return digits

    def validate_quantity(self, value):
        if value < 1 or value > 1000:
            raise serializers.ValidationError("الكمية يجب أن تكون بين 1 و 1000")
        return value

    def validate_mode(self, value):
        if value not in ("self_distribution", "delegate_association"):
            raise serializers.ValidationError("نمط المساهمة غير صالح")
        return value


# ---- Admin serializers ----
class RegionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = "__all__"


class ProductAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class OutletAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Outlet
        fields = "__all__"


class ContributionAdminSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source="region.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Contribution
        fields = [
            "id", "user", "name", "phone", "region", "region_name", "product", "product_name",
            "quantity", "mode", "status", "note", "created_at",
        ]
        read_only_fields = ["status", "created_at", "user"]


class DistributionRecordAdminSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source="region.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = DistributionRecord
        fields = [
            "id", "region", "region_name", "product", "product_name",
            "families_served", "quantity_distributed", "recorded_by", "date",
        ]
