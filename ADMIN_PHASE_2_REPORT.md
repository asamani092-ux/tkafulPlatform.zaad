# ADMIN_PHASE_2_REPORT — Platform Settings

**Branch:** `feat/platform-settings`  
**Base:** `feat/admin-user-management` (`3849a21`)  
**Date:** 2026-08-25

## What was done

- Folded settings into `core` (no new Django app): singleton `PlatformSetting` (`pk=1`) + `StaticPage`.
- Admin `GET/PATCH /api/settings/` (IsAdmin); public `GET /api/public-settings/` (AllowAny, cached 60s) returns only the safe subset + published pages.
- Static pages admin ViewSet `/api/static-pages/`; unpublished pages never appear in the public payload.
- Validation: HTTPS for logo and social links; email and phone format.
- Frontend: نطاق «الإعدادات» `/Admin/settings` (form + static pages editor); public Navbar/Footer/Home/About read name, logo, contacts, flags, and published copy with empty-value fallbacks.
- Reversible migration: seed uses `RunPython.noop` on reverse so `CreateModel` drop is clean.

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| Singleton + static pages | `backend/core/models.py` |
| Public/admin services | `backend/core/platform_settings.py`, `views_platform.py`, `urls.py` |
| HTTPS/phone validators | `backend/core/validators.py` |
| Migration | `backend/core/migrations/0001_platform_settings.py` |
| Tests (singleton, public subset, publish, 403, URL) | `backend/core/tests_platform_settings.py` |
| Admin UI | `frontend/src/components/pages/admin/PlatformSettings.tsx` |
| Public context + fallbacks | `frontend/src/contexts/PlatformSettingsContext.tsx` |
| Flagged nav | `frontend/src/admin/publicNav.ts` (+ vitest) |
| Decision | `DECISIONS.md` D-39 |

## Gate results

### Backend suite
```
Ran 171 tests in 54.470s
OK (skipped=1)
```
(Phase 1: 165 → Phase 2: 171 = +6 settings tests.)

### Migration reverse
```
Unapplying core.0001_platform_settings... OK
Applying core.0001_platform_settings... OK
```

### `check --deploy`
```
System check identified no issues (0 silenced).
```

### Frontend
```
Test Files  8 passed (8)
     Tests  36 passed (36)
tsc && vite build → success
Largest JS chunk: vendor-react 230.96 kB (< 250KB gate)
```

## DECISIONS this phase
- **D-39** — Settings live in `core` as a singleton row; public endpoint is a strict safe subset.

## Deferred
- Logo upload (file) deferred; URL only (no Pillow — consistent with D-13). Empty URL falls back to `/logo.png`.

## Next
Phase 3 on `feat/notifications-center` from this head.
