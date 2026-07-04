import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from django.http import FileResponse, Http404
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.throttles import PublicWriteRateThrottle
from .models import (
    SupplierProfile, RepresentativeProfile, Sponsorship, Order, Invoice, Payment, Documentation,
)
from .serializers import (
    SupplierProfileSerializer, RepresentativeProfileSerializer, SponsorshipSerializer,
    OrderSerializer, InvoiceSerializer, PaymentSerializer, DocumentationSerializer,
)
from .permissions import IsSaqyaAdmin, IsSaqyaStaffOrReadOnly
from . import notifications as notify

logger = logging.getLogger(__name__)


def role(user):
    return getattr(getattr(user, "profile", None), "role", None)


def can_access_order(user, order):
    r = role(user)
    if r == "admin":
        return True
    if order.sponsorship.donor_id == user.id:
        return True
    return order.supplier_id == user.id or order.representative_id == user.id


# ============ Sponsorships ============
class SponsorshipViewSet(viewsets.ModelViewSet):
    serializer_class = SponsorshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        r = role(u)
        qs = Sponsorship.objects.select_related("donor__profile")
        if r == "admin":
            return qs
        if r == "donor":
            return qs.filter(donor=u)
        if r == "supplier":
            return qs.filter(orders__supplier=u).distinct()
        if r == "representative":
            return qs.filter(orders__representative=u).distinct()
        return qs.none()

    def get_throttles(self):
        # تحديد معدّل نقطة الدفع لمنع العبث
        if getattr(self, "action", None) == "pay":
            return [PublicWriteRateThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer):
        serializer.save(donor=self.request.user)

    def create(self, request, *args, **kwargs):
        if role(request.user) != "donor":
            return Response({"detail": "إنشاء الكفالة متاح للمتبرّع فقط"}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsSaqyaAdmin])
    def approve(self, request, pk=None):
        sp = self.get_object()
        if sp.status != "pending":
            return Response({"detail": "يمكن اعتماد الكفالات قيد المراجعة فقط"}, status=400)
        sp.status = "approved"
        sp.approved_at = timezone.now()
        sp.admin_notes = request.data.get("admin_notes", "")
        sp.save()
        Order.objects.create(sponsorship=sp, status="pending")  # طلب أوّلي بانتظار الإسناد
        return Response({"message": "تم اعتماد الكفالة", "sponsorship": SponsorshipSerializer(sp).data})

    @action(detail=True, methods=["post"], permission_classes=[IsSaqyaAdmin])
    def reject(self, request, pk=None):
        sp = self.get_object()
        if sp.status != "pending":
            return Response({"detail": "يمكن رفض الكفالات قيد المراجعة فقط"}, status=400)
        sp.status = "rejected"
        sp.rejection_reason = request.data.get("rejection_reason", "")
        sp.save()
        return Response({"message": "تم رفض الكفالة"})

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        """دفع للكفالة مع منع التمويل الزائد وأتمتة الحالة (آمن ضد التسابق)."""
        try:
            amount = Decimal(str(request.data.get("amount")))
        except (InvalidOperation, TypeError):
            return Response({"detail": "مبلغ غير صالح"}, status=400)
        if amount <= 0:
            return Response({"detail": "المبلغ يجب أن يكون موجباً"}, status=400)

        with transaction.atomic():
            sp = Sponsorship.objects.select_for_update().get(pk=pk)
            if role(request.user) != "admin" and sp.donor_id != request.user.id:
                return Response({"detail": "غير مصرّح"}, status=403)
            if sp.status in ("rejected", "cancelled", "completed"):
                return Response({"detail": "لا يمكن الدفع لهذه الكفالة"}, status=400)
            if float(sp.total_funded) + float(amount) > float(sp.amount):
                return Response({"detail": f"المبلغ يتجاوز المتبقّي ({sp.remaining})"}, status=400)

            payment = Payment.objects.create(
                sponsorship=sp, amount=amount,
                method=request.data.get("method", "online"),
                transaction_id=request.data.get("transaction_id", ""),
                reference_number=request.data.get("reference_number", ""),
                status="completed",
            )
            if sp.is_fully_funded and sp.status in ("pending", "approved"):
                sp.status = "in_progress"
                sp.funded_at = timezone.now()
                sp.save(update_fields=["status", "funded_at", "updated_at"])

        return Response({"message": "تم تسجيل الدفعة", "payment_id": payment.id,
                         "total_funded": float(sp.total_funded), "status": sp.status}, status=201)


