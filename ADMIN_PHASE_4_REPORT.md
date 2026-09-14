# ADMIN_PHASE_4_REPORT — Roles & Permissions Visibility

**Branch:** `feat/roles-visibility`  
**Base:** `feat/notifications-center` (`1ae606d`)  
**Date:** 2026-08-25

## What was done

- Added `core/roles.py` as the single source of truth: `ROLE_CAPABILITIES`, Arabic labels/descriptions, `has_capability()`.
- `GET /api/roles/` (IsAdmin) returns the catalog (roles + capabilities). Roles are not editable.
- Permission classes now consult the mapping: `IsAdmin`/`is_super_admin`, `IsSaqyaAdmin`, `IsDonor`, `IsStaffOrReadOnly`.
- Tests assert catalog covers `Profile.ROLE_CHOICES`, non-admin 403, documented denials (including donor cannot approve, supplier cannot delete project), and allowed admin/donor actions.
- Frontend: read-only matrix at `/Admin/settings/roles`.

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| ROLE_CAPABILITIES | `backend/core/roles.py` |
| Catalog endpoint | `backend/core/views_roles.py`, `urls.py` |
| Permission wiring | `backend/core/permissions.py`, `sponsorships/permissions.py`, `analytics/views.py` |
| Create-sponsorship / upload-doc checks | `backend/sponsorships/views.py` |
| Tests | `backend/core/tests_roles.py` |
| Matrix UI | `frontend/src/components/pages/admin/RolesAdmin.tsx` |
| Helper + vitest | `frontend/src/admin/rolesMatrix.ts`, `rolesMatrix.test.ts` |
| Decision | `DECISIONS.md` D-41 |

## Gate results

### Backend suite
```
Ran 192 tests in 73.517s
OK (skipped=1)
```
(Phase 3: 186 → Phase 4: 192 = +6 role-catalog tests.)

### `check --deploy`
```
System check identified no issues (0 silenced).
```

### Frontend
```
Test Files  10 passed (10)
     Tests  39 passed (39)
tsc && vite build → success
Largest JS chunk: vendor-react 230.96 kB (< 250KB gate)
```

## DECISIONS this phase
- **D-41** — Roles are fixed in code; assignment remains Phase 1 `set_role`.

## Deferred
None. Activity log is Phase 5.

## Next
Phase 5 on `feat/activity-log` from this head.
