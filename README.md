# WorkOrdr

Field Service Management MVP — manage the full job lifecycle from customer creation to payment collection.

**Stack:** FastAPI · PostgreSQL · React · Tailwind · React Native · Stripe

---

## Prerequisites

Make sure you have these installed before starting:

- Python 3.11+
- Node.js 18+
- PostgreSQL (via [Homebrew](https://brew.sh) or [Docker](https://docker.com))
- Expo Go app on your phone (for mobile)

---

## 1. Database Setup

### Option A — Homebrew (recommended for Mac)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb workordr
```

### Option B — Docker

```bash
docker compose up -d
```

---

## 2. Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
nano .env
```

Edit `.env` with your values:

```env
# Homebrew Postgres (replace "yourname" with your Mac username)
DATABASE_URL=postgresql://yourname@localhost:5432/workordr

# Docker Postgres
DATABASE_URL=postgresql://postgres:password@localhost:5432/workordr

# Stripe test keys (get from stripe.com → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Start the server:

```bash
uvicorn app.main:app --reload
```

Backend runs at: **http://localhost:8000**
Swagger API docs: **http://localhost:8000/docs**

---

## 3. Seed Sample Data

In a new terminal (with venv active):

```bash
cd backend
source venv/bin/activate
python3 seed.py
```

This creates:
- 3 customers (Alice, Bob, Carol)
- 2 technicians (Mike, Sarah)
- 5 jobs (mix of statuses)
- 3 schedules

---

## 4. Frontend

In a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Set Stripe publishable key
echo "VITE_STRIPE_PUBLISHABLE_KEY=pk_test_..." > .env

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 5. Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start
```

Then scan the QR code with **Expo Go** on your phone.

> **Physical device?** Update `BASE_URL` in `mobile/src/api/client.js` from `localhost` to your Mac's local IP address (e.g. `192.168.1.100`).

---

## Running Everything Together

You need **3 terminal tabs** running simultaneously:

| Tab | Command | URL |
|-----|---------|-----|
| 1 - Backend | `cd backend && source venv/bin/activate && uvicorn app.main:app --reload` | localhost:8000 |
| 2 - Frontend | `cd frontend && npm run dev` | localhost:5173 |
| 3 - Mobile | `cd mobile && npx expo start` | Expo QR code |

---

## Full Workflow

```
1.  [Web]    Customers page   → Create a customer
2.  [Web]    Jobs page        → Create a job (link to customer)
3.  [Web]    Dispatch page    → Schedule the job (pick technician + time)
4.  [Mobile] Job List         → Technician sees assigned jobs
5.  [Mobile] Job Details      → Tap "Start Job" → status: In Progress
6.  [Mobile] Job Execution    → Add notes about the work
7.  [Mobile] Complete Job     → Add line items (labor, parts) → Create Invoice
8.  [Web]    Invoices page    → Click invoice → tap "Pay Now"
9.  [Web]    Stripe checkout  → Use test card: 4242 4242 4242 4242
10. [Web]    Dashboard        → See updated revenue and job stats
```

---

## Stripe Test Card

```
Card number:  4242 4242 4242 4242
Expiry:       Any future date (e.g. 12/26)
CVC:          Any 3 digits (e.g. 123)
```

---

## Project Structure

```
workordr/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── database.py       # SQLAlchemy + session
│   │   ├── models.py         # DB models
│   │   ├── schemas.py        # Pydantic schemas
│   │   └── routers/          # customers, jobs, schedules,
│   │                         # invoices, payments, dashboard
│   ├── seed.py               # Sample data
│   ├── tests/test_api.py     # API tests
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── pages/            # Dashboard, Customers, Jobs,
│       │                     # DispatchBoard, Invoices
│       ├── components/       # Layout, StatusBadge
│       └── api/client.js     # All API calls
│
├── mobile/
│   └── src/
│       ├── screens/          # JobList, JobDetails,
│       │                     # JobExecution, CompleteJob
│       └── navigation/       # React Navigation stack
│
└── docker-compose.yml        # PostgreSQL only
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /customers | Create customer |
| GET | /customers | List customers |
| POST | /technicians | Create technician |
| GET | /technicians | List technicians |
| POST | /jobs | Create job |
| GET | /jobs | List jobs (filter: status, technician_id) |
| GET | /jobs/{id} | Get job detail |
| PATCH | /jobs/{id}/status | Update job status |
| POST | /schedules | Schedule a job |
| GET | /schedules | List schedules (filter: date) |
| POST | /invoices | Create invoice from completed job |
| GET | /invoices | List invoices |
| GET | /invoices/{id} | Get invoice detail |
| POST | /payments/create-intent | Create Stripe PaymentIntent |
| POST | /payments/confirm | Confirm payment, mark invoice paid |
| GET | /dashboard/stats | Aggregated stats |

---

## Run Tests

```bash
cd backend
source venv/bin/activate

# Create a test database first
createdb workordr_test

# Run tests
pytest tests/ -v
```
