# WorkOrdr

Field Service Management Platform — Phase 2.

**Stack:** FastAPI · PostgreSQL · React · Tailwind · React Native · Expo · Stripe

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL)
- Expo Go app on your phone

---

## 1. Database

```bash
docker compose up -d
```

---

## 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/workordr
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Run migration (first time only, adds Phase 2 columns):

```bash
python migrate_v2.py
```

Seed sample data:

```bash
python seed_v2.py
```

This creates:
- 10 services (HVAC, Plumbing, Appliance, Cleaning, Electrical)
- 5 technicians (Mike, Sarah, James, Priya, Carlos)
- 5 customers
- 8 jobs (mix of statuses)
- Schedules, availability blocks, invoices

Start server — **must use `--host 0.0.0.0`** for mobile app to connect:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: **http://localhost:8000**
- Swagger docs: **http://localhost:8000/docs**

---

## 3. Frontend

```bash
cd frontend
npm install
echo "VITE_STRIPE_PK=pk_test_..." > .env
npm run dev
```

Runs at: **http://localhost:5173**

| URL | Description |
|-----|-------------|
| `/dashboard` | Analytics overview |
| `/dispatch` | Drag-and-drop dispatch board |
| `/jobs` | Job management |
| `/technicians` | Technician management |
| `/services` | Service catalog |
| `/invoices` | Invoices + payment |
| `/notifications` | Notification log |
| `/book` | Customer booking page (public) |

---

## 4. Mobile

```bash
cd mobile
npm install
```

Update `src/api/client.js` — set your machine's LAN IP:

```js
const BASE_URL = 'http://YOUR_LAN_IP:8000'
```

Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

```bash
npx expo start
```

Scan the QR code with Expo Go.

---

## Running Everything

3 terminals:

| Tab | Command |
|-----|---------|
| Backend | `cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0` |
| Frontend | `cd frontend && npm run dev` |
| Mobile | `cd mobile && npx expo start` |

---

## Full Workflow

```
ADMIN PORTAL
1. Services page     → review/add service catalog
2. Technicians page  → add technicians, assign services
3. Jobs page         → create a job (pick customer + service)
4. Dispatch Board    → drag job to technician lane → set time → schedule
5. Dashboard         → monitor jobs today, revenue, workload

TECHNICIAN MOBILE
6. Login screen      → select your name
7. My Jobs → Today   → see assigned jobs
8. Tap job           → "Start Driving" → en_route
9. Tap again         → "Arrived — Start Job" → in_progress
10. Add Notes        → save work notes
11. Complete Job     → add line items → Create Invoice

ADMIN PORTAL (continued)
12. Invoices page    → invoice appears → Pay Now (on-site)
    OR customer gets payment link by email (when notifications are live)
13. Dashboard        → revenue updates

CUSTOMER BOOKING (public)
14. /book            → pick service → pick time slot → enter details → submit
15. /book/confirmed  → confirmation page
16. /invoice/:id/pay → customer pays invoice online
```

---

## Stripe Test Card

```
Number:  4242 4242 4242 4242
Expiry:  Any future date
CVC:     Any 3 digits
```

---

## Notifications

Currently **mock** — logs to uvicorn terminal, no real email/SMS sent.

To enable real notifications, implement `NotificationProvider` in:
`backend/app/notifications/provider.py`

Events fired automatically:
- `booking_created` — when customer submits booking
- `technician_assigned` — when job is scheduled
- `invoice_generated` — when invoice is created
- `payment_received` — when payment confirmed

View all notification attempts at `/notifications` in the admin portal.

---

## Project Structure

```
workordr/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── customers.py
│   │   │   ├── technicians.py
│   │   │   ├── jobs.py
│   │   │   ├── schedules.py
│   │   │   ├── services.py
│   │   │   ├── bookings.py
│   │   │   ├── availability.py
│   │   │   ├── invoices.py
│   │   │   ├── payments.py
│   │   │   ├── analytics.py
│   │   │   ├── notifications_log.py
│   │   │   └── dashboard.py
│   │   └── notifications/
│   │       ├── provider.py
│   │       └── events.py
│   ├── migrate_v2.py
│   ├── seed_v2.py
│   └── tests/
│       ├── test_api.py
│       └── test_phase2.py
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── DispatchBoard.jsx
│       │   ├── Jobs.jsx
│       │   ├── Technicians.jsx
│       │   ├── Services.jsx
│       │   ├── Invoices.jsx
│       │   ├── Customers.jsx
│       │   ├── NotificationsLog.jsx
│       │   ├── BookingPage.jsx
│       │   ├── BookingConfirmation.jsx
│       │   └── InvoiceView.jsx
│       ├── components/
│       │   ├── Layout.jsx
│       │   └── StatusBadge.jsx
│       └── api/client.js
│
├── mobile/
│   └── src/
│       ├── screens/
│       │   ├── LoginScreen.jsx
│       │   ├── JobListScreen.jsx
│       │   ├── JobDetailsScreen.jsx
│       │   ├── JobExecutionScreen.jsx
│       │   ├── CompleteJobScreen.jsx
│       │   └── AvailabilityScreen.jsx
│       ├── navigation/AppNavigator.jsx
│       ├── context/AuthContext.jsx
│       └── api/client.js
│
└── docker-compose.yml
```

---

## API Reference

### Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /dashboard/stats | Basic stats |
| GET | /admin/analytics/overview | Full analytics |

### Customers & Technicians
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | /customers | Create / list |
| POST/GET | /technicians | Create / list |
| PUT | /technicians/{id} | Update |
| POST/DELETE | /technicians/{id}/services/{sid} | Assign service |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /services | List / create |
| PUT | /services/{id} | Update / deactivate |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | /jobs | Create / list |
| PUT | /jobs/{id} | Update |
| PATCH | /jobs/{id}/status | Update status |
| POST | /jobs/{id}/complete | Complete job |
| POST | /jobs/{id}/notes | Add notes |
| GET | /jobs/{id}/history | Status history |
| GET | /jobs/admin/dispatch | Dispatch board data |

### Scheduling & Availability
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | /schedules | Schedule job / list |
| GET | /availability/search | Available slots |
| POST/GET | /availability/{tech_id} | Add / list blocks |
| DELETE | /availability/slot/{id} | Remove block |

### Bookings, Invoices, Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /bookings | Customer booking |
| POST/GET | /invoices | Create / list |
| GET | /invoices/{id} | Invoice detail |
| POST | /payments/create-intent | Stripe intent |
| POST | /payments/confirm | Confirm payment |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/notifications | View log |

---

## Tests

```bash
cd backend
createdb workordr_test
pytest tests/ -v
```
