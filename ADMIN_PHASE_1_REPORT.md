# ADMIN_PHASE_1_REPORT — User Management

**Branch:** `feat/admin-user-management`  
**Base:** `main` (`1292dbf`)  
**Date:** 2026-08-25

## What was done

- `AdminUserViewSet` (IsAdmin) at `/api/accounts/users/` with paginated list, retrieve, create, update/PATCH, destroy, plus `set_role` and `set_active`.
- Response fields: id, email, name, role, is_active, date_joined, last_login — never password hashes.
- Guards: self-delete 400 (`لا يمكنك حذف حسابك`); last active admin cannot be deleted / demoted / disabled (Arabic 400).
- Non-admin → 403; unauthenticated → 401. Search by name/email; filter by role and `is_active`.
- Frontend: نطاق «المستخدمون» `/Admin/users` with table, search/filters, add/edit modals, enable/disable, delete confirmation, toasts, PageStates.
- No new database table (User + Profile already exist) — no migration.

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| CRUD + set_role/set_active | `backend/accounts/views_admin.py` |
| Serializers (no password) | `backend/accounts/serializers.py` (`AdminUserSerializer`) |
| Last-admin / self-delete guards | `backend/accounts/admin_users.py` |
| Routes | `backend/accounts/urls.py` |
| Tests (13) | `backend/accounts/tests_admin_users.py` |
| Users page | `frontend/src/components/pages/admin/UsersAdmin.tsx` |
| Domain nav | `frontend/src/admin/domains.ts`, `App.tsx` |
| Filter helpers + vitest | `frontend/src/admin/userManagement.ts`, `userManagement.test.ts` |
| Role labels | `frontend/src/i18n/labels.ts` |
| Decision | `DECISIONS.md` D-38 |

## Gate results

### Backend suite
```
Ran 165 tests in 52.355s
OK (skipped=1)
```
(Main baseline 152 + 13 user-management tests.)

### `check --deploy`
```
System check identified no issues (0 silenced).
```
Env: `DEBUG=False`, long `SECRET_KEY`, `ALLOWED_HOSTS`.

### Frontend
```
Test Files  7 passed (7)
     Tests  34 passed (34)
tsc && vite build → success
Largest JS chunk: vendor-react 230.96 kB (< 250KB gate)
```

## DECISIONS this phase
- **D-38** — Admin user management in `accounts` without a new model; last-admin COUNT O(1); independent «المستخدمون» domain.

## Deferred
None for Phase 1. Platform settings, notifications, roles matrix, and audit log follow in Phases 2–5.

## Next
Phase 2 on `feat/platform-settings` from this head.
