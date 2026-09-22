"""
كتالوج أقسام وثيقة المشروع ووثيقة الإغلاق.
مصدر واحد للتحقق في الخادم والعرض في الواجهة (نمط tool_config).
التعقيد: التحقق O(F) لكل قسم؛ schema_payload O(S·F).
"""
from __future__ import annotations

from rest_framework import serializers

# تبويبات ملف المشروع — سلسلة الاعتماد (الإكسل: بطاقة/وثيقة/خطة/إغلاق + لوحة)
# البطاقة بلا اعتماد؛ الباقي متسلسل لعمل الموظف.
WORKSPACES = (
    {"order": 1, "key": "card", "label": "البطاقة", "needs_approval": False},
    {"order": 2, "key": "document", "label": "الوثيقة", "needs_approval": True},
    {"order": 3, "key": "plan", "label": "الخطة التنفيذية", "needs_approval": True},
    {"order": 4, "key": "closure", "label": "الإغلاق", "needs_approval": True},
    {"order": 5, "key": "board", "label": "لوحة المشروع", "needs_approval": True},
)

# مراحل المحتوى داخل الوثيقة — مؤشر مكان فقط (ليست بوابات اعتماد)
STAGES = (
    {"order": 1, "key": "define", "label": "تحديد وتعريف المشروع"},
    {"order": 2, "key": "prepare", "label": "إعداد المشروع"},
    {"order": 3, "key": "plan", "label": "التخطيط للمشروع"},
    {"order": 4, "key": "execute", "label": "تنفيذ المشروع"},
    {"order": 5, "key": "close", "label": "إغلاق المشروع"},
)

FieldDef = dict  # key, type, label, required?, options?, columns?


def _f(key: str, label: str, type_: str = "text", **extra) -> FieldDef:
    d: FieldDef = {"key": key, "label": label, "type": type_}
    d.update(extra)
    return d


def _table(key: str, label: str, columns: list[dict], **extra) -> FieldDef:
    return _f(key, label, "table", columns=columns, **extra)


def _sections_for_kind(kind: str) -> list[dict]:
    if kind == "document":
        return DOCUMENT_SECTIONS
    if kind == "closure":
        return CLOSURE_SECTIONS
    if kind == "card":
        return CARD_SECTIONS
    return []


# أقسام تبويب البطاقة (قائمة المنصة — الإكسل للمراجعة فقط)
CARD_SECTIONS: list[dict] = [
    {
        "key": "indicators",
        "label": "المؤشرات",
        "stage": "card",
        "fields": [
            _table(
                "rows",
                "المؤشرات",
                [
                    {"key": "goal", "label": "الهدف"},
                    {"key": "indicator_name", "label": "اسم المؤشر"},
                    {"key": "target", "label": "المستهدف"},
                ],
            ),
        ],
    },
    {
        "key": "phases",
        "label": "المراحل",
        "stage": "card",
        "fields": [
            _table(
                "rows",
                "المراحل",
                [
                    {"key": "activity_type", "label": "نوع النشاط"},
                    {"key": "executor", "label": "المنفذ"},
                    {"key": "start_date", "label": "تاريخ البداية", "type": "date"},
                    {"key": "end_date", "label": "تاريخ الإغلاق", "type": "date"},
                    {"key": "output", "label": "المخرج"},
                    {"key": "budget_association", "label": "من الجمعية", "type": "number", "group": "budget"},
                    {"key": "budget_donation", "label": "من المتبرع", "type": "number", "group": "budget"},
                    {
                        "key": "budget_total",
                        "label": "إجمالي المخصص",
                        "type": "number",
                        "group": "budget",
                        "computed": "sum:budget_association,budget_donation",
                        "readonly": True,
                    },
                ],
                header_groups=[{"key": "budget", "label": "المخصص المالي"}],
            ),
        ],
    },
    {
        "key": "outputs",
        "label": "المخرجات",
        "stage": "card",
        "fields": [
            _table(
                "rows",
                "المخرجات",
                [
                    {"key": "direct", "label": "مباشرة"},
                    {"key": "indirect", "label": "غير مباشرة"},
                ],
            ),
        ],
    },
    {
        "key": "similar_experiences",
        "label": "التجارب الشبيهة",
        "stage": "card",
        "fields": [
            _table(
                "rows",
                "التجارب الشبيهة",
                [
                    {"key": "org", "label": "الجهة المنفذة"},
                    {"key": "project_name", "label": "اسم المشروع"},
                    {"key": "highlight", "label": "أبرز ما يميز التجربة"},
                    {"key": "addition_point", "label": "نقطة إضافة التجربة الشبيهة في المشروع"},
                ],
            ),
        ],
    },
    {
        "key": "project_budget",
        "label": "المخصص المالي لكامل المشروع",
        "stage": "card",
        "fields": [
            _table(
                "rows",
                "المخصص المالي لكامل المشروع",
                [
                    {"key": "from_association", "label": "من الجمعية", "type": "number"},
                    {"key": "from_donation", "label": "من التبرع", "type": "number"},
                    {
                        "key": "total",
                        "label": "الاجمالي",
                        "type": "number",
                        "computed": "sum:from_association,from_donation",
                        "readonly": True,
                    },
                ],
            ),
        ],
    },
]


