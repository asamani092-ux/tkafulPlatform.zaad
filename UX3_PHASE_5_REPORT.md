# UX3 Phase 5 — Roles (SAFE) + Maps Admin Deletes

## A) Unified Roles UI (SAFE model)

### RolesAdmin (`frontend/src/components/pages/admin/RolesAdmin.tsx`)
- Fetches **both** `GET /api/roles/` (capabilities catalog) and `GET /api/settings/` (`roles_can_login`).
- Displays all **8 platform roles** as cards with:
  - Read-only capability list (✓ from catalog)
  - Login `Switch` bound to `roles_can_login[roleId]` → `PATCH /api/settings/`
  - Admin login switch disabled (backend enforces non-disable)
  - Badge «بيانات فقط — لا يسجّل الدخول، يُدار من الإدارة» when login is off
- Top copy: «القدرات ثابتة لحماية النظام؛ تفعيل الدخول قابل للتغيير حسب جهتك.»
- No role create/delete or capability editing.

### Shared role options (`frontend/src/admin/roleOptions.ts`)
- `PLATFORM_ROLE_OPTIONS` — 8 profile roles with Arabic labels from `ROLE_AR`.
- `UsersAdmin` dropdowns now use this helper (no `project_*` roles).

### PlatformSettings
- Removed duplicate `roles_can_login` toggles from sponsorship tab.
- Replaced with link card: «إدارة الأدوار وتفعيل الدخول» → `/Admin/settings/roles`.
- Sponsorship save no longer PATCHes `roles_can_login` (single source of truth).

## B) Maps admin deletes + copy

### MapsAdmin (`frontend/src/components/pages/admin/MapsAdmin.tsx`)
- Confirm-before-delete modal for layers, fields, and items.
- `DELETE /api/maps/admin/layers/:id/`, `/fields/:id/`, `/items/:id/` then silent `loadChildren`.
- Mixed visibility helper: «خريطة عامة مع طبقات خاصة لا تظهر للعموم» (map header + create form).
- Pledges tab Alert: «تعهدات الجمهور على عناصر الخريطة — اعتماد ثم تنفيذ».

### Backend test (`backend/maps/tests.py`)
- `test_admin_can_delete_layer_field_item` — verifies admin DELETE for layer, field, and item (204).

## Verification

```bash
cd backend && ./venv/bin/python manage.py check
cd backend && ./venv/bin/python manage.py test maps.tests.MapAdminScopingTests.test_admin_can_delete_layer_field_item core.tests_roles -v2
cd frontend && npm run build
```
