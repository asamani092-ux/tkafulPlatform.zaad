# PHASE_2_REPORT — Water Supply Wiring + Security Baseline

**Branch:** `fix/water-supply-and-security`  
**Base:** Phase 1 head (`cd6826e`)  
**Head:** `2236212`  
**Date:** 2026-08-17

## What was done

### 2A — Water supply ↔ projects
- Added nullable `WaterSupplyRequest.project` FK → `projects.Project` (`SET_NULL`).
- Reversible migration `services.0002_watersupplyrequest_project`.
- Public POST accepts optional `project` (slug or id); frontend sends `?project=`.
- Admin `/Admin/requests/water-supply` shows project name or «طلب عام».
- Serializer exposes `project`, `project_slug`, `project_name`.

### 2B — Security baseline
- `PERMISSION_TABLE.md` — endpoint × role × expected permission matrix.
- `backend/core/tests_security_phase2.py` — IDOR, project roles, uploads, GPS, throttles, JWT/PDPL regressions (**23** tests).
- File upload validators (invoice/documentation): type whitelist + size.
- GPS lat/lng range validators on documentation.
- Django patched for pip-audit; prod npm audit (`--omit=dev --audit-level=high`) clean.
- DECISIONS **D-35**, **D-36**.

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| project FK + migration | `services/models.py`, `services/migrations/0002_watersupplyrequest_project.py` |
| Public + admin UI wiring | `services/views.py`, `WaterSupplyRequestPage.tsx`, `WaterSupplyRequests.tsx` |
| Permission table | `PERMISSION_TABLE.md` |
| Security tests | `core/tests_security_phase2.py` |
| Upload/GPS validators | sponsorships serializers/models (as implemented) |
| Decisions | `DECISIONS.md` D-35, D-36 |

## Gate results

### Backend suite
```
Ran 149 tests in 43.087s
OK (skipped=1)
```
(Phase 1: 126 → Phase 2: 149 = +23 security tests.)

### Migration reversibility
```
Unapplying services.0002_watersupplyrequest_project... OK
Applying services.0002_watersupplyrequest_project... OK
```

### `check --deploy`
```
System check identified no issues (0 silenced).
```

### Audits
- `pip-audit`: clean after Django patch (see commit `2236212`).
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.

### Frontend build
Chunks remain under 250KB (vendor-react ~231KB).

## DECISIONS this phase
- **D-35** — WaterSupplyRequest.project optional FK; empty = general request.
- **D-36** — Security baseline; AllowAny justifications; deferred executive API hardening.

## Deferred (justified)
- `GET /api/dashboard/executive/` remains AllowAny (legacy; UI gated per D-30). Hardening deferred to avoid breaking integration — documented in D-36.
- Dev-only npm advisories out of scope (`--omit=dev`).

## Next
Phase 3 on `feat/internal-uat-form` from this head.
