# CLARIFICATION REPORT — raw admin UX / project slug / tool JSON / sponsorships portal

**Scope:** diagnostic only (no product code changes).  
**Base:** `main` @ `4a417ac` (`merge(fix/ux2-sweep): UX2 stack into main`).  
**Method:** static evidence from current tree (`file:line`).

---

## A. Recurring pattern — raw structures in admin

### A1. Full inventory (every admin place that exposes a slug / ID / enum / JSON / technical key as editable or visible)

Definition used: **anything a non-developer admin can see or type that is a machine key, raw JSON, English enum code, or numeric/tech ID**, not an Arabic label-only control.

| # | File:line | What is shown / edited | Kind |
|---|-----------|------------------------|------|
| 1 | `frontend/src/components/pages/admin/PlatformProjects.tsx:316` | Create form field labeled `رابط مختصر (slug)` — **required**, `dir="ltr"` | Editable slug |
| 2 | `frontend/src/components/pages/admin/PlatformProjects.tsx:408–438` | Tool settings as **raw JSON** textarea (`إعداد الأداة (JSON)`), `font-mono`, hint string of English keys | Editable JSON + tech keys |
| 3 | `frontend/src/components/pages/admin/PlatformProjects.tsx:39–44` | `TOOL_CONFIG_KEYS` hint text exposes English keys (`default_center`, `show_target_amount`, …) next to the JSON editor | Visible tech keys |
| 4 | `frontend/src/components/pages/admin/PlatformProjects.tsx:334` | Status badge fallback `{STATUS_LABELS[detail.status] \|\| detail.status}` — English status if map misses | Raw enum fallback |
| 5 | `frontend/src/components/pages/admin/PlatformProjects.tsx:455` | Member role fallback `MEMBER_ROLES.find(…)?.label \|\| m.role` — English role code if map misses | Raw enum fallback |
| 6 | `frontend/src/components/pages/admin/ProjectTypesAdmin.tsx:84` | Create field `المعرّف (slug)` **required** | Editable slug |
| 7 | `frontend/src/components/pages/admin/ProjectTypesAdmin.tsx:100` | List row shows raw `t.slug` | Visible slug |
| 8 | `frontend/src/components/pages/admin/RequestFormsAdmin.tsx:225–230` | Field `رابط النموذج (يُنشأ تلقائياً)` still editable slug | Editable slug |
| 9 | `frontend/src/components/pages/admin/RequestFormsAdmin.tsx:179` | Public URL shown as `<code>/forms/{selected.slug}</code>` | Visible slug path |
| 10 | `frontend/src/components/pages/admin/RequestFormsAdmin.tsx:187` | Submission status `{SUB_STATUS[s.status] \|\| s.status}` | Raw enum fallback |
| 11 | `frontend/src/components/pages/admin/RequestFormsAdmin.tsx:192–194` | Submission `data` keys shown as `labelMap[k] \|\| k` | Tech key fallback |
| 12 | `frontend/src/components/pages/admin/MapsAdmin.tsx:240` | Field list shows `<code>{f.key}</code>` | Visible tech key |
| 13 | `frontend/src/components/pages/admin/MapsAdmin.tsx:263` | Input `المفتاح (تلقائي)` — editable machine key | Editable tech key |
| 14 | `frontend/src/components/pages/admin/PlatformSettings.tsx:172` | Static page title row shows `/{p.slug}` | Visible slug |
| 15 | `frontend/src/components/pages/admin/ActivityLogAdmin.tsx:67` | Column renders `` `${r.target_type} #${r.target_id}` `` (e.g. `Project #12`) | Visible type + ID |
| 16 | `frontend/src/components/pages/admin/ActivityLogAdmin.tsx:83` | Filter `معرّف المنفّذ` — numeric actor ID | Editable ID |
| 17 | `frontend/src/components/pages/admin/ServiceRequests.tsx:53` | Badge `{statusLabel[r.status] \|\| r.status}` — English codes (`DONE`, `APPROVED`, …) on miss | Raw enum fallback |
| 18 | `frontend/src/components/pages/admin/WaterSupplyRequests.tsx:62` | Badge shows **raw** `r.status` with no Arabic map | Raw enum |
| 19 | `frontend/src/components/pages/saqya/AdminPortal.tsx:96` | Order cards show **raw** `{o.status}` (no Arabic map; sponsorships tab does map at `:79`) | Raw enum |
| 20 | `frontend/src/components/pages/admin/PlatformProjects.tsx:285,339` | Opens `/projects/${slug}/sponsorships` in **new tab** (not admin shell) — structural UX leak into Saqya portal | Integration smell (related) |

