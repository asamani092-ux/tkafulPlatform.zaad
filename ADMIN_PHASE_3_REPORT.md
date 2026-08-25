# ADMIN_PHASE_3_REPORT — Notifications Center

**Branch:** `feat/notifications-center`  
**Base:** `feat/platform-settings` (`31971a0`)  
**Date:** 2026-08-25

## What was done

- Extended `Notification` with `notification_type`, `link`, `event_type`; `is_read` remains derived from `status`.
- Added `NotificationPreference(user, event_type, enabled)` — missing row means enabled.
- Central `notify()` in `notifications/services.py`; viewsets call it on: service request, water-supply request, volunteer application, project status change, sponsorship approve/assign/deliver/documented.
- Endpoints: paginated my list (unread first), unread count, mark-read, mark-all-read, preferences GET/PUT, admin broadcast (throttled).
- Frontend: bell in AdminShell, UserShell, and authenticated Navbar; preferences on `/user/settings`; broadcast composer `/Admin/settings/broadcast`.

## Requirement → file / test

| Requirement | Location |
|-------------|----------|
| Models + migration | `backend/notifications/models.py`, `migrations/0002_notification_center.py` |
| `notify()` + event keys | `backend/notifications/services.py` |
| List / count / read / prefs / broadcast | `backend/notifications/views.py`, `urls.py` |
| Broadcast throttle | `backend/core/throttles.py` (`BroadcastRateThrottle`), settings rate `10/hour` |
| Domain hooks | `services/views.py`, `volunteering/views.py`, `projects/views.py`, `sponsorships/views.py` |
| Tests (15) | `backend/notifications/tests_center.py` |
| Bell | `frontend/src/components/layout/NotificationBell.tsx` |
| Preferences | `frontend/src/components/pages/user/Setting.tsx` |
| Broadcast UI | `frontend/src/components/pages/admin/BroadcastAdmin.tsx` |
| Labels + vitest | `frontend/src/admin/notifications.ts`, `notifications.test.ts` |
| Decision | `DECISIONS.md` D-40 |

## Gate results

### Backend suite
```
Ran 186 tests in 63.453s
OK (skipped=1)
```
(Phase 2: 171 → Phase 3: 186 = +15 notification-center tests.)

### `check --deploy`
```
System check identified no issues (0 silenced).
```

### Frontend
```
Test Files  9 passed (9)
     Tests  38 passed (38)
tsc && vite build → success
Largest JS chunk: vendor-react 230.96 kB (< 250KB gate)
```

## DECISIONS this phase
- **D-40** — In-platform only; `notify()` is the single helper; mute via preferences; broadcast throttled.

## Deferred
- Email/SMS remain out of scope. Legacy saqya `sponsorships/notifications.py` still creates a `Notification` plus optional email on assign/ready; platform `notify()` is additional and respects preferences.

## Next
Phase 4 on `feat/roles-visibility` from this head.
