"""
عقد حقول ديناميكية مشترك (نماذج الطلبات + أنواع الكفالات).
صيغة الحقل: { key, label, type, required, options?, is_public? }
الأنواع: text | textarea | number | select | boolean | date
"""
from __future__ import annotations

FIELD_TYPES = ("text", "textarea", "number", "select", "boolean", "date")


def validate_fields_schema(schema) -> list:
    """يتحقق من مخطط الحقول أو يرمي ValueError. يعيد قائمة منظّفة."""
    if schema in (None, ""):
        return []
    if not isinstance(schema, list):
        raise ValueError("مخطط الحقول يجب أن يكون قائمة")
    seen: set[str] = set()
    cleaned: list[dict] = []
    for i, field in enumerate(schema):
        if not isinstance(field, dict):
            raise ValueError(f"الحقل رقم {i + 1} غير صالح")
        key = str(field.get("key") or "").strip()
        label = str(field.get("label") or "").strip()
        if not key:
            raise ValueError(f"الحقل رقم {i + 1}: المفتاح مطلوب")
        if key in seen:
            raise ValueError(f"مفتاح مكرّر: {key}")
        seen.add(key)
        if not label:
            raise ValueError(f"الحقل «{key}»: التسمية مطلوبة")
        ftype = field.get("type") or "text"
        if ftype not in FIELD_TYPES:
            raise ValueError(f"الحقل «{key}»: نوع غير مدعوم ({ftype})")
        entry = {
            "key": key,
            "label": label,
            "type": ftype,
            "required": bool(field.get("required")),
            "is_public": bool(field.get("is_public", True)),
        }
        if ftype == "select":
            options = field.get("options") or []
            if not isinstance(options, list) or not options:
                raise ValueError(f"الحقل «{key}»: خيارات القائمة مطلوبة")
            entry["options"] = [str(o) for o in options]
        cleaned.append(entry)
    return cleaned


def validate_submission(schema, data) -> dict:
    """يتحقق من قيم الإرسال مقابل المخطط — مثل RequestForm.validate_submission."""
    if data in (None, ""):
        data = {}
    if not isinstance(data, dict):
        raise ValueError("بيانات الحقول يجب أن تكون كائناً")
    schema = schema if isinstance(schema, list) else []
    cleaned: dict = {}
    for field in schema:
        if not isinstance(field, dict):
            continue
        key = field.get("key")
        if not key:
            continue
        ftype = field.get("type", "text")
        required = bool(field.get("required"))
        raw = data.get(key, "")
        empty = raw in (None, "") or (isinstance(raw, str) and not raw.strip())
        if empty:
            if required:
                raise ValueError(f"الحقل «{field.get('label') or key}» مطلوب")
            continue
        if ftype == "number":
            try:
                cleaned[key] = float(raw)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"الحقل «{field.get('label') or key}» يجب أن يكون رقماً") from exc
        elif ftype == "boolean":
            cleaned[key] = raw in (True, "true", "1", 1, "نعم", "yes")
        elif ftype == "select":
            options = field.get("options") or []
            if options and str(raw) not in [str(o) for o in options]:
                raise ValueError(f"قيمة غير صالحة للحقل «{field.get('label') or key}»")
            cleaned[key] = raw
        else:
            cleaned[key] = raw
    return cleaned


def public_fields_only(schema) -> list:
    """يعيد الحقول المعلّمة للعرض العام فقط."""
    if not isinstance(schema, list):
        return []
    return [f for f in schema if isinstance(f, dict) and f.get("is_public", True)]