**Full count of distinct raw exposures under the definition above: 19 UI surfaces (rows 1–19).**  
Row 20 is not a “raw field” but is the sponsorship navigation smell covered in §D.

**Explicitly out of scope for A1 (labeled controls with Arabic options):**  
`UsersAdmin` role `<Select>` uses `ROLE_OPTIONS` / `labelAr` — English values are wire values only, labels are Arabic.

### A2. Why each stayed raw (honest)

| Cluster | Real reason |
|---------|-------------|
| **Project slug required (1)** | Backend `Project.slug` is a required unique `SlugField` with **no** `save()`/`perform_create` auto-slugify. Create API is a plain ModelViewSet create (`ProjectViewSet.create` / `perform_create` only sets `created_by`). FE mirrored the API 1:1. Not a missing schema — **missing product decision to auto-generate**. Shortcut: ship create form fast. |
| **Tool config JSON (2–3)** | Backend already has `TOOL_CONFIG_SCHEMA` + validation, but **no schema endpoint** and **no shared FE form generator**. Phase work added a labeled `Textarea` + duplicated hint strings (`TOOL_CONFIG_KEYS`) instead of schema-driven controls. Classic **deadline shortcut**: validate on server, let admin type JSON. |
| **Type / form / page slugs (6–9, 14)** | Same URL-identity pattern: slug is the public address. Types require manual slug; request forms auto-fill from title but still expose the key; static pages show path for editors. **Unclear UX requirement** (“admins must see the URL”) + copy-paste of slug fields across admin screens. |
| **Map field keys (12–13)** | Dynamic schema needs stable keys in stored item `data`. Auto-from-label exists, but key remains visible/editable. **Schema necessity** for data shape, **not** wrapped as advanced-only. |
| **Activity log type#id + actor id (15–16)** | Audit UI built as thin API mirror. **No Arabic target catalog** / actor picker. Deadline + “admin can read IDs”. |
| **Status fallbacks / raw order status (4–5, 10–11, 17–19)** | Partial i18n maps with `\|\| raw` (or no map). **Incomplete labeling**, not intentional product design. Saqya orders never got an Arabic status map while sponsorships did. |

**Pattern root cause (one sentence):**  
Admin screens were built as **authenticated API consoles** (slug + JSON + English enums) and UX2 Phase 1 only banned **unlabeled native `<input|textarea|select>`**, so labeled-but-still-raw JSON/slug/ID passed the gate.

---

## B. Project form — slug («رابط مختصر»)

### B1. Required from user? Can it be auto-generated?

**Today: required from the user. No auto-generation on create.**

| Layer | Evidence |
|-------|----------|
| Model | `backend/projects/models.py:37` — `slug = models.SlugField(unique=True, allow_unicode=True)` (no blank, no default) |
| Admin serializer | `ProjectAdminSerializer` includes `"slug"` in writable `fields`; `read_only_fields` are only `created_by`, `created_at`, `updated_at` (`backend/projects/serializers.py` ~53–73) |
| Create view | `ProjectViewSet.create` / `perform_create` (`backend/projects/views.py` ~116–135): permission check + `serializer.save(created_by=…)` — **no slugify** |
| FE create | `PlatformProjects.tsx:316` — `required` slug input; payload sends `slug: form.slug` (~96–101) |

Contrast: `RequestFormsAdmin` **does** auto-slug from title (`autoSlugFromLabel`) — projects do not.

### B2. If auto-generation is added, what breaks?

**Nothing fundamental breaks** if slug remains unique and stable after create. Almost all runtime routing already **consumes** slug rather than assuming the human typed it:

