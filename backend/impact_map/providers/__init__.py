"""طبقة مزوّدات بيانات الخارطة (Providers).

كل مشروع يسحب بياناته من وحدته الحيّة عبر مزوّد يُختار حسب `MapProject.source_type`.
الواجهة الموحّدة `MapDataProvider` تُعيد بيانات مجمّعة PDPL-safe فقط (بلا PII، قناع <5، تخشين GPS).
"""
from .base import MapDataProvider
from .registry import get_provider

__all__ = ["MapDataProvider", "get_provider"]
