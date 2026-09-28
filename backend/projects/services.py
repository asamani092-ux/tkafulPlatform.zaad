"""
منطق أعمال «المشاريع» (fat models, thin views).
كل فحوصات النطاق (scoping) للأدمن الموحّد تمر من هنا.
"""
from django.core.exceptions import ObjectDoesNotExist

from core.permissions import is_super_admin

from .models import Project, ProjectMember

MANAGER_ROLES = ("project_admin",)
EDITOR_ROLES = ("project_admin", "project_editor")


def user_project_ids(user, roles=None):
    """معرّفات المشاريع التي للمستخدم عضوية فيها — O(M) حيث M عدد عضوياته."""
    if not user or not user.is_authenticated:
        return []
    qs = ProjectMember.objects.filter(user=user)
    if roles:
        qs = qs.filter(role__in=roles)
    return list(qs.values_list("project_id", flat=True))


def scoped_projects_queryset(user):
    """super-admin يرى كل شيء؛ عضو المشروع يرى مشاريعه فقط."""
    if is_super_admin(user):
        return Project.objects.all()
    return Project.objects.filter(pk__in=user_project_ids(user))


def user_role_in_project(user, project) -> str | None:
    if is_super_admin(user):
        return "super_admin"
    m = ProjectMember.objects.filter(user=user, project=project).first()
    return m.role if m else None


def can_manage_project(user, project) -> bool:
    """إدارة المشروع (أعضاء/أدوات/محتوى): super-admin أو project_admin."""
    if is_super_admin(user):
        return True
    return ProjectMember.objects.filter(
        user=user, project=project, role__in=MANAGER_ROLES
    ).exists()


def can_edit_project_content(user, project) -> bool:
    """تحرير محتوى المشروع (عناصر الخرائط…): super-admin أو project_admin/editor."""
    if is_super_admin(user):
        return True
    return ProjectMember.objects.filter(
        user=user, project=project, role__in=EDITOR_ROLES
    ).exists()


def public_projects_queryset():
    """المشاريع العامة: النشطة فقط (draft/completed/archived للأدمن فقط) — D-43."""
    from .lifecycle import PUBLIC_STATUSES

    return (
        Project.objects.filter(is_active=True, status__in=PUBLIC_STATUSES)
        .prefetch_related("tools")
    )


def public_home_projects_queryset(limit: int = 6):
    """
    مشاريع الصفحة الرئيسية: المميزة أولاً (حسب featured_order)،
    وإن لم يُحدَّد شيء → أحدث المشاريع العامة. O(N) مع حدّ ثابت.
    """
    base = public_projects_queryset()
    featured = base.filter(is_featured=True).order_by("featured_order", "name")
    if featured.exists():
        return featured[:limit]
    return base.order_by("-updated_at", "-id")[:limit]


def platform_overview_stats() -> dict:
    """مؤشرات نظرة /Admin من بيانات المنصة الحية. O(1) تجميعات مفهرسة."""
    from django.contrib.auth.models import User

    from projectdocs.models import ProjectDossier, StageActivity
    from services.models import ServiceRequest, Suggestion
    from sponsorships.models import Sponsorship

    projects_active = Project.objects.filter(status="active").count()
    projects_draft = Project.objects.filter(status="draft").count()
    dossiers_in_progress = ProjectDossier.objects.filter(
        status__in=("in_progress", "pending_approval")
    ).count()
    activities_delayed = StageActivity.objects.filter(auto_status="delayed").count()
    tasks_assigned_open = (
        StageActivity.objects.filter(responsible_user__isnull=False)
        .exclude(auto_status="done")
        .count()
    )
    volunteers_approved = User.objects.filter(
        profile__role="user", profile__is_approved=True
    ).count()
    sponsorships_active = Sponsorship.objects.filter(
        status__in=("sponsored", "approved", "prepared", "in_progress", "delivered")
    ).count()

    pending_service = ServiceRequest.objects.filter(status="PENDING").count()
    suggestions = Suggestion.objects.count()
    join_reqs = User.objects.filter(
        profile__role="user", profile__is_approved=False, is_active=True
    ).count()
    try:
        from volunteering.models import VolunteerApplication

        project_apps = VolunteerApplication.objects.filter(status="قيد المراجعة").count()
    except Exception:
        project_apps = 0

    pending_ops = pending_service + suggestions + join_reqs + project_apps

    return {
        "projects_active": projects_active,
        "projects_draft": projects_draft,
        "dossiers_in_progress": dossiers_in_progress,
        "activities_delayed": activities_delayed,
        "tasks_assigned_open": tasks_assigned_open,
        "volunteers_approved": volunteers_approved,
        "sponsorships_active": sponsorships_active,
        "pending_ops": pending_ops,
    }


def project_delete_blockers(project: Project) -> list[str]:
    """أسباب منع الحذف إن وُجدت بيانات مهمة. O(1) استعلامات مجمّعة."""
    blockers: list[str] = []
    members_qs = ProjectMember.objects.filter(project=project)
    if project.created_by_id:
        members_qs = members_qs.exclude(user_id=project.created_by_id)
    extra_members = members_qs.count()
    if extra_members:
        blockers.append(f"يوجد {extra_members} عضواً على المشروع")

    try:
        from sponsorships.models import Sponsorship

        n = Sponsorship.objects.filter(project=project).count()
        if n:
            blockers.append(f"يوجد {n} كفالة مرتبطة")
    except Exception:
        pass

    try:
        dossier = project.dossier
    except ObjectDoesNotExist:
        dossier = None
    if dossier is not None:
        from projectdocs.models import StageActivity, DossierAttachment, ApprovalRequest

        filled = dossier.sections.exclude(status="empty").count()
        if filled:
            blockers.append(f"ملف المشروع يحتوي {filled} قسماً غير فارغ")
        act_n = StageActivity.objects.filter(stage__dossier=dossier).count()
        if act_n:
            blockers.append(f"ملف المشروع يحتوي {act_n} نشاطاً")
        att_n = DossierAttachment.objects.filter(dossier=dossier).count()
        if att_n:
            blockers.append(f"ملف المشروع يحتوي {att_n} مرفقاً")
        appr_n = ApprovalRequest.objects.filter(dossier=dossier).count()
        if appr_n:
            blockers.append(f"ملف المشروع يحتوي {appr_n} طلب اعتماد")
    return blockers
