"""
محلّل إحداثيات متساهل (UX2 P4 · الخرائط 3.7).

يقبل أي صيغة رابط/نص شائعة ويستخرج (lat, lng):
- خام: "24.7136, 46.6753" · "24.7136 46.6753" · "lat=..&lng=.."
- روابط Google Maps: ".../@24.71,46.67,15z" · "?q=24.71,46.67" · "/place/.../@.." · "!3d24.71!4d46.67"
- روابط عامة: "geo:24.71,46.67" · "maps.apple.com/?ll=24.71,46.67"

التطبيع/التحقق على الخادم (نطاق WGS-84). كن متساهلاً في القبول، صارماً في التطبيع.

O(1) لكل إدخال (عدد الأنماط ثابت).
"""
import re
from typing import Optional, Tuple

# رقم عشري بإشارة اختيارية
_NUM = r"[-+]?\d{1,3}(?:\.\d+)?"

# أنماط مرتبة حسب الأولوية (الأدق أولاً)
_PATTERNS = [
    # Google: !3d<lat>!4d<lng>
    re.compile(rf"!3d({_NUM})!4d({_NUM})"),
    # Google: @<lat>,<lng>(,zoom)
    re.compile(rf"@({_NUM}),({_NUM})"),
    # معاملات استعلام: q= / ll= / query= / center= = "<lat>,<lng>"
    re.compile(rf"(?:[?&](?:q|ll|query|center|destination|sll)=)({_NUM}),({_NUM})", re.IGNORECASE),
    # lat=..&lng=.. (بأي ترتيب يُعالج لاحقاً)
    # geo:<lat>,<lng>
    re.compile(rf"geo:({_NUM}),({_NUM})", re.IGNORECASE),
    # خام: "<lat>,<lng>" أو "<lat> <lng>" أو "<lat>؛<lng>"
    re.compile(rf"^\s*({_NUM})\s*[,;،\s]\s*({_NUM})\s*$"),
]

_LAT_KV = re.compile(rf"lat(?:itude)?\s*[=:]\s*({_NUM})", re.IGNORECASE)
_LNG_KV = re.compile(rf"(?:lng|lon|longitude)\s*[=:]\s*({_NUM})", re.IGNORECASE)


def _valid(lat: float, lng: float) -> bool:
    return -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0


def parse_coordinates(raw) -> Optional[Tuple[float, float]]:
    """
    يعيد (lat, lng) منسّقة ضمن نطاق WGS-84، أو None إذا تعذّر الاستخراج/تجاوز النطاق.
    لا يرمي استثناءً — الاستدعاء يقرّر رسالة الخطأ.
    """
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None

    # 1) مفاتيح lat/lng منفصلة (أي ترتيب)
    lat_kv = _LAT_KV.search(text)
    lng_kv = _LNG_KV.search(text)
    if lat_kv and lng_kv:
        try:
            lat, lng = float(lat_kv.group(1)), float(lng_kv.group(1))
            if _valid(lat, lng):
                return (lat, lng)
        except ValueError:
            pass

    # 2) الأنماط الموضعية
    for pat in _PATTERNS:
        m = pat.search(text)
        if m:
            try:
                lat, lng = float(m.group(1)), float(m.group(2))
            except ValueError:
                continue
            if _valid(lat, lng):
                return (lat, lng)
            # قد تكون القيم مقلوبة (lng, lat) في بعض الروابط
            if _valid(lng, lat):
                return (lng, lat)
    return None
