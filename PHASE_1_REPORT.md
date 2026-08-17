# PHASE_1_REPORT — Complete the App Split

**Branch:** `fix/complete-app-split`  
**Base:** `main` (`e728b01`)  
**Head:** `98786e3`  
**Date:** 2026-08-17

## What was done

1. Moved services API layer out of `volunteering` into `services/`:
   - New `services/serializers.py` (Service, ServiceRequest, ServiceVolunteerApplication, Suggestion, WaterSupplyRequest).
   - Filled `services/views.py` (ViewSets + public/admin function views).
   - `services/urls.py` now imports local views.
2. Moved reporting API layer into `reporting/`:
   - New `reporting/serializers.py` (AdminReport, VolunteerStatistics, QuarterlyTarget, DepartmentHours, TopVolunteer).
   - Filled `reporting/views.py` (reports + statistics endpoints).
   - `reporting/urls.py` now imports local views.
3. Removed nested `include("services.urls")` / `include("reporting.urls")` from `volunteering/urls.py`.
4. Wired apps at root in `takaful_backend/urls.py`:
   - `path("api/", include("services.urls"))`
   - `path("api/", include("reporting.urls"))`
5. Renamed `volunteering.ProjectViewSet` → `VolunteeringProfileViewSet`; router path remains `projects` → `/api/projects/` unchanged.
6. Added smoke tests: `services/tests_api.py`, `reporting/tests_api.py`.
7. Documented **D-34** in `DECISIONS.md`.

No data migrations. Models were already in the correct apps (Phase A SeparateDatabaseAndState).

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| services views/serializers/urls | `backend/services/views.py`, `serializers.py`, `urls.py` |
| reporting views/serializers/urls | `backend/reporting/views.py`, `serializers.py`, `urls.py` |
| Root URL includes | `backend/takaful_backend/urls.py` |
| VolunteeringProfileViewSet rename | `backend/volunteering/views.py`, `urls.py` |
| Endpoint smoke tests | `backend/services/tests_api.py`, `backend/reporting/tests_api.py` |
| Decision record | `DECISIONS.md` D-34 |

## Legacy path → new ownership

| Path | Was | Now |
|------|-----|-----|
| `/api/public-services/`, `/api/beneficiary-services/`, `/api/public-suggestions/`, `/api/public-service-request/`, `/api/public-water-supply-request/` | nested via `volunteering.urls` → `services.urls` | root `include("services.urls")` |
| `/api/services/`, `/api/service-requests/`, `/api/suggestions/`, `/api/water-supply-requests/` + apply-volunteer + admin service-volunteer-apps | same nesting | root `services.urls` |
| `/api/reports/*`, `/api/public-volunteer-statistics/`, `/api/admin/volunteer-statistics/`, `/api/admin/upload-statistics/` | nested via `volunteering.urls` → `reporting.urls` | root `include("reporting.urls")` |
| `/api/projects/` | `ProjectViewSet` | `VolunteeringProfileViewSet` (same path string) |

Frontend URL strings unchanged — no consumer path breakage.

## Gate results

### Backend suite
```
Ran 126 tests in 33.653s
OK (skipped=1)
```
(Baseline before Phase 1: 115 tests OK skipped=1; +11 new smoke tests.)

### `check --deploy` (production-like env)
```
System check identified no issues (0 silenced).
```
Env: `DEBUG=False`, long `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`.

### Frontend
```
tsc && vite build → success
Largest JS chunk: vendor-react 230.96 kB (< 250KB gate)
```

## DECISIONS made this phase

- **D-34** — API ownership split for services/reporting; VolunteeringProfileViewSet rename; same `/api/*` paths via root includes.

## Deferred

None for Phase 1.

## Next

Phase 2 on branch `fix/water-supply-and-security` from this head.
