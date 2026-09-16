"""
مصدر حقيقة واحد لأدوار المنصّة وقدراتها (ثابتة في الكود — D-41).
ثلاثة أدوار أساسية للتعيين والعرض؛ الأدوار القديمة تبقى للتوافق مع الحسابات الحالية.
التعقيد: has_capability O(1)؛ بناء الكتالوج O(R·C).
"""
from __future__ import annotations

# مفاتيح القدرات — تُستخدم في فئات الصلاحيات والكتالوج
CAP_MANAGE_USERS = "manage_users"
CAP_MANAGE_SETTINGS = "manage_settings"
CAP_BROADCAST = "broadcast_notifications"
CAP_CREATE_PROJECT = "create_project"
CAP_DELETE_PROJECT = "delete_project"
CAP_MANAGE_VOLUNTEERS = "manage_volunteers"
CAP_MANAGE_REQUESTS = "manage_service_requests"
CAP_APPROVE_SPONSORSHIP = "approve_sponsorship"
CAP_ASSIGN_ORDER = "assign_order"
CAP_CREATE_SPONSORSHIP = "create_sponsorship"
CAP_PREPARE_ORDER = "prepare_order"
CAP_DELIVER_ORDER = "deliver_order"
CAP_UPLOAD_DOCUMENTATION = "upload_documentation"
CAP_APPLY_VOLUNTEER = "apply_volunteer"
CAP_MANAGE_STAFF = "manage_staff_dashboard"
CAP_VIEW_AUDIT = "view_audit_log"
CAP_PLATFORM_ADMIN = "platform_admin"

CAPABILITY_LABELS: dict[str, str] = {
    CAP_PLATFORM_ADMIN: "مشرف عام على المنصّة",
    CAP_MANAGE_USERS: "إدارة المستخدمين (عرض/إضافة/تعديل/حذف/تفعيل/دور)",
    CAP_MANAGE_SETTINGS: "تعديل إعدادات المنصّة والصفحات الثابتة",
    CAP_BROADCAST: "بث إشعار داخل المنصّة",
    CAP_CREATE_PROJECT: "إنشاء مشروع",
    CAP_DELETE_PROJECT: "حذف مشروع",
    CAP_MANAGE_VOLUNTEERS: "إدارة المتطوعين وطلبات التطوع",
    CAP_MANAGE_REQUESTS: "إدارة طلبات الخدمات وسقيا الماء",
    CAP_APPROVE_SPONSORSHIP: "اعتماد أو رفض الكفالة",
    CAP_ASSIGN_ORDER: "إسناد طلب الكفالة لمورّد/مندوب",
    CAP_CREATE_SPONSORSHIP: "إنشاء كفالة",
    CAP_PREPARE_ORDER: "تحضير طلب الكفالة",
    CAP_DELIVER_ORDER: "تسليم طلب الكفالة",
    CAP_UPLOAD_DOCUMENTATION: "رفع توثيق التنفيذ",
    CAP_APPLY_VOLUNTEER: "التقدّم لفرصة تطوع",
    CAP_MANAGE_STAFF: "تغذية لوحة الكادر (أقسام/موظفون/مهام)",
    CAP_VIEW_AUDIT: "عرض سجل النشاط",
}

# الأدوار الثلاثة المعروضة للتعيين في الواجهة والكتالوج
PRIMARY_ROLE_IDS: tuple[str, ...] = ("admin", "employee", "user")

# توافق تراكمي: المدير القديم يُعامل كموظف من حيث القدرات
ROLE_ALIASES: dict[str, str] = {
    "manager": "employee",
}

ROLE_LABELS: dict[str, str] = {
    "admin": "مدير النظام",
    "employee": "موظف",
    "user": "متطوع",
    # تسميات توافقية لعرض الحسابات القديمة دون حذف التاريخ
    "manager": "موظف (قديم: مدير)",
    "beneficiary": "مستفيد",
    "donor": "متبرّع",
    "supplier": "مورّد",
    "representative": "مندوب",
}

