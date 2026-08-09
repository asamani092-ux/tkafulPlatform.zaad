# FINAL REPORT — Phase B: unified UI around work domains

**Branch:** `refactor/phase-b-ui` · **Base tip:** Phase A (`refactor/phase-a-cleanup` @ `f57404a`) because Phase A was not yet merged into `main` (D-28).  
**PR title:** refactor: phase B — unified UI around work domains

## 1) Sidebar structure (7 work domains)

| Domain | Path | Pages |
|--------|------|-------|
| نظرة عامة | `/Admin` | KPI cards → each domain |
| المشاريع | `/Admin/projects`, `/Admin/projects/create` | PlatformProjects, AddProject |
| المتطوعون | `/Admin/volunteers`, `…/applications`, `…/join-requests` | Management, Applications, Join |
| الطلبات | `/Admin/requests`, `…/water-supply`, `…/suggestions` | ServiceRequests, WaterSupply, Suggestions |
| الكفالات | `/Admin/sponsorships` | SponsorshipsHub → project portals |
| الخرائط | `/Admin/maps` | MapsAdmin only |
| الكادر | `/Admin/staff`, `/Admin/staff/manage` | Executive + Manage (inside AdminShell) |
| التقارير | `/Admin/reports` | Reports |

## 2) Route table (old → new / redirect)

| Old | New / redirect |
|-----|----------------|
| `/Admin` | survives — overview KPIs |
| `/Admin/projects` | survives — المشاريع |
| `/Admin/maps` | survives — الخرائط |
| `/Admin/map` | → `/Admin/maps` |
| `/Admin/tasks` | → `/Admin/projects/create` |
| `/Admin/ideas` | → `/Admin/requests/suggestions` |
| `/Admin/applications` | → `/Admin/volunteers/applications` |
| `/Admin/management` | → `/Admin/volunteers` |
| `/Admin/requests` *(was join)* | **reclaimed** as الطلبات (services); join → `/Admin/volunteers/join-requests` |
| `/Admin/service-requests` | → `/Admin/requests` |
| `/Admin/join-requests` | → `/Admin/volunteers/join-requests` |
| `/Admin/executive` | → `/Admin/staff` |
| `/Admin/executive/manage` | → `/Admin/staff/manage` |
| `/executive`, `/executive/manage` | → `/Admin/staff` (+ manage) |
| `/Admin/reports` | survives — التقارير |
| `/map` | survives — public aggregator |
| `/projects/:slug/map` | survives — per-project public map |
| `/Admin/map(s)` admin | only `/Admin/maps` |
| `/saqya` | → `/projects/saqya/sponsorships` |
| `/projects/:slug/sponsorships` | canonical sponsorships |
| `/services/water-supply` | survives + `?project=saqya` wiring |
| `/admin/signin` | → `/signin` |
| `/projects`, `/`, `/services`, `/volunteers`, `/about`, `/suggest`, `/request-service`, `/user/*`, `/uat` | survive |

## 3) Feature parity checklist

| Feature (before) | Lives now |
|------------------|-----------|
| Admin home / project approve tabs | Overview KPIs; project CRUD in المشاريع (`PlatformProjects` + create) |
| Platform projects + tools + donation links | `/Admin/projects` |
| Add volunteering project form | `/Admin/projects/create` |
| Volunteer management / applications / join | `/Admin/volunteers*` |
| Service requests | `/Admin/requests` |
| Suggestions / ideas | `/Admin/requests/suggestions` |
| Water supply public form | `/services/water-supply?project=saqya` |
| Water supply admin inbox | `/Admin/requests/water-supply` (+ list API) |
| Maps admin | `/Admin/maps` only |
| Public map aggregator | `/map` |
| Per-project map | `/projects/:slug/map` |
| Executive dashboard + manage | `/Admin/staff` (+ manage) — no separate public executive (D-30) |
| Sponsorship portals | `/projects/:slug/sponsorships` + hub `/Admin/sponsorships` |
| Reports | `/Admin/reports` |
| Public home / projects / services / volunteers | unified Nav + Home/Projects with donation CTAs |
| Role-aware login | admin→`/Admin`; manager/employee→`/Admin/staff`; project member→`/Admin/projects`; else→`/user/main` |

## 4) Decisions

| ID | Summary |
|----|---------|
| D-28 | Phase B branch cut from Phase A tip (main lacked A merge) |
| D-29 | `/Admin/requests` = الطلبات (services); join moved under المتطوعون |
| D-30 | No public executive view — staff-only under الكادر |
| D-31 | Water supply list API (ReadOnly ViewSet, no model change) for الطلبات |
| D-32 | Public Projects page uses platform API + donation CTAs; hide CTA when unset |

## 5) Gates

| Gate | Result |
|------|--------|
| `tsc --noEmit` | clean |
| `npm run build` | clean; largest app chunk admin ~59KB; vendor-react 231KB &lt; 250KB |
| vitest | **27/27** (legacy redirects expanded) |
| backend `manage.py test` | **112 OK** (1 skipped) |

## 6) No feature removed

Every prior admin page and public surface is reachable via a canonical domain path or an explicit redirect (see §2–§3). Water supply gained admin list visibility under الطلبات without dropping the public form.
