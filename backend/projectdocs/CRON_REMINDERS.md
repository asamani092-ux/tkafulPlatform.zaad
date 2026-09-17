# تشغيل تذكيرات ملفات المشاريع يومياً عبر Cron (كولفاي / الخادم)

## الأمر

```bash
cd backend && ./venv/bin/python manage.py send_project_reminders
```

## ماذا يفعل

- يحدّث الحالات التلقائية للأنشطة.
- تذكير يومي لمدير المشروع عند وجود أنشطة جارية أو متعثرة.
- تقرير أسبوعي للراعي (يوم الأحد).
- تنبيه قبل شهر من تاريخ البدء المخطط لمرحلة التعريف.
- تنبيه إن بقيت أقسام الوثيقة فارغة قبل أسبوع من البدء.

## مثال Cron

```
0 7 * * * cd /app/backend && ./venv/bin/python manage.py send_project_reminders >> /var/log/project_reminders.log 2>&1
```

يتطلب ضبط `DEFAULT_FROM_EMAIL` وإعدادات SMTP في البيئة.