- Public routes: `/projects/:slug`, `/projects/:slug/map`, `/projects/:slug/sponsorships` (`App.tsx:168–170`)
- Tool links: `toolLinks.ts` builds paths from `ctx.slug`
- APIs: `public_project_detail(request, slug)`, sponsorships `?project=<slug>` filter
- Admin project mutations use **numeric id** (`/api/platform/projects/${id}/…`) — create is the main place slug is user-supplied

**Risks to handle (not blockers):**

1. **Uniqueness collisions** when two names slugify alike — need suffix (`-2`) like forms.
2. **Unicode / empty name** — `allow_unicode=True` already; empty name cannot slugify.
3. **Existing data** — unchanged; only create path changes.
4. **Admins who rely on choosing vanity URLs** — still want an optional override after auto-fill (same pattern as request forms).
5. **Hint/docs** that say “enter slug” — copy updates only.

No redirect table hard-codes user-provided slugs beyond stored DB values.

---

## C. Project tools config (JSON problem)

### C1. Why FE edits raw JSON despite `TOOL_CONFIG_SCHEMA`?

Because the schema is a **backend validation artifact**, not a FE form contract:

1. `set_tool` calls `validate_tool_config` and returns 400 on bad keys/types (`backend/projects/views.py` ~248–259).
2. FE never imports or fetches that schema; it only duplicates a **string hint** in `TOOL_CONFIG_KEYS` (`PlatformProjects.tsx:38–44`) and edits `JSON.stringify(config)` in a textarea (`:424–438`).
3. UX2 Phase 1 replaced unlabeled controls with labeled DS wrappers — a labeled JSON box **satisfies** `dsAdoption.test.ts` while remaining raw.

So: **deadline shortcut + no FE binding to schema**, not “schema missing”.

### C2. Is the schema exposed to the frontend?

**Backend-only today.**

- Defined in `backend/projects/tool_config.py:13–31` as `TOOL_CONFIG_SCHEMA`.
- Documented in `PROJECT_TOOLS.md`.
- Used by tests + `set_tool` validation.
- **No** DRF endpoint / OpenAPI export / shared TS constant generated from it.
- Grep shows FE references only the hand-maintained hint object in `PlatformProjects.tsx`.

**Cleanest sync options (proposal only):**

1. **Preferred:** `GET /api/platform/tool-config-schema/` returning `{ tool_key: { key: { type, label_ar, enum?, min?, max? } } }` — single runtime source; FE renders Switch/Number/Select/LatLng from `type`.
2. **Build-time:** codegen script `tool_config.py` → a generated FE module (e.g. under `frontend/src/admin/`) in CI (fails if drift). *(path not present today — proposal only.)*
3. **Weaker:** keep editing JSON but stop claiming sync via comments — do not recommend.

### C3. Per-tool keys, types, and meaning

Authoritative: `backend/projects/tool_config.py` + `PROJECT_TOOLS.md`.

| Tool | Key | Type | What it does |
|------|-----|------|----------------|
| **map** | `default_center` | `latlng` `[lat,lng]` | Default map center for project map UX (validated lat∈[-90,90], lng∈[-180,180]) |
| **map** | `default_zoom` | `int` 1..20 | Default zoom level |
| **sponsorships** | `show_target_amount` | `bool` | Whether to show a target funding amount in sponsorship UX |
| **sponsorships** | `target_amount` | `number` ≥ 0 | That target amount value |
| **volunteering** | `show_opportunities` | `bool` | Whether to surface volunteering opportunities for the project |
| **services** | `request_form` | `str` enum `service` \| `water_supply` | Which public request flow to wire (`toolLinks.ts` branches on this) |
| **services** | `show_request_button` | `bool` | Whether to show the request CTA |
| **reports** | `public` | `bool` | Marks reports tool as public-capable; tool is treated as admin-oriented / not a public card when unwired |

**Consumption note:** besides `services.request_form` (routing in `toolLinks.ts`), several flags are stored/validated but lightly used in FE rendering — another reason a JSON dump felt “good enough” during wiring.