ROLE_DESCRIPTIONS: dict[str, str] = {
    "admin": "مدير النظام — المستخدمون والإعدادات والمشاريع والطلبات والكفالات.",
    "employee": "موظف — يغذّي لوحة الكادر ويساهم في تشغيل المشاريع عبر العضوية؛ دون صلاحيات المشرف العام.",
    "user": "متطوع — يتقدّم للفرص ويتابع مهامه داخل حسابه.",
    "manager": "توافق: يُعامل كموظف.",
    "beneficiary": "مستفيد من الخدمات — بلا صلاحيات إدارة (حسابات قديمة).",
    "donor": "متبرّع — ينشئ كفالة ويدفعها (حسابات قديمة).",
    "supplier": "مورّد — يجهّز الطلب ويرفع التوثيق (حسابات قديمة).",
    "representative": "مندوب ميداني — يسلّم الطلب ويرفع التوثيق (حسابات قديمة).",
}

_ADMIN = frozenset({
    CAP_PLATFORM_ADMIN,
    CAP_MANAGE_USERS,
    CAP_MANAGE_SETTINGS,
    CAP_BROADCAST,
    CAP_CREATE_PROJECT,
    CAP_DELETE_PROJECT,
    CAP_MANAGE_VOLUNTEERS,
    CAP_MANAGE_REQUESTS,
    CAP_APPROVE_SPONSORSHIP,
    CAP_ASSIGN_ORDER,
    CAP_PREPARE_ORDER,
    CAP_DELIVER_ORDER,
    CAP_UPLOAD_DOCUMENTATION,
    CAP_MANAGE_STAFF,
    CAP_VIEW_AUDIT,
})

# الموظف يستوعب قدرات المدير القديمة (manager → employee)
_EMPLOYEE = frozenset({
    CAP_MANAGE_STAFF,
    CAP_CREATE_SPONSORSHIP,
    CAP_APPROVE_SPONSORSHIP,
})

ROLE_CAPABILITIES: dict[str, frozenset[str]] = {
    "admin": _ADMIN | frozenset({CAP_CREATE_SPONSORSHIP}),
    "employee": _EMPLOYEE,
    "user": frozenset({CAP_APPLY_VOLUNTEER}),
    # قدرات توافقية للحسابات التي لم تُرحَّل بعد
    "manager": _EMPLOYEE,
    "beneficiary": frozenset(),
    "donor": frozenset({CAP_CREATE_SPONSORSHIP}),
    "supplier": frozenset({CAP_PREPARE_ORDER, CAP_UPLOAD_DOCUMENTATION}),
    "representative": frozenset({CAP_DELIVER_ORDER, CAP_UPLOAD_DOCUMENTATION}),
}


def canonical_role(role: str | None) -> str | None:
    if not role:
        return None
    return ROLE_ALIASES.get(role, role)


def role_of(user) -> str | None:
    if not user or not getattr(user, "is_authenticated", False):
        return None
    profile = getattr(user, "profile", None)
    if profile is None:
        return None
    return profile.role or None


def has_capability(user, cap: str) -> bool:
    role = canonical_role(role_of(user))
    if not role:
        return False
    return cap in ROLE_CAPABILITIES.get(role, frozenset())


def roles_with(cap: str) -> frozenset[str]:
    return frozenset(role for role, caps in ROLE_CAPABILITIES.items() if cap in caps)


def role_catalog() -> dict:
    """حمولة قراءة فقط للمشرف — الأدوار الثلاثة الأساسية + القدرات. O(R·C)."""
    capabilities = [{"id": key, "label": label} for key, label in CAPABILITY_LABELS.items()]
    roles = []
    for role_id in PRIMARY_ROLE_IDS:
        caps = sorted(ROLE_CAPABILITIES.get(role_id, frozenset()))
        roles.append({
            "id": role_id,
            "label": ROLE_LABELS[role_id],
            "description": ROLE_DESCRIPTIONS.get(role_id, ""),
            "capabilities": caps,
        })
    return {"roles": roles, "capabilities": capabilities}
