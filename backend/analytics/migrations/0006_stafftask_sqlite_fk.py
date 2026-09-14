# SQLite: recreate stafftask table with FK → projects_project (state already correct)

from django.db import migrations


def fix_sqlite_fk(apps, schema_editor):
    if schema_editor.connection.vendor != "sqlite":
        return
    schema_editor.execute("""
        CREATE TABLE "new__analytics_stafftask" (
            "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
            "title" varchar(200) NOT NULL,
            "initiative" varchar(200) NOT NULL,
            "completed_date" date NULL,
            "progress" integer NOT NULL,
            "external_source" varchar(50) NOT NULL,
            "external_id" varchar(100) NOT NULL,
            "created_at" datetime NOT NULL,
            "employee_id" bigint NULL REFERENCES "analytics_employee" ("id") DEFERRABLE INITIALLY DEFERRED,
            "project_id" bigint NULL REFERENCES "projects_project" ("id") DEFERRABLE INITIALLY DEFERRED
        )
    """)
    schema_editor.execute("""
        INSERT INTO "new__analytics_stafftask"
        SELECT id, title, initiative, completed_date, progress, external_source, external_id,
               created_at, employee_id, project_id FROM analytics_stafftask
    """)
    schema_editor.execute('DROP TABLE "analytics_stafftask"')
    schema_editor.execute('ALTER TABLE "new__analytics_stafftask" RENAME TO "analytics_stafftask"')
    schema_editor.execute(
        'CREATE UNIQUE INDEX "uq_staff_task_external" ON "analytics_stafftask" '
        '("external_source", "external_id") WHERE NOT ("external_id" = \'\')'
    )
    schema_editor.execute(
        'CREATE INDEX "analytics_stafftask_employee_id_3d69050c" ON "analytics_stafftask" ("employee_id")'
    )
    schema_editor.execute(
        'CREATE INDEX "analytics_stafftask_project_id_286eadc9" ON "analytics_stafftask" ("project_id")'
    )


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0005_fix_stafftask_project_fk"),
    ]

    operations = [
        migrations.RunPython(fix_sqlite_fk, migrations.RunPython.noop),
    ]
