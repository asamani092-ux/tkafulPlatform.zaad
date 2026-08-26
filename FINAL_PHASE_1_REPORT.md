# FINAL_PHASE_1_REPORT — Project Lifecycle Transitions

**Branch:** `feat/project-lifecycle`  
**Base:** `feat/activity-log` (`50d1c3a`) — see note below  
**Date:** 2026-08-26

> **Base note.** The four "final completion" phases depend on the admin/audit
> layer (`log_activity`, activity log, roles) which lives on `feat/activity-log`,
> not yet on `main`. So these branches stack on `feat/activity-log`. Documented as
> **D-43**. If the admin stack merges to `main` first, rebasing is a no-op for
> these files.

## What was done

- Single legal-transition map: `projects/lifecycle.py::TRANSITIONS` / `ALLOWED_TRANSITIONS`.
- Admin-only viewset actions on `ProjectViewSet`: `activate`, `complete`, `archive`, `reopen`.
  - `activate`: draft/completed → active
  - `complete`: active → completed
  - `archive`: any → archived
  - `reopen`: completed/archived → active (documented, useful for un-archiving)
- Illegal transitions return 400 with a clear Arabic message.
- Each transition calls `log_activity` (`ACTION_PROJECT_STATUS`) with actor + from/to, and fires an in-platform admin notification.
- Public visibility tightened to **active only**: `public_projects_queryset`, `maps.public_maps_index`, and `maps._public_map_or_none` now require `status="active"` (previously they only excluded draft/archived, leaking `completed`).
- Serializer exposes `next_actions` so the UI shows only legal buttons.
- Frontend: status control row with legal-action buttons (confirm + Arabic toasts) and a status badge in the projects list.

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| Legal-transition map | `backend/projects/lifecycle.py` |
| activate/complete/archive/reopen actions | `backend/projects/views.py` (`ProjectViewSet._transition`) |
| Illegal → 400 Arabic | `backend/projects/views.py` + `tests_lifecycle.py::test_illegal_transition_400` |
| Activity logged | `backend/core/activity.py` (`ACTION_PROJECT_STATUS`) + `tests_lifecycle.py::test_transition_logs_activity` |
| Public = active only | `backend/projects/services.py`, `backend/maps/services.py`, `backend/maps/views.py` |
| next_actions in payload | `backend/projects/serializers.py` |
| Tests (8) | `backend/projects/tests_lifecycle.py` |
| Status control + badge UI | `frontend/src/components/pages/admin/PlatformProjects.tsx` |
| Labels + vitest | `frontend/src/components/pages/projects/types.ts`, `frontend/src/admin/projectLifecycle.ts`, `projectLifecycle.test.ts` |
| Decision | `DECISIONS.md` D-43 |

## Gate results

### Backend suite
```
Ran 204 tests in 78.111s
OK (skipped=1)
```
(Admin stack tip was 196 → +8 lifecycle tests.)

### `check --deploy`
```
System check identified no issues (0 silenced).
```

### Frontend
```
Test Files  12 passed (12)
     Tests  42 passed (42)
tsc && vite build → success
Largest JS chunk: vendor-react 230.96 kB (< 250KB gate)
```

## DECISIONS this phase
- **D-43** — Lifecycle transition map + active-only public visibility; branches stack on `feat/activity-log`.

## Deferred
None. `reopen` implemented (optional in spec) and documented.

## Next
Phase 2 on `feat/project-type` from this head.
