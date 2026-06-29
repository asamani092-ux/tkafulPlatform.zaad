from rest_framework import serializers

from .models import (
    SupplierProfile, RepresentativeProfile, Sponsorship, Order, Invoice, Payment, Documentation,
)


class SupplierProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.profile.name", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = SupplierProfile
        fields = ["id", "user", "name", "email", "business_name", "specialization", "address",
                  "rating", "total_orders", "completed_orders", "created_at"]
        read_only_fields = ["rating", "total_orders", "completed_orders", "created_at"]


class RepresentativeProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.profile.name", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = RepresentativeProfile
        fields = ["id", "user", "name", "email", "area", "active_orders", "total_completed", "rating", "created_at"]
        read_only_fields = ["active_orders", "total_completed", "rating", "created_at"]


class SponsorshipSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source="donor.profile.name", read_only=True)
    total_funded = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    is_fully_funded = serializers.SerializerMethodField()

    class Meta:
        model = Sponsorship
        fields = [
            "id", "donor", "donor_name", "amount", "type", "description", "location",
            "latitude", "longitude", "beneficiaries_count", "status", "priority", "target_date",
            "approved_at", "funded_at", "completed_at", "admin_notes", "rejection_reason",
            "total_funded", "remaining", "is_fully_funded", "created_at", "updated_at",
        ]
        read_only_fields = ["donor", "status", "approved_at", "funded_at", "completed_at",
                            "admin_notes", "rejection_reason", "created_at", "updated_at"]

    def get_total_funded(self, obj):
        return float(obj.total_funded)

    def get_remaining(self, obj):
        return float(obj.remaining)

    def get_is_fully_funded(self, obj):
        return obj.is_fully_funded


class OrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.profile.name", read_only=True, allow_null=True)
    representative_name = serializers.CharField(source="representative.profile.name", read_only=True, allow_null=True)
    sponsorship_type = serializers.CharField(source="sponsorship.type", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "sponsorship", "sponsorship_type", "supplier", "supplier_name",
            "representative", "representative_name", "items", "estimated_cost", "actual_cost",
            "status", "assigned_at", "preparation_started_at", "ready_at", "delivered_at",
            "completed_at", "supplier_notes", "representative_notes", "admin_notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["status", "assigned_at", "preparation_started_at", "ready_at",
                            "delivered_at", "completed_at", "created_at", "updated_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = Invoice
        fields = ["id", "order", "invoice_number", "amount", "tax_amount", "total_amount",
                  "status", "file", "file_url", "issue_date", "due_date", "paid_date", "notes",
                  "rejection_reason", "created_at"]
        read_only_fields = ["status", "issue_date", "paid_date", "created_at"]

    def get_file_url(self, obj):
        # رابط التنزيل المصادق (وليس MEDIA_URL العام)
        return f"/api/saqya/invoices/{obj.id}/file/" if obj.file else None


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "sponsorship", "amount", "method", "transaction_id", "reference_number",
                  "status", "payment_date", "notes", "failure_reason"]
        read_only_fields = ["status", "payment_date"]


class DocumentationSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file = serializers.FileField(write_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.profile.name", read_only=True, allow_null=True)

    class Meta:
        model = Documentation
        fields = ["id", "order", "type", "title", "description", "file", "file_url", "file_name",
                  "file_size", "mime_type", "latitude", "longitude", "location_name",
                  "approved", "uploaded_by", "uploaded_by_name", "upload_date"]
        read_only_fields = ["approved", "uploaded_by", "upload_date", "file_size", "mime_type"]

    def get_file_url(self, obj):
        return f"/api/saqya/documentation/{obj.id}/file/" if obj.file else None
