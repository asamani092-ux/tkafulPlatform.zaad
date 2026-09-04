from rest_framework import serializers

from .models import (
    SupplierProfile, RepresentativeProfile, Sponsorship, SponsorshipType,
    Order, Invoice, Payment, Documentation,
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



class SponsorshipTypeSerializer(serializers.ModelSerializer):
    project_slug = serializers.CharField(source="project.slug", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    # كتابة عبر slug للمشروع دون طلب slug للنوع من المستخدم
    project = serializers.SlugRelatedField(
        slug_field="slug", queryset=__import__("projects.models", fromlist=["Project"]).Project.objects.all()
    )

    class Meta:
        model = SponsorshipType
        fields = [
            "id", "project", "project_slug", "project_name", "name", "slug",
            "description", "is_active", "order", "fields", "created_at", "updated_at",
        ]
        read_only_fields = ["slug", "created_at", "updated_at"]

    def validate_fields(self, value):
        from core.dynamic_fields import validate_fields_schema
        try:
            return validate_fields_schema(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def create(self, validated_data):
        from projects.slug_utils import unique_slug_from_name
        project = validated_data["project"]
        validated_data["slug"] = unique_slug_from_name(
            SponsorshipType, validated_data.get("name", ""), project=project
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from projects.slug_utils import unique_slug_from_name
        name = validated_data.get("name", instance.name)
        project = validated_data.get("project", instance.project)
        if name != instance.name or project != instance.project:
            validated_data["slug"] = unique_slug_from_name(
                SponsorshipType, name, exclude_pk=instance.pk, project=project
            )
        return super().update(instance, validated_data)


class SponsorshipSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source="donor.profile.name", read_only=True, allow_null=True)
    sponsorship_type_name = serializers.CharField(source="sponsorship_type.name", read_only=True, allow_null=True)
    project = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=__import__("projects.models", fromlist=["Project"]).Project.objects.all(),
        required=False, allow_null=True,
    )
    total_funded = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    is_fully_funded = serializers.SerializerMethodField()
    units_progress = serializers.SerializerMethodField()
    payments_enabled = serializers.SerializerMethodField()

    class Meta:
        model = Sponsorship
        fields = [
            "id", "donor", "donor_name", "sponsor_name", "kind",
            "units_target", "units_completed", "units_progress",
            "project", "sponsorship_type", "sponsorship_type_name",
            "type_data", "amount", "type", "description", "location",
            "latitude", "longitude", "beneficiaries_count", "status", "status_ref",
            "priority", "target_date",
            "approved_at", "funded_at", "completed_at", "admin_notes", "rejection_reason",
            "total_funded", "remaining", "is_fully_funded", "payments_enabled",
            "created_at", "updated_at",
        ]
        read_only_fields = ["donor", "status", "status_ref", "approved_at", "funded_at", "completed_at",
                            "admin_notes", "rejection_reason", "created_at", "updated_at"]
        extra_kwargs = {
            "type": {"required": False, "allow_blank": True},
            "type_data": {"required": False},
            "sponsorship_type": {"required": False, "allow_null": True},
            "amount": {"required": False, "allow_null": True},
            "sponsor_name": {"required": False, "allow_blank": True},
        }

    def _payments_on(self) -> bool:
        cached = getattr(self, "_payments_on_flag", None)
        if cached is None:
            from core.runtime_config import payments_enabled
            cached = payments_enabled()
            self._payments_on_flag = cached
        return cached

    def _funded(self, obj):
        annotated = getattr(obj, "_total_funded", None)
        if annotated is not None:
            return float(annotated)
        return float(obj.total_funded)

    def get_total_funded(self, obj):
        if not self._payments_on():
            return 0
        return self._funded(obj)

    def get_remaining(self, obj):
        if not self._payments_on() or obj.amount is None:
            return None
        return float(obj.amount) - self._funded(obj)

    def get_is_fully_funded(self, obj):
        if not self._payments_on() or obj.amount is None:
            return False
        return self._funded(obj) >= float(obj.amount)

    def get_units_progress(self, obj):
        return obj.units_progress

    def get_payments_enabled(self, obj):
        return self._payments_on()

    def validate(self, attrs):
        """التحقق من type_data عند ربط نوع ديناميكي — O(f) لعدد الحقول."""
        from core.dynamic_fields import validate_submission

        initial = getattr(self, "initial_data", {}) or {}
        creating = self.instance is None
        pe = self._payments_on()

        if "amount" in attrs and attrs["amount"] is not None and not pe:
            # المبلغ للعرض فقط عند تعطيل المدفوعات — مسموح لكن لا يُفرض
            pass
        if pe and creating and attrs.get("amount") is None and "amount" not in initial:
            # في وضع المال: المبلغ مستحسن لكن غير إلزامي على مستوى الحقل (اختبارات عينية)
            pass

        if "sponsorship_type" in initial:
            st = attrs.get("sponsorship_type")
            type_data = attrs.get("type_data")
            if type_data is None:
                type_data = {} if creating else (self.instance.type_data or {})
            if st is None:
                attrs["type_data"] = type_data if isinstance(type_data, dict) else {}
            else:
                project = attrs.get("project") or (None if creating else self.instance.project)
                if project and st.project_id != project.id:
                    raise serializers.ValidationError({"sponsorship_type": "نوع الكفالة لا يتبع هذا المشروع"})
                if creating and not st.is_active:
                    raise serializers.ValidationError({"sponsorship_type": "نوع الكفالة غير نشط"})
                try:
                    attrs["type_data"] = validate_submission(st.fields or [], type_data or {})
                except ValueError as exc:
                    raise serializers.ValidationError({"type_data": str(exc)}) from exc
                attrs["type"] = (st.name or "")[:50]
                if not attrs.get("project"):
                    attrs["project"] = st.project
        elif creating:
            if not attrs.get("type"):
                raise serializers.ValidationError({"type": "نوع الكفالة مطلوب أو اختر نوعاً معرّفاً"})
            attrs.setdefault("type_data", {})
        elif "type_data" in attrs and self.instance and self.instance.sponsorship_type_id:
            st = self.instance.sponsorship_type
            try:
                attrs["type_data"] = validate_submission(st.fields or [], attrs.get("type_data") or {})
            except ValueError as exc:
                raise serializers.ValidationError({"type_data": str(exc)}) from exc

        kind = attrs.get("kind", getattr(self.instance, "kind", Sponsorship.KIND_INDIVIDUAL))
        if kind == Sponsorship.KIND_COMMUNITY:
            target = attrs.get("units_target", getattr(self.instance, "units_target", None))
            if target is not None and target < 1:
                raise serializers.ValidationError({"units_target": "يجب أن يكون هدف الوحدات ≥ 1"})

        # فرض سياسة بيانات المتبرّع + رفض أي PII لمستفيد (لا حقول مستفيد على النموذج)
        from core.models import PlatformSetting
        from core.runtime_config import donor_data_policy

        forbidden = {
            "beneficiary_name", "beneficiary_phone", "beneficiary_national_id",
            "beneficiary_address", "beneficiary_email",
        }
        leaked = forbidden.intersection(set(initial.keys()))
        if leaked:
            raise serializers.ValidationError(
                {k: "لا يُسمح بتخزين بيانات مستفيد على الكفالة" for k in leaked}
            )

        policy = donor_data_policy()
        name = attrs.get("sponsor_name", getattr(self.instance, "sponsor_name", "") if self.instance else "")
        name = (name or "").strip()
        if policy == PlatformSetting.DONOR_DATA_NONE:
            if name or initial.get("sponsor_name"):
                raise serializers.ValidationError({"sponsor_name": "جمع بيانات المتبرّع معطّل لهذه المنصّة"})
            attrs["sponsor_name"] = ""
        elif policy == PlatformSetting.DONOR_DATA_NAME_OPTIONAL:
            attrs["sponsor_name"] = name
        else:
            # full — الاسم مسموح (حقول إضافية غير موجودة على النموذج عمداً)
            attrs["sponsor_name"] = name
        return attrs

    def create(self, validated_data):
        from .models import SponsorshipStatus
        from .status_catalog import resolve_status_ref

        st = validated_data.get("sponsorship_type")
        if st and not validated_data.get("type"):
            validated_data["type"] = (st.name or "")[:50]
        if st and not validated_data.get("project"):
            validated_data["project"] = st.project
        if not validated_data.get("status"):
            validated_data["status"] = "available"
        ref = resolve_status_ref(model=SponsorshipStatus, slug=validated_data["status"])
        if ref:
            validated_data["status_ref"] = ref
        return super().create(validated_data)




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

    def validate_file(self, value):
        from .validators import validate_upload_file
        err = validate_upload_file(value)
        if err:
            raise serializers.ValidationError(err)
        return value


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

    def validate_file(self, value):
        from .validators import validate_upload_file
        err = validate_upload_file(value)
        if err:
            raise serializers.ValidationError(err)
        return value

    def validate(self, attrs):
        from core.runtime_config import gps_documentation_enabled
        from .validators import validate_gps

        if not gps_documentation_enabled():
            # زاد: لا GPS — اسقط الحقول إن وُجدت ولا تفرضها
            attrs.pop("latitude", None)
            attrs.pop("longitude", None)
            return attrs
        err = validate_gps(attrs.get("latitude"), attrs.get("longitude"))
        if err:
            raise serializers.ValidationError({"latitude": err})
        return attrs
