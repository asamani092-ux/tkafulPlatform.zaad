"""
طبقة تكامل موحّدة لاستقبال المصادر الخارجية (المشروع الثاني GAS، والمشروع الثالث لاحقاً).

الفكرة: كل مستورد مصدر خارجي يرث BaseImporter ويستفيد من upsert idempotent
المعتمد على (external_source, external_id)، فلا تتكرر السجلات عند إعادة المزامنة،
وتبقى المعرّفات الداخلية مستقرة (مبدأ الإضافة التراكمية لا الاستبدال).

ملاحظة: المستورد الحالي analytics/management/commands/import_gas_data.py يبقى كما هو؛
هذه الطبقة هي الموطن الموحّد للمستوردات الجديدة (انظر backend/INTEGRATIONS.md).

التعقيد: upsert واحد = O(1) (بحث مفهرس على external_id)، واستيراد دفعة = O(R).
"""
from __future__ import annotations

from typing import Any


class BaseImporter:
    """
    مستورد أساس لمصدر خارجي.

    الاستخدام:
        class ProjectXImporter(BaseImporter):
            source = "projectx"

            def run(self, data):
                for row in data.get("users", []):
                    self.upsert(SomeModel, external_id=str(row["id"]), defaults={...})
    """

    #: معرّف المصدر، يُكتب في حقل external_source (مثل "gas", "projectx").
    source: str = ""

    def __init__(self, source: str | None = None) -> None:
        if source:
            self.source = source
        if not self.source:
            raise ValueError("Importer.source must be set (e.g. 'gas', 'projectx').")
        self.stats: dict[str, int] = {}

    def upsert(self, model: Any, external_id: str, defaults: dict[str, Any]):
        """
        إنشاء أو تحديث سجل واحد بشكل idempotent على (external_source, external_id).
        يتطلّب أن يملك الموديل الحقلين external_source و external_id.
        """
        obj, created = model.objects.update_or_create(
            external_source=self.source,
            external_id=str(external_id),
            defaults=defaults,
        )
        key = model.__name__
        self.stats[key] = self.stats.get(key, 0) + 1
        return obj, created

    def run(self, data: dict[str, Any]) -> dict[str, int]:
        """تنفيذ الاستيراد. تُعاد كتابته في كل مستورد فرعي."""
        raise NotImplementedError