---

## D. Sponsorship portal integration

### D1. What renders at `/projects/:slug/sponsorships`?

Trace on current `main`:

1. **Route** — `App.tsx:170`  
   `path="/projects/:slug/sponsorships"` → `<SaqyaHome />`
2. **Chrome** — `App.tsx:94–98`  
   `isSaqyaPage` true → `hideChrome` → **no site Navbar/Footer**; also **outside** `AdminShell`
3. **Dispatcher** — `frontend/src/components/pages/saqya/index.tsx:14–34`  
   `SaqyaHome` reads auth + `slug`; if `user.role === "admin"` → `<AdminPortal projectSlug={slug} />`
4. **Admin UI** — `AdminPortal.tsx:20+` wrapped in **`SaqyaShell`** (`:64–108`)
5. **Shell** — `frontend/src/components/layout/SaqyaShell.tsx:14–38`  
   Standalone “كفالات السقيا” header + **خروج** button

Donor/supplier/representative get their own portals under the same shell; other roles get “غير متاح لدورك”.

### D2. Integrated into admin dashboard shell?

**No. Evidence:**

| Check | Evidence |
|-------|----------|
| Admin app routes use `AdminShell` | Admin pages under `/Admin/...` |
| Sponsorship URL is **not** under `/Admin` | `App.tsx:170` |
| Opens from projects admin via `target="_blank"` | `PlatformProjects.tsx:285,339` |
| Portal uses `SaqyaShell`, not `AdminShell` | `AdminPortal.tsx:4,64` |
| Own logout control | `SaqyaShell.tsx:28–34` |

This is still the **pre-merge / standalone Saqya multi-role shell**, project-scoped via query param, not an admin-domain panel.

### D3. Logout button — which, what it calls, why session ends

| Item | Detail |
|------|--------|
| **Button** | Header control labeled **«خروج»** with `LogOut` icon in `SaqyaShell.tsx:28–34` |
| **Handler** | `logout().then(() => nav("/signin"))` |
| **Effect** | Clears the **shared** auth session (JWT / auth context), then routes to sign-in |
| **Why it feels like “leave project → kicked out”** | Admin arrived from `/Admin/projects` via **new tab** into a shell that only offers **full logout**, not “رجوع للوحة الإدارة”. There is no “back to Admin” action in `SaqyaShell`. |

Not a random 401 from listing sponsorships; it is an explicit logout affordance on the embedded portal chrome.

### D4. Backend models / services / permissions after refactors

**Intact and role-wired**, under app `sponsorships` mounted at legacy `/api/saqya/` and `/api/sponsorships/` (`backend/takaful_backend/urls.py`).

| Piece | Status |
|-------|--------|
| Permissions | `IsSaqyaAdmin` = authenticated + `has_capability(..., CAP_APPROVE_SPONSORSHIP)` (`sponsorships/permissions.py`) |
| Admin role | `CAP_APPROVE_SPONSORSHIP` included in `_ADMIN` (`core/roles.py`) |
| List/dashboard | `IsAuthenticated`; queryset scoped — admin sees all; optional `?project=` filter (`views.py`) |
| Approve/reject/assign | `IsSaqyaAdmin` on those actions |

**401 vs 403 for a logged-in platform admin:**

- Valid admin session → list/dashboard/actions should be **200**, not 401.
- Wrong/missing capability → **403** (permission class), and Phase-2 `authFetch` **must not** clear session on 403 (`frontend/src/lib/api.ts` + `api.test.ts`).
- **401** only if token missing/expired/refresh fails → then `clearSession()` (genuine session end).

**FE role gate caveat:** `SaqyaHome` only mounts `AdminPortal` when `user.role === "admin"`. A staff user (`manager` / `employee`) hitting the same URL gets the “غير متاح” card even if some APIs might differ — product gap, not a silent 401.

### D5. Cleanest integration (proposal before build)

**Split admin management from public/donor portal; share one session; one logout surface.**

