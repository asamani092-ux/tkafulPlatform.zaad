# Phase A3 step 2a: data migration only (D-25)

from django.db import migrations
from django.utils.text import slugify


KNOWN_SLUGS = {
    "تفقدهم": "tafaqqadhum",
    "منصة تكافل وأثر": "takaful-athar",
    "تكافل وأثر": "takaful-athar",
    "سقيا الزاد": "saqya",
}

STATUS_TO_PLATFORM = {
    "PLANNED": "draft",
    "ACTIVE": "active",
    "COMPLETED": "completed",
    "CANCELLED": "archived",
}


def _slug_for_title(title: str, old_id: int) -> str:
    key = (title or "").strip()
    if key in KNOWN_SLUGS:
        return KNOWN_SLUGS[key]
    slug = slugify(key, allow_unicode=True)
    return slug or f"vol-{old_id}"


def migrate_projects_forward(apps, schema_editor):
    OldProject = apps.get_model("volunteering", "Project")
    PlatformProject = apps.get_model("projects", "Project")
    ProjectTool = apps.get_model("projects", "ProjectTool")
    VolunteeringProfile = apps.get_model("volunteering", "VolunteeringProfile")
    Task = apps.get_model("volunteering", "Task")
    ProjectAssignment = apps.get_model("volunteering", "ProjectAssignment")
    VolunteerApplication = apps.get_model("volunteering", "VolunteerApplication")
    StaffTask = apps.get_model("analytics", "StaffTask")

    id_map = {}
    for old in OldProject.objects.all().order_by("id"):
        slug = _slug_for_title(old.title, old.id)
        platform, created = PlatformProject.objects.get_or_create(
            slug=slug,
            defaults={
                "name": old.title,
                "description": old.desc or "",
                "start_date": old.start_date,
                "end_date": old.end_date,
                "status": STATUS_TO_PLATFORM.get(old.status, "active"),
                "is_active": True,
            },
        )
        if not created:
            changed = False
            if not platform.description and old.desc:
                platform.description = old.desc
                changed = True
            if old.start_date and not platform.start_date:
                platform.start_date = old.start_date
                changed = True
            if old.end_date and not platform.end_date:
                platform.end_date = old.end_date
                changed = True
            if changed:
                platform.save()

        VolunteeringProfile.objects.update_or_create(
            project=platform,
            defaults={
                "category": old.category,
                "target_audience": old.target_audience,
                "beneficiaries": old.beneficiaries,
                "location": old.location,
                "donation_amount": old.donation_amount,
                "implementation_requirements": old.implementation_requirements,
                "project_goals": old.project_goals,
                "estimated_hours": old.estimated_hours,
                "supervisor": old.supervisor,
                "duration": old.duration,
                "tags": old.tags,
                "progress": old.progress,
                "organization": old.organization,
                "hours": old.hours,
                "is_hidden": old.is_hidden,
                "budget": old.budget,
                "manager_employee_id": old.manager_employee_id,
                "external_source": old.external_source,
                "external_id": old.external_id,
                "volunteer_status": old.status,
                "created_at": old.created_at,
                "updated_at": old.updated_at,
            },
        )
        ProjectTool.objects.get_or_create(
            project=platform,
            tool_key="volunteering",
            defaults={"is_enabled": True},
        )
        id_map[old.id] = platform.id

    for task in Task.objects.exclude(project_id__isnull=True):
        new_id = id_map.get(task.project_id)
        if new_id:
            task.platform_project_id = new_id
            task.save(update_fields=["platform_project_id"])

    for row in ProjectAssignment.objects.exclude(project_id__isnull=True):
        new_id = id_map.get(row.project_id)
        if new_id:
            row.platform_project_id = new_id
            row.save(update_fields=["platform_project_id"])

    for row in VolunteerApplication.objects.exclude(project_id__isnull=True):
        new_id = id_map.get(row.project_id)
        if new_id:
            row.platform_project_id = new_id
            row.save(update_fields=["platform_project_id"])

    for row in StaffTask.objects.exclude(project_id__isnull=True):
        new_id = id_map.get(row.project_id)
        if new_id:
            row.platform_project_id = new_id
            row.save(update_fields=["platform_project_id"])


def migrate_projects_backward(apps, schema_editor):
    OldProject = apps.get_model("volunteering", "Project")
    VolunteeringProfile = apps.get_model("volunteering", "VolunteeringProfile")
    Task = apps.get_model("volunteering", "Task")
    ProjectAssignment = apps.get_model("volunteering", "ProjectAssignment")
    VolunteerApplication = apps.get_model("volunteering", "VolunteerApplication")
    StaffTask = apps.get_model("analytics", "StaffTask")

    id_map = {}
    for profile in VolunteeringProfile.objects.select_related("project").all():
        platform = profile.project
        old = OldProject.objects.create(
            title=platform.name,
            desc=platform.description,
            category=profile.category,
            target_audience=profile.target_audience,
            beneficiaries=profile.beneficiaries,
            location=profile.location,
            donation_amount=profile.donation_amount,
            start_date=platform.start_date,
            end_date=platform.end_date,
            implementation_requirements=profile.implementation_requirements,
            project_goals=profile.project_goals,
            estimated_hours=profile.estimated_hours,
            supervisor=profile.supervisor,
            duration=profile.duration,
            tags=profile.tags,
            progress=profile.progress,
            organization=profile.organization,
            hours=profile.hours,
            is_hidden=profile.is_hidden,
            budget=profile.budget,
            manager_employee_id=profile.manager_employee_id,
            external_source=profile.external_source,
            external_id=profile.external_id,
            status=profile.volunteer_status,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
        id_map[platform.id] = old.id

    for task in Task.objects.exclude(platform_project_id__isnull=True):
        old_id = id_map.get(task.platform_project_id)
        if old_id:
            task.project_id = old_id
            task.save(update_fields=["project_id"])

    for row in ProjectAssignment.objects.exclude(platform_project_id__isnull=True):
        old_id = id_map.get(row.platform_project_id)
        if old_id:
            row.project_id = old_id
            row.save(update_fields=["project_id"])

    for row in VolunteerApplication.objects.exclude(platform_project_id__isnull=True):
        old_id = id_map.get(row.platform_project_id)
        if old_id:
            row.project_id = old_id
            row.save(update_fields=["project_id"])

    for row in StaffTask.objects.exclude(platform_project_id__isnull=True):
        old_id = id_map.get(row.platform_project_id)
        if old_id:
            row.project_id = old_id
            row.save(update_fields=["project_id"])

    VolunteeringProfile.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0003_stafftask_platform_project"),
        ("volunteering", "0002_volunteering_profile"),
    ]

    operations = [
        migrations.RunPython(migrate_projects_forward, migrate_projects_backward),
    ]
