# WorkOrdr — Field Service Management MVP

A production-ready MVP for managing the full job lifecycle:
**Customer → Job → Schedule → Technician → Complete → Invoice → Payment → Dashboard**

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLAlchemy + PostgreSQL |
| Frontend | React + Vite + TailwindCSS |
| Mobile | React Native + Expo |
| Payments | Stripe (test mode) |

---

## Quick Start

### 1. Start the Database

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432.

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env and add your Stripe secret key

# Start the API server
uvicorn app.main:app --reload
```

API runs at: http://localhost:8000
Swagger docs: http://localhost:8000/docs

**Seed sample data (optional):**
```bash
python seed.py
```

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create env file for Stripe publishable key
echo "VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here" > .env

# Start dev server
npm run dev
```

App runs at: http://localhost:5173

---

### 4. Mobile Setup

```bash
cd mobile

# Install dependencies
npm install

# If testing on a physical device, update the BASE_URL in:
# src/api/client.js → change localhost to your machine's local IP

# Start Expo
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android).

---

## Stripe Test Mode

To enable payments:

1. Sign up at https://stripe.com (free)
2. Get your test API keys from the Stripe Dashboard
3. Add to `backend/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```
4. Add to `frontend/.env`:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

**Test card:** `4242 4242 4242 4242` · Any future date · Any CVC

---

## Running Tests

```bash
cd backend

# Create test database first
createdb workordr_test   # or via psql

# Run tests
pytest tests/ -v
```

---

## Full Workflow

```
1.  [Web]    Go to Customers → create a customer
2.  [Web]    Go to Jobs → create a job (link to customer)
3.  [Web]    Go to Dispatch → schedule the job (pick technician + time)
4.  [Mobile] Open Expo app → see the assigned job in Job List
5.  [Mobile] Tap the job → Job Details → tap "Start Job"
6.  [Mobile] Add notes in Job Execution screen
7.  [Mobile] Tap "Mark Complete & Invoice"
8.  [Mobile] Add line items (labor, parts, etc.) → tap "Create Invoice"
9.  [Web]    Go to Invoices → click the invoice → tap "Pay Now"
10. [Web]    Enter test card → payment confirmed
11. [Web]    Dashboard → see updated revenue and stats
```

---

## Project Structure

```
workordr/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── database.py      # SQLAlchemy setup
│   │   ├── models.py        # DB models (customers, jobs, invoices...)
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   └── routers/         # One file per resource
│   ├── seed.py              # Sample data seeder
│   ├── tests/test_api.py    # API tests
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Customers, Jobs, Dispatch, Invoices
│       ├── components/      # Layout, StatusBadge
│       └── api/client.js    # All API calls
├── mobile/
│   └── src/
│       ├── screens/         # JobList, JobDetails, JobExecution, CompleteJob
│       └── navigation/      # React Navigation stack
└── docker-compose.yml       # PostgreSQL only
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /customers | Create customer |
| GET | /customers | List customers |
| POST | /technicians | Create technician |
| GET | /technicians | List technicians |
| POST | /jobs | Create job |
| GET | /jobs | List jobs (filter by status, technician) |
| PATCH | /jobs/{id}/status | Update job status |
| POST | /schedules | Schedule a job |
| GET | /schedules | List schedules (filter by date) |
| POST | /invoices | Create invoice from completed job |
| GET | /invoices | List invoices |
| POST | /payments/create-intent | Create Stripe PaymentIntent |
| POST | /payments/confirm | Confirm payment, mark invoice paid |
| GET | /dashboard/stats | Aggregated stats |
