# IMPACT_MAP.md — خارطة تفقدهم (Phase 2 MVP)

> **حالة:** MVP بتصاميم placeholder — بانتظار مراجعة العميل على العرض الحي.

## نظرة عامة

خارطة شفافية عامة (`/map`) تعرض تجميعات على مستوى **المنطقة فقط** — بدون أي بيانات شخصية للمتعهدين أو الأسر. لوحة إدارة (`/Admin/map`) لإدارة المناطق والمنتجات والمنافذ والتعهدات وسجلات التوزيع.

## قرارات placeholder (بانتظار تأكيد العميل)

| الموضوع | القرار الحالي | بدائل محتملة |
|---------|---------------|-------------|
| **النطاق الجغرافي** | 12 منطقة تجريبية في الرياض (إحداثيات تقريبية) | توسيع لمناطق أخرى / حدود GeoJSON دقيقة |
| **معايير الأولوية** | high / medium / low (أحمر / برتقالي / أخضر) | معايير مرتبطة بكثافة احتياج / فجوة تغطية |
| **رابط المتجر** | `EXTERNAL_STORE_URL` / `VITE_EXTERNAL_STORE_URL` — فارغ = شارة «تجريبي — بانتظار رابط المتجر» | رابط إنتاجي + معاملات `product` و `region` |
| **مستوى realtime** | تجميعات من `DistributionRecord` + cache 60 ثانية | WebSocket / polling / إلغاء cache |
| **الهوية البصرية** | Tajawal + ألوان design-system (#8b1538, #f2b824) | ضبط حسب دليل العلامة بعد المراجعة |

## API

| Method | Path | صلاحية | ملاحظات |
|--------|------|--------|---------|
| GET | `/api/map/summary/` | AllowAny | KPIs عامة |
| GET | `/api/map/regions/` | AllowAny | تجميعات منطقة؛ `families_served < 5` → `"<5"` |
| GET | `/api/map/products/` | AllowAny | منتجات نشطة |
| GET | `/api/map/outlets/` | AllowAny | منافذ نشطة |
| POST | `/api/map/contributions/` | AllowAny + throttle | تعهد توزيع ذاتي |
| CRUD | `/api/map/admin/*` | IsAdmin | كل النماذج الخمسة + approve/fulfill/cancel |

## خصوصية (غير قابل للتفاوض)

- لا تُعرَض أسماء/جوالات المتعهدين في أي endpoint عام.
- أي منطقة بعدد أسر `< 5` تُ serializ كسلسلة `"<5"`.
- التنفيذ: `impact_map/serializers.py` → `mask_families_count()`.

## بذور تجريبية

```bash
cd backend
./venv/bin/python manage.py seed_impact_map
```

Idempotent — آمن لإعادة التشغيل.

## Frontend

- **عام:** `/map` — react-leaflet، فلاتر منتجات، KPI، لوحة منطقة، modal تعهد (ذاتي / تفويض).
- **إدارة:** `/Admin/map` — تبويبات CRUD.
- **Chunk:** `impact-map` (< 250KB مع leaflet منفصل).

## مرجع UX

تجربة مشابهة لـ [zakatfitr.click](https://zakatfitr.click/) — خريطة عربية تفاعلية mobile-first.