1. **Keep** `/projects/:slug/sponsorships` as the **public/multi-role Saqya entry** (donor/supplier/representative + unauthenticated → sign-in). Optionally redirect `role===admin"` away from this URL.
2. **Add** an admin-domain route, e.g. `/Admin/projects/:slug/sponsorships` (or a tab inside project detail modal), rendered **inside `AdminShell`**.
3. **Extract** presentational body of `AdminPortal` (KPIs, tabs, lists, assign) into a shared component **without** `SaqyaShell`.
4. **Change** `PlatformProjects` links from `target="_blank"` + public path → in-app `Link`/`navigate` to the Admin route.
5. **Do not** put `SaqyaShell`’s «خروج» on admin management; AdminShell already owns logout.
6. Permissions stay `CAP_APPROVE_SPONSORSHIP`; pass `project` query/slug into existing APIs (already supported).

This preserves donor flow public where it must stay public, and stops admin from entering a second product chrome.

---

## E. Why previous UX fixes did not hold

### E1. What P1–P5 / “100/100 frontend tests” actually covered vs your reports

| Your issue | Covered by current suite? | Evidence |
|------------|---------------------------|----------|
| Unlabeled raw HTML inputs in admin/saqya/layout | **Yes** | `frontend/src/admin/dsAdoption.test.ts` — scans for lowercase `<input\|textarea\|select>` without `aria-label` |
| 403 must not log out; 401 refresh behavior | **Yes** | `frontend/src/lib/api.test.ts` |
| Role vocabulary / staff path access | **Partial** | `frontend/src/admin/access.test.ts` (path gates), not full UX |
| Tool link routing by `request_form` | **Yes** | `toolLinks.test.ts` |
| Backend tool config validation | **Yes** | `backend/projects/tests_tool_config.py` |
| **Raw JSON tool editor shown to admins** | **No** | No test asserts absence of JSON editing / presence of schema-driven fields |
| **Required manual project slug** | **No** | No UX test; backend tests send slug explicitly |
| **Sponsorships opened outside AdminShell / Saqya logout** | **No** | No routing/shell integration test; legacy redirect tests don’t assert shell |
| **Raw English status / type#id / field keys** | **No** | dsAdoption allows any labeled control including mono JSON and slug inputs |
| “100/100 frontend tests” | Means **unit/guard suite green**, not “admin UX complete” | Vitest does not drive Admin → sponsorships → خروج |

**Bottom line:** Phase 1 proved **DS wrapper adoption**, not **semantic humanization**. The regressions you see were **never in the acceptance definition** of those tests.

### E2. What check would have caught these before manual QA?

Not necessarily more unit tests alone — **contract / lint / smoke** checks:

1. **Semantic raw-data guard (static):** fail CI if admin TSX matches:
   - `JSON.stringify` fed into a form control for `config`/`tool`
   - labels containing `(JSON)` / `(slug)` / `font-mono` textareas for config
   - `target="_blank"` from `/Admin` to `/projects/*/sponsorships`
2. **Shell integration test:** render `/Admin/projects` → open sponsorships link → assert resulting tree is under `AdminShell` and **no** `SaqyaShell` logout for admin management.
3. **Schema parity test:** `TOOL_CONFIG_SCHEMA` keys === FE form field keys (or FE fetches schema endpoint).
4. **Playwright smoke (admin):** create project without typing slug (expect auto); open sponsorships; click header button that looks like “leave”; expect stay signed-in on `/Admin/...`.
5. **i18n exhaustiveness:** ban `\|\| entity.status` / `\|\| entity.role` in admin pages (must use complete maps).

---

## Summary table (for the fix command)

| ID | Verdict |
|----|---------|
| A | 19 raw admin surfaces; root = API-console FE + DS tests only checking labels |
| B | Slug required end-to-end; auto-gen safe if unique + optional override |
| C | Schema backend-only; expose via GET schema (or codegen); then typed controls |
| D | Standalone `SaqyaShell` + «خروج»=`logout`; admin management must move under `AdminShell` |
| E | Prior “fixes” optimized for DS/auth/role gates; never asserted JSON/slug/shell integration |

**No code was changed for product behavior in this pass; this file is the deliverable.**
