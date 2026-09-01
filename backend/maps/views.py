"""
واجهات نظام الخرائط:
- عامة (AllowAny): فهرس الخرائط المعلنة (المجمّع الموحّد /map مع فلترة بالمشروع)،
  تفاصيل خريطة عبر الفلتر المركزي، ملخص مجمّع مع إخفاء PDPL،
  ومساهمة عامة بمعدل محدود (PublicWriteRateThrottle).
- أدمن: CRUD مقيّد بعضوية المشروع؛ إنشاء/حذف الخرائط للمشرف العام فقط (provisioning).
Thin views — المنطق في services.py.
"""
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.permissions import is_super_admin
from core.throttles import PublicWriteRateThrottle
from projects import services as project_services

from . import services
from .models import Map, MapContribution, MapItem, MapItemField, MapLayer
from .permissions import IsSuperAdminOrMapProjectStaff, scoped_maps_queryset
from .serializers import (
    MapAdminSerializer,
    MapContributionAdminSerializer,
    MapItemAdminSerializer,
    MapItemFieldAdminSerializer,
    MapLayerAdminSerializer,
    PublicContributionCreateSerializer,
)


def _public_map_or_none(pk):
    return (
        Map.objects.filter(
            pk=pk,
            visibility__in=["public", "mixed"],
            published_at__isnull=False,
            project__is_active=True,
            project__status="active",  # النشطة فقط تظهر عامّاً (D-43)
        )
        .select_related("project")
        .first()
    )


# ---- عام ----
@api_view(["GET"])
@permission_classes([AllowAny])
def public_maps_index(request):
    """المجمّع الموحّد: كل الخرائط المعلنة مع فلترة اختيارية ?project=slug."""
    return Response(services.public_maps_index(project_slug=request.GET.get("project")))


@api_view(["GET"])
@permission_classes([AllowAny])
def public_map_detail(request, pk):
    map_obj = _public_map_or_none(pk)
    if not map_obj:
        return Response({"detail": "الخريطة غير متاحة"}, status=status.HTTP_404_NOT_FOUND)
    return Response(services.build_public_map_detail(map_obj))


@api_view(["GET"])
@permission_classes([AllowAny])
def public_map_summary(request, pk):
    map_obj = _public_map_or_none(pk)
    if not map_obj:
        return Response({"detail": "الخريطة غير متاحة"}, status=status.HTTP_404_NOT_FOUND)
    return Response(services.build_map_summary(map_obj))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PublicWriteRateThrottle])
def public_map_contribution_create(request, pk):
    map_obj = _public_map_or_none(pk)
    if not map_obj:
        return Response({"detail": "الخريطة غير متاحة"}, status=status.HTTP_404_NOT_FOUND)
    serializer = PublicContributionCreateSerializer(
        data=request.data, context={"map": map_obj}
    )
    serializer.is_valid(raise_exception=True)
    extra = {"map": map_obj}
    if request.user and request.user.is_authenticated:
        extra["user"] = request.user
    contribution = serializer.save(**extra)
    return Response(
        {"message": "تم استلام تعهدكم بنجاح", "id": contribution.id, "status": contribution.status},
        status=status.HTTP_201_CREATED,
    )


