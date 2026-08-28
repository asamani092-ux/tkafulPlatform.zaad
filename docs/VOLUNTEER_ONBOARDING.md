# تسجيل المتطوّع — القبول والإدارة (2.5)

## لا يوجد `/Admin/users`

المنصّة لا تحتوي شاشة «إدارة مستخدمين» عامة. المسار مقسّم حسب نوع الحساب.

## مسار التسجيل الجديد (`/signup`)

```
زائر يملأ النموذج
    ↓
POST /api/accounts/auth/register/
    ↓
يُنشأ User + Profile (role=user, is_approved=false)
    ↓
دخول تلقائي JWT → /user/main
```

المتطوّع **مسجّل** لكن **غير معتمد** حتى يوافق المشرف.

## القبول (المشرف العام فقط)

| الخطوة | المسار | API |
|--------|--------|-----|
| 1 | `/Admin/volunteers/join-requests` | `GET /api/volunteer-requests/` |
| 2 | زر «قبول» | `POST /api/volunteer-requests/{id}/accept/` |
| 3 | زر «رفض» | `POST /api/volunteer-requests/{id}/reject/` |

بعد القبول: `profile.is_approved = true` → يظهر في `/Admin/volunteers`.

## إدارة المتطوّعين المعتمدين

| المسار | الغرض |
|--------|--------|
| `/Admin/volunteers` | قائمة المعتمدين + إحصاءات |
| `/Admin/volunteers/applications` | طلبات التطوع **على مشروع** (ليس تسجيل حساب جديد) |

## الفرق المهم

| الحدث | أين يُدار |
|-------|-----------|
| حساب جديد من `/signup` | `/Admin/volunteers/join-requests` |
| متطوّع يطلب الانضمام لمشروع | `/Admin/volunteers/applications` |
| إضافة عضو لمشروع (مدير مشروع) | `/Admin/projects` → أعضاء |

## تجربة UAT لـ 2.5

1. سجّل حساباً جديداً من `/signup`
2. ادخل كـ `admin@takaful.com`
3. افتح `/Admin/volunteers/join-requests` → قبول الحساب
4. تحقق من ظهوره في `/Admin/volunteers`