DOCUMENT_SECTIONS: list[dict] = [
    {
        "key": "basics",
        "label": "البيانات الأساسية",
        "stage": "define",
        "fields": [
            _f("project_name", "اسم المشروع", required=True),
            _f("marketing_name", "الاسم التسويقي"),
            _f("code", "الرمز الداخلي"),
            _f("portfolio", "المحفظة"),
            _f("department", "الإدارة"),
            _f("section", "القسم"),
            _f("location", "الموقع"),
            _f("strategic_goal", "الهدف الاستراتيجي", "textarea"),
            _f("sponsor_name", "مدير الإدارة (الراعي)"),
            _f("projects_office", "مكتب المشاريع", "text"),
            _f("projects_committee", "لجنة المشاريع", "text"),
            _f("start_date", "تاريخ البدء المخطط", "date"),
            _f("end_date", "تاريخ الإغلاق المخطط", "date"),
        ],
    },
    {
        "key": "mgmt_kpis",
        "label": "مؤشرات الإدارة",
        "stage": "define",
        "fields": [
            _table(
                "indicators",
                "المؤشرات",
                [
                    {"key": "name", "label": "المؤشر"},
                    {"key": "baseline", "label": "خط الأساس"},
                    {"key": "target", "label": "المستهدف"},
                    {"key": "unit", "label": "وحدة القياس"},
                ],
            ),
        ],
    },
    {
        "key": "logical_framework",
        "label": "الإطار المنطقي",
        "stage": "define",
        "fields": [
            _f("goal", "الهدف العام", "textarea"),
            _f("outcomes", "النتائج", "textarea"),
            _f("outputs", "المخرجات", "textarea"),
            _f("assumptions", "الافتراضات", "textarea"),
        ],
    },
    {
        "key": "outputs_quality",
        "label": "مخرجات المشروع وتطلعات الجودة",
        "stage": "prepare",
        "fields": [
            _table(
                "outputs",
                "المخرجات",
                [
                    {"key": "output", "label": "المخرج"},
                    {"key": "quality", "label": "معيار الجودة"},
                    {"key": "measure", "label": "طريقة القياس"},
                ],
            ),
        ],
    },
    {
        "key": "main_phases",
        "label": "المراحل الرئيسية",
        "stage": "prepare",
        "fields": [
            _table(
                "phases",
                "المراحل",
                [
                    {"key": "name", "label": "المرحلة"},
                    {"key": "start", "label": "البداية"},
                    {"key": "end", "label": "النهاية"},
                    {"key": "deliverable", "label": "التسليم"},
                ],
            ),
        ],
    },
    {
        "key": "objectives_kpis",
        "label": "أهداف المشروع ومؤشراتها",
        "stage": "plan",
        "fields": [
            _table(
                "objectives",
                "الأهداف",
                [
                    {"key": "objective", "label": "الهدف"},
                    {"key": "kpi", "label": "المؤشر"},
                    {"key": "target", "label": "المستهدف"},
                    {"key": "source", "label": "مصدر التحقق"},
                ],
            ),
        ],
    },
    {
        "key": "aspirations",
        "label": "تطلعات المشروع",
        "stage": "plan",
        "fields": [
            _f("short_term", "تطلعات قصيرة المدى", "textarea"),
            _f("long_term", "تطلعات طويلة المدى", "textarea"),
            _f("impact", "الأثر المتوقع", "textarea"),
        ],
    },
    {
        "key": "similar_experiences",
        "label": "التجارب الشبيهة",
        "stage": "plan",
        "fields": [
            _table(
                "experiences",
                "التجارب",
                [
                    {"key": "name", "label": "التجربة"},
                    {"key": "org", "label": "الجهة"},
                    {"key": "lesson", "label": "الدرس المستفاد"},
                ],
            ),
        ],
    },
    {
        "key": "beneficiaries",
        "label": "الفئة والمستفيدون",
        "stage": "plan",
        "fields": [
            _f("primary_group", "الفئة المستهدفة", "textarea"),
            _f("count_estimate", "العدد التقديري", "number"),
            _f("selection_criteria", "معايير الاختيار", "textarea"),
            _f("geography", "النطاق الجغرافي"),
        ],
    },
    {
        "key": "risks",
        "label": "المخاطر والاستجابة",
        "stage": "plan",
        "fields": [
            _table(
                "risks",
                "المخاطر",
                [
                    {"key": "risk", "label": "الخطر"},
                    {"key": "probability", "label": "الاحتمال"},
                    {"key": "impact", "label": "الأثر"},
                    {"key": "response", "label": "الاستجابة"},
                    {"key": "owner", "label": "المسؤول"},
                ],
            ),
        ],
    },
    {
        "key": "team",
        "label": "فريق العمل",
        "stage": "prepare",
        "fields": [
            _table(
                "members",
                "الأعضاء",
                [
                    {"key": "name", "label": "الاسم"},
                    {"key": "role", "label": "الدور"},
                    {"key": "responsibility", "label": "المسؤولية"},
                    {"key": "contact", "label": "التواصل"},
                ],
            ),
        ],
    },
    {
        "key": "volunteers",
        "label": "المتطوعون",
        "stage": "execute",
        "fields": [
            _f("needed_count", "العدد المطلوب", "number"),
            _f("roles", "الأدوار التطوعية", "textarea"),
            _f("onboarding", "آلية الاستقطاب والتأهيل", "textarea"),
        ],
    },
    {
        "key": "stakeholders",
        "label": "أصحاب المصلحة",
        "stage": "prepare",
        "fields": [
            _table(
                "stakeholders",
                "أصحاب المصلحة",
                [
                    {"key": "name", "label": "الجهة/الشخص"},
                    {"key": "interest", "label": "المصلحة"},
                    {"key": "influence", "label": "التأثير"},
                    {"key": "engagement", "label": "أسلوب التواصل"},
                ],
            ),
        ],
    },
    {
        "key": "partnerships",
        "label": "الشراكات",
        "stage": "execute",
        "fields": [
            _table(
                "partners",
                "الشركاء",
                [
                    {"key": "name", "label": "الشريك"},
                    {"key": "role", "label": "الدور"},
                    {"key": "contribution", "label": "المساهمة"},
                ],
            ),
        ],
    },
    {
        "key": "budget",
        "label": "المخصص وتكلفة المشروع",
        "stage": "plan",
        "fields": [
            _f("association_budget", "مخصص الجمعية", "number"),
            _f("donation_budget", "مخصص التبرعات", "number"),
            _f("total_budget", "الإجمالي", "number"),
            _table(
                "lines",
                "بنود التكلفة",
                [
                    {"key": "item", "label": "البند"},
                    {"key": "amount", "label": "المبلغ"},
                    {"key": "source", "label": "المصدر"},
                    {"key": "notes", "label": "ملاحظات"},
                ],
            ),
        ],
    },
]