# ---- أدمن ----
class MapViewSet(viewsets.ModelViewSet):
    serializer_class = MapAdminSerializer
    permission_classes = [IsSuperAdminOrMapProjectStaff]

    def get_queryset(self):
        return scoped_maps_queryset(
            self.request.user, Map.objects.select_related("project").all()
        )

    def create(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "إنشاء الخرائط (provisioning) متاح للمشرف العام فقط"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {"detail": "حذف الخرائط متاح للمشرف العام فقط"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        self._require_manage(serializer.instance.project)
        serializer.save()

    def _require_manage(self, project):
        from rest_framework.exceptions import PermissionDenied

        if not project_services.can_manage_project(self.request.user, project):
            raise PermissionDenied("غير مصرّح بإدارة خرائط هذا المشروع")

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        map_obj = self.get_object()
        self._require_manage(map_obj.project)
        map_obj.published_at = timezone.now()
        map_obj.save(update_fields=["published_at"])
        return Response({"message": "تم نشر الخريطة", "published_at": map_obj.published_at})

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        map_obj = self.get_object()
        self._require_manage(map_obj.project)
        map_obj.published_at = None
        map_obj.save(update_fields=["published_at"])
        return Response({"message": "تم إلغاء نشر الخريطة"})


class _MapChildViewSet(viewsets.ModelViewSet):
    """أساس مشترك: النطاق عبر map__project وتحقّق كتابة عبر can_edit_project_content."""

    permission_classes = [IsSuperAdminOrMapProjectStaff]

    def get_queryset(self):
        qs = self.base_queryset()
        if is_super_admin(self.request.user):
            return qs
        return qs.filter(
            map__project_id__in=project_services.user_project_ids(self.request.user)
        )

    def _require_edit(self, map_obj):
        from rest_framework.exceptions import PermissionDenied

        if not project_services.can_edit_project_content(self.request.user, map_obj.project):
            raise PermissionDenied("غير مصرّح بتحرير محتوى هذا المشروع")

    def perform_create(self, serializer):
        self._require_edit(serializer.validated_data["map"])
        serializer.save()

    def perform_update(self, serializer):
        self._require_edit(serializer.instance.map)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_edit(instance.map)
        instance.delete()


class MapLayerViewSet(_MapChildViewSet):
    serializer_class = MapLayerAdminSerializer

    def base_queryset(self):
        return MapLayer.objects.select_related("map__project").all()


class MapItemFieldViewSet(_MapChildViewSet):
    serializer_class = MapItemFieldAdminSerializer

    def base_queryset(self):
        return MapItemField.objects.select_related("map__project").all()


class MapItemViewSet(_MapChildViewSet):
    serializer_class = MapItemAdminSerializer

    def base_queryset(self):
        qs = MapItem.objects.select_related("map__project", "layer").all()
        map_id = self.request.GET.get("map")
        if map_id:
            qs = qs.filter(map_id=map_id)
        return qs

    def perform_create(self, serializer):
        self._require_edit(serializer.validated_data["map"])
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def template(self, request):
        """
        GET /api/maps/admin/items/template/?map=<id>
        قالب CSV جاهز للتعبئة (الأعمدة + الحقول المخصّصة للخريطة إن وُجدت).
        """
        import csv
        import io

        map_id = request.GET.get("map")
        headers = ["name", "coordinates", "layer"]
        if map_id:
            field_keys = list(
                MapItemField.objects.filter(map_id=map_id).order_by("order").values_list("key", flat=True)
            )
            headers += field_keys
        from django.http import HttpResponse

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(headers)
        # صف مثال إرشادي
        example = ["مركز التوزيع", "https://maps.google.com/?q=24.7136,46.6753", "الطبقة الأولى"]
        example += [""] * (len(headers) - 3)
        writer.writerow(example)
        resp = HttpResponse("\ufeff" + buf.getvalue(), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="map_items_template.csv"'
        return resp

    @action(detail=False, methods=["post"])
    def bulk_upload(self, request):
        """
        POST /api/maps/admin/items/bulk_upload/
        رفع مواقع بالجملة. متساهل في صيغة الإحداثيات (روابط/خام) وصارم في التطبيع.

        الحمولة: multipart `file` (CSV) و`map` (id)، أو JSON:
          { "map": <id>, "rows": [ { "name", "coordinates" | "lat"+"lng", "layer"?, <field>... } ] }
        الاستجابة: { created, errors: [ { row, reason } ] }.
        O(R·F) — R صفوف، F حقول مخصّصة.
        """
        import csv
        import io

        from .coordinates import parse_coordinates

        map_id = request.data.get("map") or request.GET.get("map")
        if not map_id:
            return Response({"detail": "معرّف الخريطة (map) مطلوب"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            map_obj = Map.objects.select_related("project").get(pk=map_id)
        except Map.DoesNotExist:
            return Response({"detail": "الخريطة غير موجودة"}, status=status.HTTP_404_NOT_FOUND)
        self._require_edit(map_obj)

        rows = []
        upload = request.FILES.get("file")
        if upload is not None:
            try:
                text = upload.read().decode("utf-8-sig")
            except UnicodeDecodeError:
                return Response({"detail": "الملف يجب أن يكون CSV بترميز UTF-8"}, status=status.HTTP_400_BAD_REQUEST)
            rows = list(csv.DictReader(io.StringIO(text)))
        else:
            body_rows = request.data.get("rows")
            if isinstance(body_rows, list):
                rows = body_rows
        if not rows:
            return Response({"detail": "لا صفوف للمعالجة"}, status=status.HTTP_400_BAD_REQUEST)

        layers = {l.name.strip(): l for l in MapLayer.objects.filter(map=map_obj)}
        layers_by_id = {str(l.id): l for l in layers.values()}
        default_layer = next(iter(layers.values()), None)
        field_defs = list(MapItemField.objects.filter(map=map_obj))
        field_keys = {f.key for f in field_defs}

        created, errors = 0, []
        for idx, row in enumerate(rows, start=1):
            if not isinstance(row, dict):
                errors.append({"row": idx, "reason": "صف غير صالح"})
                continue
            row = {(k or "").strip(): v for k, v in row.items()}
            name = (row.get("name") or row.get("الاسم") or "").strip()
            if not name:
                errors.append({"row": idx, "reason": "الاسم مطلوب"})
                continue
            # الإحداثيات: عمود موحّد أو lat+lng منفصلان
            coord_raw = row.get("coordinates") or row.get("location") or row.get("link") or row.get("url") or row.get("الإحداثيات")
            if not coord_raw and (row.get("lat") or row.get("lng")):
                coord_raw = f"{row.get('lat')},{row.get('lng')}"
            coords = parse_coordinates(coord_raw)
            if coords is None:
                errors.append({"row": idx, "reason": f"إحداثيات غير مقروءة: {coord_raw or '—'}"})
                continue
            lat, lng = coords
            # الطبقة: بالاسم أو المعرّف، وإلا الافتراضية
            layer_raw = (str(row.get("layer") or row.get("الطبقة") or "")).strip()
            layer = layers.get(layer_raw) or layers_by_id.get(layer_raw) or default_layer
            if layer is None:
                errors.append({"row": idx, "reason": "لا توجد طبقة — أنشئ طبقة أولاً"})
                continue
            # الحقول المخصّصة المطابقة للمخطط فقط (نطاق دقيق)
            data = {}
            for k, v in row.items():
                if k in field_keys and v not in (None, ""):
                    data[k] = v
            try:
                item = MapItem(map=map_obj, layer=layer, name=name, lat=lat, lng=lng, data=data)
                item.full_clean(exclude=["created_by"])
                item.created_by = request.user
                item.save()
                created += 1
            except Exception as exc:  # noqa: BLE001 — نجمع الأخطاء لكل صف
                errors.append({"row": idx, "reason": str(exc)[:200]})

        return Response({"created": created, "errors": errors}, status=status.HTTP_200_OK)


class MapContributionViewSet(_MapChildViewSet):
    serializer_class = MapContributionAdminSerializer
    http_method_names = ["get", "head", "options", "patch", "delete", "post"]

    def base_queryset(self):
        qs = MapContribution.objects.select_related("map__project", "item", "user").all()
        map_id = self.request.GET.get("map")
        if map_id:
            qs = qs.filter(map_id=map_id)
        return qs

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "استخدم نقطة التعهد العامة للإنشاء"},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def _set_status(self, new_status, message):
        c = self.get_object()
        self._require_edit(c.map)
        c.status = new_status
        c.save(update_fields=["status"])
        return Response({"message": message, "status": c.status})

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._set_status("approved", "تم اعتماد التعهد")

    @action(detail=True, methods=["post"])
    def fulfill(self, request, pk=None):
        return self._set_status("fulfilled", "تم تنفيذ التعهد")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._set_status("cancelled", "تم إلغاء التعهد")