# ============ Orders ============
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        r = role(u)
        qs = Order.objects.select_related("sponsorship", "supplier__profile", "representative__profile")
        if r == "admin":
            return qs
        if r == "supplier":
            return qs.filter(supplier=u)
        if r == "representative":
            return qs.filter(representative=u)
        if r == "donor":
            return qs.filter(sponsorship__donor=u)
        return qs.none()

    @action(detail=True, methods=["post"], permission_classes=[IsSaqyaAdmin])
    def assign(self, request, pk=None):
        order = self.get_object()
        order.supplier_id = request.data.get("supplier_id") or order.supplier_id
        order.representative_id = request.data.get("representative_id") or order.representative_id
        order.status = "assigned"
        order.assigned_at = timezone.now()
        order.save()
        notify.notify_order_assigned(order)
        return Response({"message": "تم إسناد الطلب", "order": OrderSerializer(order).data})

    @action(detail=True, methods=["post"])
    def prepare(self, request, pk=None):
        order = self.get_object()
        if order.supplier_id != request.user.id and role(request.user) != "admin":
            return Response({"detail": "غير مصرّح"}, status=403)
        order.status = "preparing"
        order.preparation_started_at = timezone.now()
        order.save()
        return Response({"message": "بدأ التحضير"})

    @action(detail=True, methods=["post"])
    def ready(self, request, pk=None):
        order = self.get_object()
        if order.supplier_id != request.user.id and role(request.user) != "admin":
            return Response({"detail": "غير مصرّح"}, status=403)
        order.status = "ready"
        order.ready_at = timezone.now()
        order.save()
        notify.notify_order_ready(order)
        return Response({"message": "الطلب جاهز للتسليم"})

    @action(detail=True, methods=["post"])
    def deliver(self, request, pk=None):
        order = self.get_object()
        if order.representative_id != request.user.id and role(request.user) != "admin":
            return Response({"detail": "غير مصرّح"}, status=403)
        order.status = "delivered"
        order.delivered_at = timezone.now()
        order.save()
        return Response({"message": "تم التسليم"})

    @action(detail=True, methods=["post"], permission_classes=[IsSaqyaAdmin])
    def complete(self, request, pk=None):
        order = self.get_object()
        order.status = "completed"
        order.completed_at = timezone.now()
        order.save()
        sp = order.sponsorship
        sp.status = "completed"
        sp.completed_at = timezone.now()
        sp.save(update_fields=["status", "completed_at", "updated_at"])
        return Response({"message": "اكتمل تنفيذ الطلب والكفالة"})


# ============ Invoices ============
class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        r = role(u)
        qs = Invoice.objects.select_related("order__sponsorship")
        if r == "admin":
            return qs
        if r == "supplier":
            return qs.filter(order__supplier=u)
        if r == "donor":
            return qs.filter(order__sponsorship__donor=u)
        return qs.none()

    def create(self, request, *args, **kwargs):
        if role(request.user) not in ("supplier", "admin"):
            return Response({"detail": "رفع الفاتورة للمورّد فقط"}, status=403)
        f = request.FILES.get("file")
        if f and f.size > settings.SAQYA_MAX_UPLOAD_SIZE:
            return Response({"detail": "حجم الملف يتجاوز الحد المسموح"}, status=400)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsSaqyaAdmin])
    def approve(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = "approved"
        invoice.save(update_fields=["status", "updated_at"])
        return Response({"message": "تم اعتماد الفاتورة"})


# ============ Documentation ============
class DocumentationViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        r = role(u)
        qs = Documentation.objects.select_related("order__sponsorship", "uploaded_by__profile")
        if r == "admin":
            return qs
        if r == "representative":
            return qs.filter(order__representative=u)
        if r == "supplier":
            return qs.filter(order__supplier=u)
        if r == "donor":
            return qs.filter(order__sponsorship__donor=u)
        return qs.none()

    def create(self, request, *args, **kwargs):
        if role(request.user) not in ("representative", "supplier", "admin"):
            return Response({"detail": "رفع التوثيق للمندوب/المورّد فقط"}, status=403)
        f = request.FILES.get("file")
        if f and f.size > settings.SAQYA_MAX_UPLOAD_SIZE:
            return Response({"detail": "حجم الملف يتجاوز الحد المسموح"}, status=400)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        extra = {"uploaded_by": request.user}
        if f:
            extra.update(file_name=f.name, file_size=f.size, mime_type=getattr(f, "content_type", ""))
        serializer.save(**extra)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=["post"], permission_classes=[IsSaqyaAdmin])
    def approve(self, request, pk=None):
        """اعتماد التوثيق -> إشعار المتبرّع بتقرير التنفيذ."""
        doc = self.get_object()
        doc.approved = True
        doc.save(update_fields=["approved"])
        notify.notify_donor_report(doc.order.sponsorship)
        return Response({"message": "تم اعتماد التوثيق وإشعار المتبرّع"})