CLOSURE_SECTIONS: list[dict] = [
    {
        "key": "closure_basics",
        "label": "البيانات الأساسية",
        "stage": "close",
        "fields": [
            _f("actual_start", "تاريخ البدء الفعلي", "date"),
            _f("actual_end", "تاريخ الإغلاق الفعلي", "date"),
            _f("summary", "ملخص الإغلاق", "textarea"),
        ],
    },
    {
        "key": "closure_team",
        "label": "فريق العمل",
        "stage": "close",
        "fields": [
            _table(
                "members",
                "الفريق النهائي",
                [
                    {"key": "name", "label": "الاسم"},
                    {"key": "role", "label": "الدور"},
                    {"key": "contribution", "label": "الإسهام"},
                ],
            ),
        ],
    },
    {
        "key": "volunteer_contributions",
        "label": "إسهامات المتطوعين",
        "stage": "close",
        "fields": [
            _f("volunteer_count", "عدد المتطوعين", "number"),
            _f("hours", "إجمالي الساعات", "number"),
            _f("highlights", "أبرز الإسهامات", "textarea"),
        ],
    },
    {
        "key": "scope_measure",
        "label": "قياس النطاق",
        "stage": "close",
        "fields": [
            _f("planned_scope", "النطاق المخطط", "textarea"),
            _f("actual_scope", "النطاق المنفّذ", "textarea"),
            _f("variance", "الانحراف وأسبابه", "textarea"),
        ],
    },
    {
        "key": "time_performance",
        "label": "الأداء الزمني",
        "stage": "close",
        "fields": [
            _f("planned_duration_days", "المدة المخططة (أيام)", "number"),
            _f("actual_duration_days", "المدة الفعلية (أيام)", "number"),
            _f("schedule_notes", "ملاحظات الجدول", "textarea"),
        ],
    },
    {
        "key": "financial_performance",
        "label": "الأداء المالي",
        "stage": "close",
        "fields": [
            _f("planned_budget", "الميزانية المخططة", "number"),
            _f("actual_spend", "الإنفاق الفعلي", "number"),
            _f("variance_amount", "الانحراف المالي", "number"),
            _f("notes", "ملاحظات", "textarea"),
        ],
    },
    {
        "key": "risk_log",
        "label": "سجل المخاطر",
        "stage": "close",
        "fields": [
            _table(
                "risks",
                "المخاطر المتحققة",
                [
                    {"key": "risk", "label": "الخطر"},
                    {"key": "occurred", "label": "هل تحقق؟"},
                    {"key": "response", "label": "الاستجابة"},
                    {"key": "result", "label": "النتيجة"},
                ],
            ),
        ],
    },
    {
        "key": "lessons_learned",
        "label": "الدروس المستفادة",
        "stage": "close",
        "fields": [
            _table(
                "lessons",
                "الدروس",
                [
                    {"key": "activity_code", "label": "رمز النشاط"},
                    {"key": "lesson", "label": "الدرس"},
                    {"key": "recommendation", "label": "التوصية"},
                ],
            ),
            _f("general_notes", "ملاحظات عامة", "textarea"),
        ],
    },
    {
        "key": "stakeholder_satisfaction",
        "label": "رضا أصحاب المصلحة",
        "stage": "close",
        "fields": [
            _table(
                "ratings",
                "التقييمات",
                [
                    {"key": "stakeholder", "label": "صاحب المصلحة"},
                    {"key": "rating", "label": "التقييم"},
                    {"key": "comment", "label": "تعليق"},
                ],
            ),
        ],
    },
    {
        "key": "approvals_record",
        "label": "الاعتمادات",
        "stage": "close",
        "fields": [
            _f("sponsor_decision", "قرار الراعي"),
            _f("sponsor_date", "تاريخ الاعتماد", "date"),
            _f("notes", "ملاحظات الاعتماد", "textarea"),
        ],
    },
    {
        "key": "final_cost",
        "label": "التكلفة النهائية",
        "stage": "close",
        "fields": [
            _f("final_total", "التكلفة النهائية", "number"),
            _f("association_share", "حصة الجمعية", "number"),
            _f("donation_share", "حصة التبرعات", "number"),
            _f("notes", "ملاحظات", "textarea"),
        ],
    },
]


