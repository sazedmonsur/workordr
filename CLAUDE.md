# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**WorkOrdr** — B2B field service management SaaS, competing with ServiceTitan/Jobber. Helps service businesses (HVAC, plumbing, cleaning, etc.) manage scheduling, dispatch, technicians, invoicing, and payments.

GitHub: https://github.com/sazedmonsur/workordr

**Phase 2 is complete.** Do not rebuild from scratch. Extend the existing architecture.

---

## Running the stack

Three terminals required:

```bash
# 1. Database
docker compose up -d

# 2. Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Swagger: http://localhost:8000/docs

# 3. Frontend
cd frontend
npm run dev
# App: http://localhost:5173

# 4. Mobile (optional)
cd mobile
npx expo start
```

Frontend proxies `/api/*` → `http://127.0.0.1:8000` via Vite. Backend reads `DATABASE_URL` from `backend/.env`.

---

## Tests

```bash
cd backend
createdb workordr_test   # first time only
pytest tests/ -v

# Single test file
pytest tests/test_phase2.py -v
```

---

## Architecture

### Backend (`backend/app/`)

- `main.py` — FastAPI app, mounts all routers, calls `Base.metadata.create_all` on startup (auto-migrates)
- `models.py` — all SQLAlchemy models in one file
- `schemas.py` — all Pydantic schemas in one file
- `database.py` — engine + `get_db` dependency
- `routers/` — one file per domain (customers, technicians, services, jobs, schedules, invoices, payments, bookings, availability, analytics, dashboard, notifications_log)
- `notifications/provider.py` — abstract `NotificationProvider` + `MockNotificationProvider` (logs to stdout). Swap in SendGrid/Twilio by subclassing and replacing `_provider` in `events.py`
- `notifications/events.py` — `notify(db, event_type, recipient_email, recipient_phone, data)` — call this after any key domain event; it logs to `notification_logs` and calls the provider

### Job status lifecycle

```
pending → requested → scheduled → assigned → en_route → in_progress → completed → invoiced → paid
                                                                                 ↘ cancelled (any stage)
```

All transitions are recorded in `job_status_history`. Valid statuses defined in `routers/jobs.py::VALID_STATUSES`.

### Data model relationships

- `Job` → `Customer`, `Technician`, `Service`, `Schedule` (1:1), `Invoice` (1:1), `JobStatusHistory` (1:many)
- `Technician` → `TechnicianService` (many-many to `Service`), `AvailabilitySlot`
- `Invoice` → `InvoiceItem` (line items)

Denormalised scheduling fields (`scheduled_at`, `scheduled_end_at`) live on `Job` for fast querying; `Schedule` is the authoritative source.

### Frontend (`frontend/src/`)

- `App.jsx` — routing. Admin portal wrapped in `<Layout>`. Public pages (`/book`, `/invoice/:id/pay`) have no sidebar.
- `pages/` — one file per page. Dispatch board (`DispatchBoard.jsx`) uses `@hello-pangea/dnd` for drag-and-drop.
- `api/client.js` — all axios calls centralised here. Base URL is `/api` (Vite proxies to backend).
- `components/Layout.jsx` — sidebar nav, `components/StatusBadge.jsx` — reusable status pill.

### Mobile (`mobile/src/`)

- `api/client.js` — hardcoded `BASE_URL = 'http://10.0.0.63:8000'`. **Update this to your LAN IP** for physical device testing. Android emulator uses `10.0.2.2`, iOS simulator uses `localhost`.
- `context/AuthContext.jsx` — stores selected technician (no real auth — technician picks their name from a list on login)
- `navigation/AppNavigator.jsx` — Stack (Login) → Tabs (Jobs stack + Availability)

---

## Key known gaps

| Gap | Notes |
|-----|-------|
| No auth on admin portal | `allow_origins=["*"]`, all endpoints public |
| Notifications are mock | Real provider hook is ready in `notifications/provider.py` |
| Mobile IP hardcoded | `mobile/src/api/client.js` line 3 |
| Photos not implemented | Phase 2 spec mentioned it, skipped |
| No multi-tenancy | Single business only |

---

## Stripe

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

Payment flow: `POST /payments/create-intent` → `POST /payments/confirm` → invoice status updates to `paid`.

## Notifications

To fire a notification after a domain event:
```python
from app.notifications.events import notify
notify(db, "booking_created", recipient_email=customer.email, recipient_phone=customer.phone, data={...})
```

Supported event types: `booking_created`, `booking_confirmed`, `technician_assigned`, `job_completed`, `invoice_generated`, `payment_received`, `reminder_sent`.