# ============ Payments (قراءة) ============
class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        r = role(u)
        qs = Payment.objects.select_related("sponsorship")
        if r == "admin":
            return qs
        if r == "donor":
            return qs.filter(sponsorship__donor=u)
        return qs.none()


# ============ Supplier / Representative profiles (admin manage) ============
class SupplierProfileViewSet(viewsets.ModelViewSet):
    queryset = SupplierProfile.objects.select_related("user__profile").all()
    serializer_class = SupplierProfileSerializer
    permission_classes = [IsSaqyaStaffOrReadOnly]


class RepresentativeProfileViewSet(viewsets.ModelViewSet):
    queryset = RepresentativeProfile.objects.select_related("user__profile").all()
    serializer_class = RepresentativeProfileSerializer
    permission_classes = [IsSaqyaStaffOrReadOnly]


# ============ تقديم الملفات الخاصة (مصادق + تحقّق دور/ملكية) ============
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def serve_invoice_file(request, pk):
    try:
        invoice = Invoice.objects.select_related("order__sponsorship").get(pk=pk)
    except Invoice.DoesNotExist:
        raise Http404
    if not invoice.file or not can_access_order(request.user, invoice.order):
        return Response({"detail": "غير مصرّح"}, status=403)
    return FileResponse(invoice.file.open("rb"))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def serve_documentation_file(request, pk):
    try:
        doc = Documentation.objects.select_related("order__sponsorship").get(pk=pk)
    except Documentation.DoesNotExist:
        raise Http404
    allowed = can_access_order(request.user, doc.order) or doc.uploaded_by_id == request.user.id
    if not allowed:
        return Response({"detail": "غير مصرّح"}, status=403)
    return FileResponse(doc.file.open("rb"))


# ============ لوحات وإحصاءات وخريطة (Phase 3C) ============
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def saqya_dashboard(request):
    """إحصاءات حسب الدور."""
    u = request.user
    r = role(u)
    if r == "admin":
        data = {
            "total_sponsorships": Sponsorship.objects.count(),
            "active": Sponsorship.objects.filter(status="in_progress").count(),
            "completed": Sponsorship.objects.filter(status="completed").count(),
            "pending": Sponsorship.objects.filter(status="pending").count(),
            "total_funded": float(sum(float(p.amount) for p in Payment.objects.filter(status="completed"))),
        }
    elif r == "donor":
        mine = Sponsorship.objects.filter(donor=u)
        data = {"my_sponsorships": mine.count(),
                "completed": mine.filter(status="completed").count(),
                "in_progress": mine.filter(status="in_progress").count()}
    elif r == "supplier":
        data = {"orders": Order.objects.filter(supplier=u).count(),
                "ready": Order.objects.filter(supplier=u, status="ready").count()}
    elif r == "representative":
        data = {"orders": Order.objects.filter(representative=u).count(),
                "delivered": Order.objects.filter(representative=u, status="delivered").count()}
    else:
        data = {}
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def saqya_map(request):
    """نقاط الكفالات ذات الإحداثيات للخريطة (admin)."""
    if role(request.user) != "admin":
        return Response({"detail": "غير مصرّح"}, status=403)
    points = Sponsorship.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True) \
        .values("id", "type", "status", "location", "latitude", "longitude", "amount")
    return Response({"points": list(points)})