def _section_map(kind: str) -> dict[str, dict]:
    return {s["key"]: s for s in _sections_for_kind(kind)}


def get_section_def(kind: str, key: str) -> dict | None:
    return _section_map(kind).get(key)


def sections_for_stage(kind: str, stage_key: str) -> list[dict]:
    return [s for s in _sections_for_kind(kind) if s.get("stage") == stage_key]


def all_section_keys(kind: str) -> list[str]:
    return [s["key"] for s in _sections_for_kind(kind)]


def validate_section_data(kind: str, key: str, data: dict) -> dict:
    """يرجع البيانات المنظّفة أو يرفع ValidationError. O(F)."""
    section = get_section_def(kind, key)
    if not section:
        raise serializers.ValidationError({"key": "قسم غير معروف"})
    if not isinstance(data, dict):
        raise serializers.ValidationError({"data": "يجب أن يكون كائناً"})
    cleaned: dict = {}
    allowed = {f["key"]: f for f in section["fields"]}
    unknown = set(data.keys()) - set(allowed.keys())
    if unknown:
        raise serializers.ValidationError({"data": f"مفاتيح غير مسموحة: {', '.join(sorted(unknown))}"})
    for fkey, fdef in allowed.items():
        if fkey not in data:
            continue
        val = data[fkey]
        cleaned[fkey] = _coerce_field(fdef, val)
    return cleaned


