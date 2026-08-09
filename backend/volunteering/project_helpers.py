"""Query helpers for volunteering projects (platform Project + VolunteeringProfile)."""
from django.db.models import Sum
from django.utils.text import slugify

from projects.models import Project, ProjectTool
from .models import (
    KNOWN_PROJECT_SLUGS,
    PLATFORM_STATUS_MAP,
    VOLUNTEER_STATUS_CHOICES,
    VolunteeringProfile,
)


def volunteering_profiles_qs():
    return VolunteeringProfile.objects.select_related("project", "manager_employee")


def profile_for_project_id(project_id):
    return volunteering_profiles_qs().filter(project_id=project_id).first()


def slug_for_title(title: str) -> str:
    key = (title or "").strip()
    if key in KNOWN_PROJECT_SLUGS:
        return KNOWN_PROJECT_SLUGS[key]
    return slugify(key, allow_unicode=True) or "volunteering-project"


def create_volunteering_project(title, desc="", status="ACTIVE", **profile_fields):
    """Create platform Project + VolunteeringProfile + enable volunteering tool."""
    slug_base = slug_for_title(title)
    slug = slug_base
    n = 1
    while Project.objects.filter(slug=slug).exists():
        slug = f"{slug_base}-{n}"
        n += 1

    platform_status = PLATFORM_STATUS_MAP.get(status, "active")
    project = Project.objects.create(
        name=title,
        slug=slug,
        description=desc or "",
        status=platform_status,
        is_active=True,
        start_date=profile_fields.pop("start_date", None),
        end_date=profile_fields.pop("end_date", None),
    )
    profile = VolunteeringProfile.objects.create(
        project=project,
        volunteer_status=status,
        **{k: v for k, v in profile_fields.items() if k not in ("start_date", "end_date")},
    )
    ProjectTool.objects.get_or_create(
        project=project, tool_key="volunteering", defaults={"is_enabled": True}
    )
    return profile


def aggregate_donations():
    return volunteering_profiles_qs().aggregate(total=Sum("donation_amount"))["total"] or 0


def aggregate_beneficiaries():
    return volunteering_profiles_qs().aggregate(total=Sum("beneficiaries"))["total"] or 0
