# ADMIN_PHASE_5_REPORT — Activity Log

**Branch:** `feat/activity-log`  
**Base:** `feat/roles-visibility` (`13518db`)  
**Date:** 2026-08-25

## What was done

- Folded append-only `ActivityLog` into `core` (no new Django app).
- `log_activity()` writes actor, action, target, short summary, IP — never passwords/tokens.
- Hooks on: user create/edit/delete/role/active, project create/delete, sponsorship approve, order assign, settings change, static page publish, admin broadcast.
- `GET /api/activity-logs/` IsAdmin, paginated, filterable; POST/PATCH/DELETE return 405.
- Frontend: `/Admin/settings/activity` table with filters and PageStates.
- Added `CAP_VIEW_AUDIT` to the admin role catalog.

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| Model | `backend/core/models.py` (`ActivityLog`) |
| Helper | `backend/core/activity.py` |
| Read-only API | `backend/core/views_activity.py`, `urls.py` |
| Migration (reversible drop) | `backend/core/migrations/0002_activity_log.py` |
| Hooks | `accounts/views_admin.py`, `projects/views.py`, `sponsorships/views.py`, `core/views_platform.py`, `notifications/views.py` |
| Tests | `backend/core/tests_activity.py` |
| UI | `frontend/src/components/pages/admin/ActivityLogAdmin.tsx` |
| Query helper + vitest | `frontend/src/admin/activityLog.ts` |
| Decision | `DECISIONS.md` D-42 |

## Gate results

### Backend suite
```
Ran 196 tests in 75.338s
OK (skipped=1)
```
(Phase 4: 192 → Phase 5: 196 = +4 activity-log tests.)

### Migration reverse
```
Unapplying core.0002_activity_log... OK
Applying core.0002_activity_log... OK
```

### `check --deploy`
```
System check identified no issues (0 silenced).
```

### Frontend
```
Test Files  11 passed (11)
     Tests  40 passed (40)
tsc && vite build → success
Largest JS chunk: vendor-react 230.96 kB (< 250KB gate)
```

## DECISIONS this phase
- **D-42** — Activity log lives in `core`; append-only API; SET_NULL actor.

## Deferred
Reads and high-volume events are not logged, per spec.

## Next
Single PR from this branch covering all five phases. Do not merge until independent verification.
