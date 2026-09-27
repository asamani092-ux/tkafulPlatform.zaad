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
