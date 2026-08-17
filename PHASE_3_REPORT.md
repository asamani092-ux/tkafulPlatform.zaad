# PHASE_3_REPORT — Internal Evaluation Form (test-only)

**Branch:** `feat/internal-uat-form`  
**Base:** Phase 2 head (`beca97b`)  
**Head:** `522f63a` (+ report commit)  
**Date:** 2026-08-17

## What was done

1. **Session-only UAT state** — removed `localStorage` persistence from `frontend/src/components/pages/uat/index.tsx`; export Markdown via clipboard/download retained.
2. **Frontend env guard** — `/uat` route and lazy import only when `import.meta.env.VITE_ENABLE_UAT === "true"` (Vite DCE). Catch-all `*` → NotFound.
3. **Dist assertion** — `npm run assert:no-uat` (`scripts/assert-no-uat-in-dist.mjs`) fails if UAT strings appear in `dist/`.
4. **Backend guard** — `UAT_ENABLED` (default `False`); `GET /api/uat/` returns 404 when off, `{"enabled": true}` when on. Tests in `core/tests_uat_guard.py`.
5. **DEPLOYMENT.md** — section “Removing the evaluation form before production”.
6. **D-37** — dual env guard documented.

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| Memory-only state + export | `frontend/src/components/pages/uat/index.tsx` |
| VITE_ENABLE_UAT route guard | `frontend/src/App.tsx` |
| Dist absence assert | `frontend/scripts/assert-no-uat-in-dist.mjs`, `package.json` `assert:no-uat` |
| Unit guard smoke | `frontend/src/uat-guard.test.ts` |
| Backend UAT_ENABLED + 404 | `takaful_backend/settings.py`, `core/views`/`urls`, `core/tests_uat_guard.py` |
| Removal docs | `DEPLOYMENT.md` |
| Decision | `DECISIONS.md` D-37 |

## Gate results

### Production build without UAT
```
✓ built in 2.31s
assert-no-uat-in-dist: OK — no UAT strings in dist/
Largest chunk: vendor-react 230.96 kB (< 250KB)
```

### Backend suite
```
Ran 152 tests in 43.243s
OK (skipped=1)
```
(Phase 2: 149 → Phase 3: 152 = +3 UAT guard tests.)

### `check --deploy`
```
System check identified no issues (0 silenced).
```

### Enabled-mode smoke (agent verified)
- `VITE_ENABLE_UAT=true` build succeeds; `assert:no-uat` correctly fails (UAT present).

## DECISIONS this phase
- **D-37** — Internal UAT dual-guarded; session memory only; not for production.

## Deferred
None.

## Branch chain for review
1. `fix/complete-app-split` → `PHASE_1_REPORT.md`
2. `fix/water-supply-and-security` → `PHASE_2_REPORT.md` (+ `PERMISSION_TABLE.md`)
3. `feat/internal-uat-form` (tip, contains all) → `PHASE_3_REPORT.md`
