from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import Profile
from core.roles import (
    CAP_APPROVE_SPONSORSHIP,
    CAP_CREATE_PROJECT,
    CAP_CREATE_SPONSORSHIP,
    CAP_DELETE_PROJECT,
    CAP_MANAGE_SETTINGS,
    CAP_MANAGE_USERS,
    ROLE_CAPABILITIES,
    ROLE_LABELS,
    has_capability,
    role_catalog,
)
from projects.models import Project


def make_user(email, role):
    u = User.objects.create_user(username=email, email=email, password="Hello12345!")
    u.profile.role = role
    u.profile.save()
    return u


class RoleCatalogTests(APITestCase):
    def setUp(self):
        self.users = {role: make_user(f"{role}@x.com", role) for role in ROLE_LABELS}
        self.admin = self.users["admin"]
        self.project = Project.objects.create(name="م", slug="cap-p")

    def test_catalog_covers_profile_roles(self):
        choice_ids = {c[0] for c in Profile.ROLE_CHOICES}
        self.assertEqual(set(ROLE_CAPABILITIES), choice_ids)
        self.assertEqual(set(ROLE_LABELS), choice_ids)
        payload = role_catalog()
        self.assertEqual({r["id"] for r in payload["roles"]}, choice_ids)
        self.assertTrue(payload["capabilities"])
        admin_caps = next(r["capabilities"] for r in payload["roles"] if r["id"] == "admin")
        self.assertIn(CAP_MANAGE_USERS, admin_caps)

    def test_catalog_admin_only(self):
        self.client.force_authenticate(self.users["user"])
        self.assertEqual(self.client.get("/api/roles/").status_code, 403)
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/roles/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["roles"]), len(ROLE_LABELS))

    def _assert_denied(self, role, method, url, body=None):
        self.client.force_authenticate(self.users[role])
        res = getattr(self.client, method.lower())(url, body or {}, format="json")
        self.assertIn(res.status_code, (403, 404), f"{role} {method} {url} -> {res.status_code}")

    def test_denied_capabilities_match_enforcement(self):
        probes = [
            (CAP_MANAGE_USERS, "GET", "/api/accounts/users/", None),
            (CAP_MANAGE_SETTINGS, "GET", "/api/settings/", None),
            (CAP_CREATE_PROJECT, "POST", "/api/platform/projects/", {"name": "س", "slug": "cap-new"}),
            (CAP_DELETE_PROJECT, "DELETE", f"/api/platform/projects/{self.project.id}/", None),
            (CAP_CREATE_SPONSORSHIP, "POST", "/api/saqya/sponsorships/", {"amount": "10", "type": "سقيا"}),
        ]
        for cap, method, url, body in probes:
            for role in ROLE_LABELS:
                documented = cap in ROLE_CAPABILITIES[role]
                self.assertEqual(has_capability(self.users[role], cap), documented)
                if documented:
                    continue
                self._assert_denied(role, method, url, body)
        self.assertTrue(Project.objects.filter(pk=self.project.pk).exists())

    def test_donor_cannot_approve_sponsorship(self):
        self.client.force_authenticate(self.users["donor"])
        sp = self.client.post("/api/saqya/sponsorships/", {"amount": "500", "type": "سقيا"}, format="json")
        self.assertEqual(sp.status_code, 201)
        self.assertFalse(has_capability(self.users["donor"], CAP_APPROVE_SPONSORSHIP))
        res = self.client.post(f"/api/saqya/sponsorships/{sp.data['id']}/approve/", {}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_supplier_cannot_delete_project(self):
        self.assertFalse(has_capability(self.users["supplier"], CAP_DELETE_PROJECT))
        self.client.force_authenticate(self.users["supplier"])
        res = self.client.delete(f"/api/platform/projects/{self.project.id}/")
        self.assertEqual(res.status_code, 403)
        self.assertTrue(Project.objects.filter(pk=self.project.pk).exists())

    def test_allowed_admin_and_donor_actions(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get("/api/accounts/users/").status_code, 200)
        self.assertEqual(self.client.get("/api/settings/").status_code, 200)
        created = self.client.post("/api/platform/projects/", {"name": "جديد", "slug": "cap-ok"}, format="json")
        self.assertEqual(created.status_code, 201)
        pid = created.data["id"]
        self.assertEqual(self.client.delete(f"/api/platform/projects/{pid}/").status_code, 204)

        self.client.force_authenticate(self.users["donor"])
        sp = self.client.post("/api/saqya/sponsorships/", {"amount": "500", "type": "سقيا"}, format="json")
        self.assertEqual(sp.status_code, 201)
        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self.client.post(f"/api/saqya/sponsorships/{sp.data['id']}/approve/", {}, format="json").status_code,
            200,
        )
