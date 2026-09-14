# UX3 Phase 6 — Home/About Content CMS

## Content seeding

Migration `core/migrations/0005_seed_content_pages.py` uses `get_or_create` for published `StaticPage` rows (no new DB columns):

| slug | title (seed) | body (seed) |
|------|--------------|-------------|
| `home` | تكافل وأثر | مقدمة الصفحة الرئيسية (فقرة العمل الخيري) |
| `about-mission` | رسالتنا | نص بطاقة الرسالة |
| `about-values` | قيمنا | نص بطاقة القيم |
| `about-community` | مجتمعنا | نص بطاقة المجتمع |

Existing `about` slug (hero title/body from `0001_platform_settings`) is unchanged.

Re-running the migration is idempotent: only missing slugs are created; existing rows are not overwritten.

## Frontend wiring

### `Home.tsx`
- Reads `pageBySlug("home")` from `usePlatformSettings`.
- **Headline:** CMS `title` when present; otherwise `displayPlatformName(platform_name)`.
- **Intro:** CMS `body` when present; otherwise hardcoded Arabic fallback.

### `About.tsx`
- Hero: existing `about` slug (title + body).
- Three cards: `about-mission`, `about-values`, `about-community` mapped in order to Target / HandHeart / Users icons.
- Each card falls back to the previous hardcoded title/text if the slug is missing or unpublished.

Admin edits flow through `/Admin/settings` static-pages tab → `PATCH /api/static-pages/:slug/` → public cache via `/api/public-settings/`.

## Privacy notes

- Public settings payload exposes only `slug`, `title`, `body` for **published** pages — no `is_published` flag, no internal IDs.
- Public dynamic forms (`/api/public-forms/`) list metadata only; submissions remain **IsAdmin** (no PII on public endpoints).
- Maps child DELETE (layers/fields/items) remains project-scoped (`can_edit` on the parent map) — see Phase 5.

## NON-ISSUES (deferred / out of scope)

| Ref | Topic | Rationale |
|-----|-------|-----------|
| **3.8** | Staff IA restructure | Current `/Admin/staff` + `/Admin/staff/manage` layout is intentional for this release; no IA change in UX3. |
| **8.1** | Volunteer notification preferences | Per-user prefs UI not in scope; broadcast + in-app notifications remain admin-driven. |

## Verification

```bash
cd backend && ./venv/bin/python manage.py migrate core
cd backend && ./venv/bin/python manage.py check --deploy   # may warn SECRET_KEY in DEBUG
cd backend && ./venv/bin/python manage.py test projects services maps core accounts --verbosity=1
cd frontend && npm run build && npm test -- --run
```

### Gate results

| Gate | Result |
|------|--------|
| `manage.py check --deploy` | **PASS** (exit 0) — 6 expected dev warnings: `SECRET_KEY` length/prefix, `DEBUG=True`, HSTS/SSL/secure cookies |
| `manage.py test projects services maps core accounts` | **215/219 pass**, 3 pre-existing failures (`core.tests_security*`, `core.tests_security_phase2` — GPS validation + sponsorship pay when payments disabled), 1 skipped |
| `manage.py test core.tests_platform_settings core.tests_activity` | **10/10 pass** (includes `0005_seed_content_pages` migration) |
| `npm run build` | **PASS** |
| `npm test -- --run` | **180/181 pass** — 1 pre-existing failure (`dsAdoption.test.ts` raw `<select>` in PlatformSettings.tsx, unrelated to Phase 6) |
