# PERMISSION_TABLE — Phase 2 security baseline

Generated from routers/views scan (2026-08-17). Role columns: **Anon** / **Auth user** / **Donor|Supplier|Rep** / **Project member** / **Org Admin (`IsAdmin`)** / **Super-admin**.

Legend: ✅ allowed · 🚫 denied (401/403) · 🔎 scoped queryset · — n/a

## AllowAny endpoints (justified)

| Endpoint | Justification |
|----------|----------------|
| `GET /api/ping/` | Health check |
| `POST /api/accounts/auth/register/` | Public registration (AuthRateThrottle) |
| `POST /api/accounts/auth/token/` | Login (AuthRateThrottle; JWT ObtainPair has no DRF permission_classes by design) |
| `POST /api/accounts/auth/token/refresh/` | Token refresh (AuthRateThrottle) |
| `GET /api/platform/public/projects/` | Public project catalog / home |
| `GET /api/platform/public/projects/<slug>/` | Public project landing |
| `GET /api/public-services/`, `GET /api/beneficiary-services/` | Public service catalogs |
| `POST /api/public-suggestions/`, `POST /api/public-service-request/`, `POST /api/public-water-supply-request/` | Public intake forms (PublicWriteRateThrottle); water-supply admin list is **IsAdmin** |
| `POST /api/suggestions/` (create only) | Same public intake via ViewSet dynamic perms |
| `GET /api/public-projects/`, `GET /api/public-volunteers-stats/`, `GET /api/public-home-stats/` | Legacy public volunteering stats |
| `GET /api/public-volunteer-statistics/` | Public aggregated volunteer stats |
| `GET /api/maps/public/…`, `GET /api/map/regions|outlets|products|summary/` | Public maps; PDPL masks counts &lt; 5 |
| `POST /api/map/contributions/`, `POST /api/maps/public/<id>/contributions/` | Public contribution forms (throttled) |
| `GET /api/dashboard/executive/` | Legacy executive payload (read-only public API; UI gated — see D-36) |
| Dashboard ViewSets SAFE methods via `IsStaffOrReadOnly` | Legacy read-open; writes require staff roles |

## Major endpoint matrix

| Endpoint | Anon | Auth | Role-scoped | Admin | Notes |
|----------|------|------|-------------|-------|-------|
| `GET /api/ping/` | ✅ | ✅ | — | ✅ | Health |
| `POST /api/accounts/auth/register/` | ✅ | ✅ | — | ✅ | AuthRateThrottle |
| `POST /api/accounts/auth/token/` | ✅ | ✅ | — | ✅ | AuthRateThrottle |
| `POST /api/accounts/auth/token/refresh/` | ✅ | ✅ | — | ✅ | AuthRateThrottle |
| `POST /api/accounts/logout/` | 🚫 | ✅ | — | ✅ | Blacklists refresh |
| `GET/PATCH /api/accounts/me|profile/` | 🚫 | ✅ | — | ✅ | Own profile |
| `GET /api/platform/public/projects/` | ✅ | ✅ | — | ✅ | Public catalog |
| `GET/POST /api/platform/projects/` | 🚫 | 🔎 | ProjectMember | ✅ | Create/delete: super-admin only |
| `…/add_member/`, `…/set_tool/` | 🚫 | 🔎 | project_admin / super | ✅ | Object perms |
| `GET /api/platform/my-memberships/` | 🚫 | ✅ | — | ✅ | |
| `GET /api/water-supply-requests/` | 🚫 | 🚫 | — | ✅ | **IsAdmin**; PII — not public |
| `POST /api/public-water-supply-request/` | ✅ | ✅ | — | ✅ | Optional `project` slug/id; PublicWriteRateThrottle |
| `GET/POST /api/services/`, `/api/service-requests/` | 🚫 | 🚫 | — | ✅ | IsAdmin |
| `GET /api/public-services/` | ✅ | ✅ | — | ✅ | Active volunteer services |
| `POST /api/public-service-request/` | ✅ | ✅ | — | ✅ | PublicWriteRateThrottle |
| `GET /api/suggestions/` | 🚫 | 🚫 | — | ✅ | List IsAdmin; create AllowAny |
| `POST /api/public-suggestions/` | ✅ | ✅ | — | ✅ | PublicWriteRateThrottle |
| `GET/POST /api/saqya/sponsorships/` | 🚫 | 🔎 | donor owns | ✅ | IDOR-safe queryset |
| `POST …/sponsorships/<id>/pay/` | 🚫 | 🔎 | donor | ✅ | PublicWriteRateThrottle on pay |
| `GET /api/saqya/orders|invoices|documentation|payments/` | 🚫 | 🔎 | role/ownership | ✅ | IDOR-safe |
| `GET /api/saqya/invoices/<id>/file/` | 🚫 | 🔎 | ownership | ✅ | Authenticated FileResponse |
| `GET /api/saqya/documentation/<id>/file/` | 🚫 | 🔎 | ownership | ✅ | Authenticated FileResponse |
| `GET /api/saqya/map/` | 🚫 | 🚫 | — | ✅ | Admin map points |
| `GET /api/maps/public/` | ✅ | ✅ | — | ✅ | PDPL masking |
| `CRUD /api/maps/admin/*` | 🚫 | 🔎 | project staff | ✅ | Cross-project blocked |
| `GET /api/map/regions|summary/` (legacy) | ✅ | ✅ | — | ✅ | PDPL &lt;5 mask |
| `CRUD /api/map/admin/*` (legacy) | 🚫 | 🚫 | — | ✅ | IsAdmin |
| `GET /api/reports/*`, admin stats upload | 🚫 | 🚫 | — | ✅ | IsAdmin |
| `GET /api/public-volunteer-statistics/` | ✅ | ✅ | — | ✅ | Aggregates only |
| `/api/projects|assignments|tasks/` (volunteering) | 🚫 | 🚫 | — | ✅ | IsAdmin (profiles) |
| `GET /api/public-home-stats/` etc. | ✅ | ✅ | — | ✅ | Public stats |
| `GET /api/user/*` volunteer self-service | 🚫 | ✅ | own | ✅ | |
| `GET /api/dashboard/executive/` | ✅ | ✅ | — | ✅ | Legacy AllowAny (D-36) |
| Dashboard CRUD | ✅ GET | ✅ GET | staff write | ✅ | IsStaffOrReadOnly |
| `/api/notifications/` | 🚫 | ✅ | own | send: admin | |

## Role notes

- **Org Admin (`IsAdmin`)**: `profile.role == "admin"` or Django superuser (`core.permissions`).
- **Project roles**: `project_admin` manages members/tools; `project_editor` edits content; `project_viewer` read-only within scoped projects. Members of project A cannot manage project B (queryset + object perms).
- **Saqya roles**: donor / supplier / representative scoped via queryset filters; file downloads require auth + `can_access_order`.

## Throttle scopes

| Scope | Rate (settings) | Applied on |
|-------|-----------------|------------|
| `auth` | 10/min | register, token, token/refresh |
| `public_write` | 20/min | public forms, sponsorship `pay` |
| `anon` / `user` | 60 / 240 per min | DEFAULT_THROTTLE_CLASSES |

## JWT lifetimes (unchanged this phase)

- Access: 1 day · Refresh: 7 days · `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` enabled.
- Logout blacklists the provided refresh token.
