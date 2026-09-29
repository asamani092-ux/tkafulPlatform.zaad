# Generated manually — تبويب الاعتمادات + حقول طلب الاعتماد متعدد

from django.db import migrations, models


def add_approvals_workspace(apps, schema_editor):
    ProjectDossier = apps.get_model("projectdocs", "ProjectDossier")
    DossierWorkspace = apps.get_model("projectdocs", "DossierWorkspace")
    DossierSection = apps.get_model("projectdocs", "DossierSection")

    for dossier in ProjectDossier.objects.all():
        board = DossierWorkspace.objects.filter(dossier=dossier, key="board").first()
        if board and board.order == 5:
            board.order = 6
            board.save(update_fields=["order"])
        if not DossierWorkspace.objects.filter(dossier=dossier, key="approvals").exists():
            status = "locked"
            closure = DossierWorkspace.objects.filter(dossier=dossier, key="closure").first()
            if closure and closure.status == "approved":
                status = "active"
            DossierWorkspace.objects.create(
                dossier=dossier,
                order=5,
                key="approvals",
                status=status,
            )
        if not DossierSection.objects.filter(dossier=dossier, kind="approvals", key="approvals_record").exists():
            DossierSection.objects.create(
                dossier=dossier,
                kind="approvals",
                key="approvals_record",
                data={},
                status="empty",
            )
        if not DossierSection.objects.filter(dossier=dossier, kind="document", key="framework_bundle").exists():
            DossierSection.objects.create(
                dossier=dossier,
                kind="document",
                key="framework_bundle",
                data={},
                status="empty",
            )


class Migration(migrations.Migration):

    dependencies = [
        ("projectdocs", "0009_stageactivity_responsible_user"),
    ]

    operations = [
        migrations.AddField(
            model_name="approvalrequest",
            name="approver_row_id",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="approvalrequest",
            name="recipient_email",
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name="approvalrequest",
            name="recipient_name",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AlterField(
            model_name="approvalrequest",
            name="scope",
            field=models.CharField(
                choices=[
                    ("card", "البطاقة"),
                    ("stage", "مرحلة"),
                    ("document", "الوثيقة"),
                    ("plan", "الخطة التنفيذية"),
                    ("closure", "الإغلاق"),
                    ("approvals", "الاعتمادات"),
                    ("board", "لوحة المشروع"),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="dossierworkspace",
            name="key",
            field=models.CharField(
                choices=[
                    ("card", "البطاقة"),
                    ("document", "الوثيقة"),
                    ("plan", "الخطة التنفيذية"),
                    ("closure", "الإغلاق"),
                    ("approvals", "الاعتمادات"),
                    ("board", "لوحة المشروع"),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(add_approvals_workspace, migrations.RunPython.noop),
    ]
