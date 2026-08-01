"""اختبارات نطاق المشاريع وصلاحيات ProjectMember."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Project, ProjectMember, ProjectTool


def make_user(username, role="user"):
    user = User.objects.create_user(username=username, email=f"{username}@t.local", password="pass12345")
    user.profile.role = role
    user.profile.save()
    return user


class ProjectScopingTests(APITestCase):
    def setUp(self):
        self.super_admin = make_user("boss", role="admin")
        self.member = make_user("pm1")
        self.outsider = make_user("nobody")
        self.p1 = Project.objects.create(name="مشروع أ", slug="proj-a")
        self.p2 = Project.objects.create(name="مشروع ب", slug="proj-b")
        ProjectMember.objects.create(project=self.p1, user=self.member, role="project_admin")

    def test_super_admin_sees_all_projects(self):
        self.client.force_authenticate(self.super_admin)
        res = self.client.get("/api/platform/projects/")
        self.assertEqual(res.status_code, 200)
        slugs = {p["slug"] for p in res.json()}
        self.assertTrue({"proj-a", "proj-b"} <= slugs)

    def test_project_admin_sees_only_their_projects(self):
        self.client.force_authenticate(self.member)
        res = self.client.get("/api/platform/projects/")
        self.assertEqual(res.status_code, 200)
        slugs = {p["slug"] for p in res.json()}
        self.assertIn("proj-a", slugs)
        self.assertNotIn("proj-b", slugs)

    def test_outsider_denied_admin_list(self):
        self.client.force_authenticate(self.outsider)
        res = self.client.get("/api/platform/projects/")
        self.assertEqual(res.status_code, 403)

    def test_anonymous_denied_admin_list(self):
        res = self.client.get("/api/platform/projects/")
        self.assertEqual(res.status_code, 401)


class ProjectMemberPermissionTests(APITestCase):
    def setUp(self):
        self.super_admin = make_user("boss", role="admin")
        self.pa = make_user("pa")
        self.viewer = make_user("viewer")
        self.project = Project.objects.create(name="مشروع", slug="proj-x")
        ProjectMember.objects.create(project=self.project, user=self.pa, role="project_admin")
        ProjectMember.objects.create(project=self.project, user=self.viewer, role="project_viewer")

    def test_only_super_admin_creates_projects(self):
        self.client.force_authenticate(self.pa)
        res = self.client.post("/api/platform/projects/", {"name": "جديد", "slug": "new-p"})
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(self.super_admin)
        res = self.client.post("/api/platform/projects/", {"name": "جديد", "slug": "new-p"})
        self.assertEqual(res.status_code, 201)

    def test_only_super_admin_deletes_projects(self):
        self.client.force_authenticate(self.pa)
        res = self.client.delete(f"/api/platform/projects/{self.project.id}/")
        self.assertEqual(res.status_code, 403)
        self.assertTrue(Project.objects.filter(pk=self.project.pk).exists())

    def test_project_admin_can_add_member_viewer_cannot(self):
        newbie = make_user("newbie")
        self.client.force_authenticate(self.viewer)
        res = self.client.post(
            f"/api/platform/projects/{self.project.id}/add_member/",
            {"user_id": newbie.id, "role": "project_editor"},
        )
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(self.pa)
        res = self.client.post(
            f"/api/platform/projects/{self.project.id}/add_member/",
            {"user_id": newbie.id, "role": "project_editor"},
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(
            ProjectMember.objects.filter(
                project=self.project, user=newbie, role="project_editor"
            ).exists()
        )

    def test_tool_provisioning_super_admin_only(self):
        self.client.force_authenticate(self.pa)
        res = self.client.post(
            f"/api/platform/projects/{self.project.id}/set_tool/",
            {"tool_key": "map", "is_enabled": True},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(self.super_admin)
        res = self.client.post(
            f"/api/platform/projects/{self.project.id}/set_tool/",
            {"tool_key": "map", "is_enabled": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(
            ProjectTool.objects.filter(project=self.project, tool_key="map", is_enabled=True).exists()
        )

    def test_invalid_member_role_rejected(self):
        self.client.force_authenticate(self.super_admin)
        res = self.client.post(
            f"/api/platform/projects/{self.project.id}/add_member/",
            {"user_id": self.viewer.id, "role": "owner"},
        )
        self.assertEqual(res.status_code, 400)


class PublicProjectEndpointsTests(APITestCase):
    def setUp(self):
        Project.objects.create(name="ظاهر", slug="visible", status="active", is_active=True)
        Project.objects.create(name="مسودة", slug="draft-p", status="draft", is_active=True)
        Project.objects.create(name="موقوف", slug="inactive-p", status="active", is_active=False)

    def test_public_list_hides_draft_and_inactive(self):
        res = self.client.get("/api/platform/public/projects/")
        self.assertEqual(res.status_code, 200)
        slugs = {p["slug"] for p in res.json()}
        self.assertIn("visible", slugs)
        self.assertNotIn("draft-p", slugs)
        self.assertNotIn("inactive-p", slugs)

    def test_public_detail_for_visible_project(self):
        res = self.client.get("/api/platform/public/projects/visible/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["slug"], "visible")
        self.assertIn("maps", res.json())

    def test_public_detail_404_for_draft(self):
        res = self.client.get("/api/platform/public/projects/draft-p/")
        self.assertEqual(res.status_code, 404)

    def test_my_memberships_flags_super_admin(self):
        boss = make_user("boss2", role="admin")
        self.client.force_authenticate(boss)
        res = self.client.get("/api/platform/my-memberships/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["is_super_admin"])
