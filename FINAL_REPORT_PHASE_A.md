# FINAL REPORT — Phase A: eliminate merge duplication

**Branch:** `refactor/phase-a-cleanup` · **Base:** `main`  
**PR title:** refactor: phase A — eliminate merge duplication

## 1) App inventory (before → after)

| App | Before (models) | After (models) |
|-----|-----------------|----------------|
| `impact_map` | Region, Product, Outlet, Contribution, DistributionRecord (5) | **stub** — migrations only, 0 models |
| `maps` | Map, MapLayer, MapItemField, MapItem, MapContribution (5) | + **MapProduct**, **MapDistributionRecord** (7) |
| `saqya` | empty shim | stub apps.py + migrations |
| `takaful_app` | empty shim | stub apps.py + migrations |
| `volunteering` | 16 models incl. Project | Volunteer, VolunteerApplication, ProjectAssignment, Task, Subtask, **VolunteeringProfile** (6) |
| `services` *(new)* | — | Service, ServiceRequest, ServiceVolunteerApplication, WaterSupplyRequest, Suggestion (5) |
| `reporting` *(new)* | — | AdminReport, VolunteerStatistics, QuarterlyTarget, DepartmentHours, TopVolunteer (5) |
| `projects` | Project, ProjectMember, ProjectTool (3) | + `donation_url`, `donation_label` |
| `sponsorships` | unchanged ownership | unchanged |

Live DB after migrate: **13** `projects.Project`, **13** `VolunteeringProfile`, maps catalog **4** products / **12** distributions / **20** items / **6** contributions.

## 2) Decisions (DECISIONS.md)

| ID | Summary |
|----|---------|
| D-23 | maps SSoT; MapProduct + MapDistributionRecord; legacy `/api/map/*` adapter; impact_map emptied |
| D-24 | saqya/takaful_app shells removed from runtime; URLs wire to sponsorships/volunteering |
| D-25 | volunteering.Project had **13 rows** (brief said zero) — migrated into projects.Project + VolunteeringProfile |
| D-26 | services + reporting split via SeparateDatabaseAndState (zero row copies) |
| D-27 | per-project `donation_url`/`donation_label` (HTTPS); EXTERNAL_STORE_URL fallback only |

## 3) Legacy URL redirect map (old → new implementation)

| Legacy path | Serves |
|-------------|--------|
| `/api/map/*` | `maps.legacy_urls` → maps models (same JSON shapes) |
| `/api/saqya/*` | `sponsorships.urls` (direct include) |
| `/api/sponsorships/*` | `sponsorships.urls` (canonical) |
| `/api/*` (volunteering/services/reporting) | `volunteering.urls` (aggregates routers) |
| `/api/maps/*` | `maps.urls` (multi-map API) |
| `/api/platform/*` | `projects.urls` |

## 4) Integrity / reversibility

- `check_migration_integrity` updated for maps.* + VolunteeringProfile + services.* + reporting.*.
- Automated proof in `core.tests_migration`:
  - snapshot → verify migrated
  - expect-reverted fails when copy still present (negative)
  - source-count / contribution-mismatch negatives
  - post-migrate seed + idempotent seed + public contributions don’t break integrity
- Full suite: **112** backend tests OK (1 skipped).

Three-pass forward/reverse of historical `maps.0002` copy semantics is superseded by A1 (impact_map tables dropped); reverse of `maps.0003` / `impact_map.0002` recreates empty legacy tables then re-forwards — covered by migration graph apply in test DB creation.

## 5) Requirement → file / test

| Requirement | Implementation | Tests |
|-------------|----------------|-------|
| A1 SSoT + DistributionRecord | `maps/models.py`, `0003_*`, `legacy_*`, `seed_impact_map` | `maps/tests_legacy_api.py`, `maps/tests.py`, `core.tests_migration` |
| Legacy `/api/map/*` | `maps/legacy_urls.py` | `LegacyUrlCompatibilityTests`, privacy/cache/admin suites |
| A2 delete shells | `takaful_backend/urls.py`, emptied saqya/takaful_app | `test_legacy_saqya_routes_*` |
| A3 Project collision | `VolunteeringProfile`, volunteering `0002–0004` | `volunteering/tests_a3.py` |
| A4 split apps | `services/`, `reporting/`, state-only `0001_split_apps` | suite import/route green |
| A5 donation links | `projects.donation_*`, payments, PlatformProjects UI, MapContributionModal | `projects/tests_donation_links.py` |

## 6) Gate results

| Gate | Result |
|------|--------|
| `manage.py test` | **112 OK** (1 skipped) |
| `check --deploy` (DEBUG=False, long SECRET_KEY) | **clean** |
| Frontend `tsc && vite build` | **OK** — largest chunk vendor-react 231KB gzip 74KB; app chunks &lt; 250KB |
| Frontend vitest | **18/18** |

## 7) No feature removed — evidence

| Feature | Evidence still works |
|---------|----------------------|
| Public map summary/regions/products/outlets + &lt;5 mask + 60s cache | `maps/tests_legacy_api.py` Public* tests |
| Map contributions + admin approve/fulfill/cancel | legacy ContributionViewSet tests |
| Distribution records admin CRUD | MapDistributionRecord via legacy admin |
| Seed impact map | `seed_impact_map` writes maps; PostMigrateSeedTests |
| Multi-map `/api/maps/*` | `maps/tests.py` |
| Saqya sponsorships workflow | sponsorships tests + `/api/saqya/` mount |
| Volunteering projects list/apply/tasks | public/admin project APIs via VolunteeringProfile |
| Services / water / suggestions | `services` models + volunteering URL aggregate |
| Reports / stats models | `reporting` app, same db_tables |
| Per-project donate CTA | donation tests + UI hide when empty |

## 8) Commits on branch

1. `refactor(a1): maps as single source of truth; legacy /api/map adapter`
2. `refactor(a2): remove saqya/takaful_app shells; wire URLs directly`
3. `refactor(a3): merge volunteering.Project into projects.Project`
4. `refactor(a4): split services and reporting apps`
5. `feat(a5): per-project donation links` (+ this report)
