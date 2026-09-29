# إزالة قسم اعتمادات الإغلاق القديم بعد ترحيل البيانات إلى تبويب الاعتمادات

from django.db import migrations


def drop_legacy_closure_approvals(apps, schema_editor):
    DossierSection = apps.get_model("projectdocs", "DossierSection")
    ProjectDossier = apps.get_model("projectdocs", "ProjectDossier")

    for dossier in ProjectDossier.objects.all():
        old = DossierSection.objects.filter(dossier=dossier, kind="closure", key="approvals_record").first()
        if not old:
            continue
        approvals = DossierSection.objects.filter(dossier=dossier, kind="approvals", key="approvals_record").first()
        if approvals and not (approvals.data or {}).get("rows"):
            od = old.data or {}
            rows = []
            if od.get("sponsor_decision") or od.get("sponsor_date") or od.get("notes"):
                rows.append(
                    {
                        "row_id": "legacy",
                        "role_title": "مدير الإدارة",
                        "name": dossier.sponsor_name or "",
                        "email": dossier.sponsor_email or "",
                        "status": "approved" if od.get("sponsor_decision") else "pending",
                        "decided_at": str(od.get("sponsor_date") or ""),
                        "rejection_reason": "",
                    }
                )
            if rows:
                approvals.data = {"rows": rows}
                approvals.status = "filled"
                approvals.save(update_fields=["data", "status", "updated_at"])
        old.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("projectdocs", "0010_approvals_workspace_framework"),
    ]

    operations = [
        migrations.RunPython(drop_legacy_closure_approvals, migrations.RunPython.noop),
    ]
