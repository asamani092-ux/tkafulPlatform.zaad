"""
طبقة إشعارات وحدة كفالات السقيا — تُستدعى صراحةً عند انتقالات سير العمل.
تنشئ إشعاراً داخل المنصّة (notifications.Notification) + بريد إن توفّر إيميل.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail

from notifications.models import Notification

logger = logging.getLogger(__name__)


def notify(user, message, email_subject=None):
    """إشعار داخل المنصّة + بريد اختياري (fail-safe)."""
    if not user:
        return
    try:
        Notification.objects.create(user=user, message=message)
    except Exception as exc:  # pragma: no cover
        logger.warning("in-app notification failed: %s", exc)
    if user.email and email_subject:
        try:
            send_mail(email_subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        except Exception as exc:  # pragma: no cover
            logger.warning("email notification failed: %s", exc)


def notify_order_assigned(order):
    if order.supplier:
        notify(order.supplier,
               f"تم إسناد طلب توريد جديد لك (#{order.id}) ضمن كفالة #{order.sponsorship_id}.",
               "طلب توريد جديد - كفالات السقيا")


def notify_order_ready(order):
    if order.representative:
        notify(order.representative,
               f"الطلب #{order.id} أصبح جاهزاً للتسليم. يرجى المتابعة الميدانية.",
               "طلب جاهز للتسليم - كفالات السقيا")


def notify_donor_report(sponsorship):
    """عند اعتماد المشرف للتوثيق: إرسال رابط التقرير النهائي للمتبرّع."""
    if sponsorship.donor:
        notify(sponsorship.donor,
               f"تم اعتماد تنفيذ كفالتك #{sponsorship.id}. يمكنك عرض تقرير التنفيذ والتوثيق من بوابتك.",
               "تقرير تنفيذ كفالتك - كفالات السقيا")