def _coerce_field(fdef: FieldDef, val):
    t = fdef["type"]
    if val is None or val == "":
        if fdef.get("required"):
            raise serializers.ValidationError({fdef["key"]: "مطلوب"})
        return "" if t != "table" else []
    if t == "number":
        try:
            return float(val)
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError({fdef["key"]: "رقم غير صالح"}) from exc
    if t == "select":
        opts = fdef.get("options") or []
        if opts and val not in opts:
            raise serializers.ValidationError({fdef["key"]: "قيمة غير مسموحة"})
        return str(val)
    if t == "table":
        if not isinstance(val, list):
            raise serializers.ValidationError({fdef["key"]: "يجب أن يكون جدولاً"})
        col_defs = {c["key"]: c for c in fdef.get("columns") or []}
        rows = []
        for i, row in enumerate(val):
            if not isinstance(row, dict):
                raise serializers.ValidationError({fdef["key"]: f"صف {i + 1} غير صالح"})
            cleaned_row = {}
            for col_key, col_def in col_defs.items():
                if col_def.get("computed"):
                    continue
                cell = row.get(col_key)
                ctype = col_def.get("type") or "text"
                if ctype == "number":
                    if cell is None or cell == "":
                        cleaned_row[col_key] = 0
                    else:
                        try:
                            cleaned_row[col_key] = float(cell)
                        except (TypeError, ValueError) as exc:
                            raise serializers.ValidationError(
                                {fdef["key"]: f"صف {i + 1}: رقم غير صالح لـ {col_def.get('label') or col_key}"}
                            ) from exc
                else:
                    cleaned_row[col_key] = "" if cell is None else str(cell)
            for col_key, col_def in col_defs.items():
                computed = col_def.get("computed") or ""
                if computed.startswith("sum:"):
                    parts = [p.strip() for p in computed[4:].split(",") if p.strip()]
                    cleaned_row[col_key] = float(sum(float(cleaned_row.get(p) or 0) for p in parts))
            rows.append(cleaned_row)
        return rows
    return str(val)


def section_is_filled(data: dict) -> bool:
    if not data:
        return False
    for v in data.values():
        if isinstance(v, list) and v:
            return True
        if isinstance(v, (int, float)) and v != 0:
            return True
        if isinstance(v, str) and v.strip():
            return True
    return False


def schema_payload() -> dict:
    """مخطط للواجهة. O(S·F)."""
    def pack(sections: list[dict]) -> list[dict]:
        out = []
        for s in sections:
            fields = []
            for f in s["fields"]:
                packed = dict(f)
                fields.append(packed)
            out.append(
                {
                    "key": s["key"],
                    "label": s["label"],
                    "stage": s["stage"],
                    "fields": fields,
                }
            )
        return out

    return {
        "stages": list(STAGES),
        "workspaces": list(WORKSPACES),
        "document": pack(DOCUMENT_SECTIONS),
        "closure": pack(CLOSURE_SECTIONS),
        "card": pack(CARD_SECTIONS),
    }
