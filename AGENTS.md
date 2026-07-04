# AGENTS.md

## Cursor Cloud specific instructions

Takaful Platform is a full-stack Arabic RTL volunteering app. It is a monorepo with three parts:
`backend/` (Django REST API), `frontend/` (React + Vite + TypeScript SPA), and `design-system/`
(static CSS/token package, no runtime service).

### Services

| Service | Dir | Start command | Port |
|---------|-----|---------------|------|
| Backend API (Django) | `backend/` | `./venv/bin/python manage.py runserver 0.0.0.0:8000` | 8000 |
| Frontend SPA (Vite) | `frontend/` | `npm run dev` | 3000 |
| Database | — | none (defaults to SQLite `backend/db.sqlite3`; PostgreSQL only if `DATABASE_URL` is set) | — |

The backend dependencies live in a virtualenv at `backend/venv` (the update script creates/refreshes it).
Always invoke backend management commands via `backend/venv/bin/python manage.py <cmd>`.

### Non-obvious caveats

- **Login uses EMAIL, not username or phone.** The JWT endpoint (`/api/accounts/auth/token/`) authenticates
  by email + password. Registering collects a phone number, but it cannot be used to log in.
- **Admin user**: `python manage.py create_admin` creates a Django superuser `admin` / `admin123`
  (email `admin@takaful.com`), usable at `/admin/` and for admin API/portal flows. Re-running is idempotent.
- **Seed data**: `python manage.py import_excel_data` imports ~13 projects and ~2289 volunteers from the
  bundled `backend/data_*.xlsx`. The app runs fine without it (empty data). Run once after migrate.
- **CORS / dev port**: the frontend dev server runs on port **3000**, but the backend's default
  `CORS_ALLOWED_ORIGINS` does NOT include it. A gitignored `backend/.env` adds `http://localhost:3000`
  and `http://127.0.0.1:3000` so the SPA can reach the API. If `.env` is missing, recreate it with those
  CORS origins (plus `SECRET_KEY`, `DEBUG=True`) or browser API calls will fail with CORS errors.
- **Frontend host**: Vite binds to `localhost` only. Use `http://localhost:3000` (not `127.0.0.1:3000`).
- **Frontend → backend URL**: the SPA reads `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8000`).
- Health check: `GET http://127.0.0.1:8000/api/ping/` returns `{"message":"Takaful backend is working"}`.

### Checks / build

- Frontend type-check + build: `npm run build` (runs `tsc && vite build`). There is no separate lint script.
- Backend sanity check: `./venv/bin/python manage.py check`.
