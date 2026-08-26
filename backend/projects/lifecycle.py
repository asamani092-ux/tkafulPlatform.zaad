"""
دورة حياة المشروع — خريطة انتقالات قانونية واحدة (مصدر حقيقة).
draft → active → completed → archived، مع reopen من completed/archived إلى active.
التعقيد: can_transition / next_actions ثابتة O(1).
"""
from __future__ import annotations

STATUS_DRAFT = "draft"
STATUS_ACTIVE = "active"
STATUS_COMPLETED = "completed"
STATUS_ARCHIVED = "archived"

# الحالات التي تظهر للجمهور (الموقع العام + مجمّع الخرائط)
PUBLIC_STATUSES = (STATUS_ACTIVE,)

# اسم الإجراء → (الحالات المسموح الانتقال منها، الحالة الهدف)
TRANSITIONS: dict[str, tuple[tuple[str, ...], str]] = {
    "activate": ((STATUS_DRAFT, STATUS_COMPLETED), STATUS_ACTIVE),
    "complete": ((STATUS_ACTIVE,), STATUS_COMPLETED),
    "archive": ((STATUS_DRAFT, STATUS_ACTIVE, STATUS_COMPLETED, STATUS_ARCHIVED), STATUS_ARCHIVED),
    "reopen": ((STATUS_COMPLETED, STATUS_ARCHIVED), STATUS_ACTIVE),
}

# خريطة الانتقالات القانونية: الحالة الحالية → مجموعة الحالات الهدف المسموحة
ALLOWED_TRANSITIONS: dict[str, set[str]] = {}
for _action, (_froms, _to) in TRANSITIONS.items():
    for _from in _froms:
        ALLOWED_TRANSITIONS.setdefault(_from, set()).add(_to)

ACTION_LABELS_AR = {
    "activate": "تفعيل",
    "complete": "إكمال",
    "archive": "أرشفة",
    "reopen": "إعادة فتح",
}


def target_status(action: str) -> str | None:
    entry = TRANSITIONS.get(action)
    return entry[1] if entry else None


def can_transition(current: str, action: str) -> bool:
    entry = TRANSITIONS.get(action)
    if not entry:
        return False
    froms, to = entry
    if current not in froms:
        return False
    # الأرشفة من أرشيف لا معنى لها (idempotent) — نمنعها لتفادي سجلّات فارغة
    if current == to:
        return False
    return True


def next_actions(current: str) -> list[str]:
    """الإجراءات القانونية المتاحة من الحالة الحالية — للواجهة."""
    return [action for action in TRANSITIONS if can_transition(current, action)]
