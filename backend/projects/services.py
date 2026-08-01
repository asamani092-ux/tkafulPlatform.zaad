"""
منطق أعمال «المشاريع» (fat models, thin views).
كل فحوصات النطاق (scoping) للأدمن الموحّد تمر من هنا.
"""
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
    return (
        Project.objects.filter(is_active=True)
        .exclude(status__in=["draft", "archived"])
        .prefetch_related("tools")
    )
