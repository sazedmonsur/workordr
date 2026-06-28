# WorkOrdr — Next Phase Plan

## Current State (as of June 2026)
- Backend: FastAPI + PostgreSQL on Railway (`backend-production-21cd.up.railway.app`)
- Frontend: React + Vite on Vercel (`workordr.com`)
- Mobile: React Native + Expo (running via Expo Go tunnel for now)
- Payments: Stripe (test mode, card + cash/transfer both work)
- Auth: single shared password (`workordr2024`) — no user accounts yet
- Demo went well with first potential customer ✓

---

## Build Order

### 1. Login & Multi-Tenant System (Priority: DO FIRST)
**Estimated time: 1 day**

This must be done before the customer touches the product for real.
Everything else builds on top of this.

#### Backend
- New `companies` table: `id, name, created_at`
- New `users` table: `id, company_id, email, password_hash, role (superadmin/admin/technician), created_at`
- Add `company_id` to: `customers, technicians, jobs, services, invoices`
- JWT auth endpoints:
  - `POST /auth/login` → returns JWT token
  - `GET /auth/me` → returns current user + company
- All existing API routes filter data by `company_id` from JWT
- `POST /superadmin/create-company` → protected by master password (env var)

#### Frontend
- Replace `PasswordGate` with real login page (email + password form)
- Auth context — JWT stored in localStorage, cleared on logout
- Sidebar shows company name (not hardcoded "WorkOrdr")
- New `/superadmin` page (your master panel):
  - Create new company (name + admin email + password)
  - List all companies with job/customer counts
  - Disable/enable a company
- Technicians page: company admin can create technician accounts (name, email, password)

#### Mobile
- New login screen (email + password)
- JWT stored in device secure storage
- Technician only sees their company's jobs

#### Account hierarchy
```
You (superadmin)
  → creates company "ABC Plumbing" → gives john@abc.com / password to John
    John (company admin)
      → logs into workordr.com
      → creates mike@abc.com / password for Mike (technician)
        Mike (technician)
          → logs into mobile app
          → sees only his assigned jobs
```

#### Demo company preserved
- `demo@workordr.com` / `workordr2024` → your demo account with seeded data
- Used for showing new prospects — completely separate from real customer data

---

### 2. Payment Link Email to Customer (Priority: HIGH)
**Estimated time: 2 hours**

Currently invoice is created but customer has no automatic notification.
Admin has to manually copy the payment URL and send it.

#### What to build
- Integrate SendGrid (free tier: 100 emails/day)
- Auto-send email when invoice is created: "Your job is complete. Invoice $200. Click here to pay." with link to `/invoice/{id}/pay`
- Optional: auto-reminder after 48 hours if still unpaid
- "Resend payment link" button on invoice detail in admin portal
- Invoice shows "Email sent at 3:45 PM" confirmation

#### Backend
- Add SendGrid SDK
- `SENDGRID_API_KEY` env var on Railway
- Hook into invoice creation endpoint to trigger email

---

### 3. Technician Job Acceptance Flow (Priority: HIGH — customer request)
**Estimated time: 3-4 hours**

Currently jobs get dispatched and technician just sees them. No way to accept, decline, or negotiate timing.

#### New job status flow
```
pending → dispatched → accepted / declined → en_route → arrived → in_progress → completed → invoiced → paid
```

#### Mobile — new screen when job is dispatched
When technician opens a dispatched job, show three buttons:
- **Accept** → job moves to `accepted`, admin sees confirmation
- **Decline** → dropdown reason (not available / too far / wrong skill / other) → admin notified
- **Propose New Time** → date/time picker → sends counter-proposal to admin

#### Admin portal
- Dispatch board highlights jobs waiting for acceptance
- Notification when technician declines or proposes new time
- Admin can reassign (if declined) or accept proposed time (if counter-proposed)

---

### 4. On-Site Quote / Assessment (Priority: HIGH — customer request)
**Estimated time: 4-5 hours**

Technician arrives, assesses the situation, needs to give a price before starting work. Customer must approve before work begins.

#### New flow
```
en_route → arrived → assessment → quote sent → customer approves → in_progress
```

#### Mobile — assessment screen (shown after "Arrived")
- Text field: what did you find / what needs to be done
- Line items: add parts + labour with prices (e.g. "Replace compressor — $350")
- Total auto-calculated
- Button: **Send Quote to Customer**

#### Customer receives
- Email with quote breakdown and two buttons: **Approve** / **Decline**
- If approved → technician notified on mobile → starts work
- If declined → job marked declined, admin notified

#### Admin portal
- New "Quotes" section showing all pending customer approvals
- Admin can manually approve/decline on behalf of customer

#### Backend
- New `quotes` table: `id, job_id, items (JSON), total, status (pending/approved/declined), sent_at`
- `POST /jobs/{id}/quote` — technician submits quote
- `POST /quotes/{id}/approve` — customer approves (public endpoint, no auth)
- `POST /quotes/{id}/decline` — customer declines (public endpoint, no auth)

---

### 5. Job Completion — Notes, Details & Photos (Priority: HIGH — customer request)
**Estimated time: 4-5 hours**

Technician needs to document what was done, parts used, and attach photos of the work.

#### Mobile — completion screen (shown when marking complete)
- **Work summary** — what was done (text)
- **Parts used** — line items with quantity (feeds directly into invoice)
- **Photos** — take photo or upload from camera roll, up to 5 photos
- Button: **Mark Complete & Generate Invoice**
- Invoice auto-populates with parts used from completion screen

#### Backend
- New `job_photos` table: `id, job_id, url, uploaded_at`
- Photo upload to Cloudinary (free tier: 25GB storage)
- `CLOUDINARY_URL` env var on Railway
- `POST /jobs/{id}/photos` — upload photo, returns URL

#### Admin portal
- Job detail page shows photos in a grid
- Completion notes and parts used shown clearly
- All parts used auto-fill into invoice line items

---

### 6. Android APK (Priority: MEDIUM — before real customer onboarding)
**Estimated time: 1 hour**

Replace Expo Go with a real installable Android app.
No code changes needed — just a build step.

```bash
cd mobile
eas build --platform android --profile preview
```

EAS builds it in the cloud (~15 min), gives a download link.
Send `.apk` to technician → they install → done.
No Google Play Store, no fees.

#### iOS (when needed)
- $99/year Apple Developer account (covers unlimited apps, unlimited testers)
- Distribute via TestFlight (no App Store submission needed)
- Technician gets email invite → installs TestFlight → installs WorkOrdr

---

## Infrastructure Notes

| Service | What it does | Cost |
|---|---|---|
| Railway | FastAPI backend + PostgreSQL | ~$5-10/month |
| Vercel | Frontend hosting + CDN | Free |
| Stripe | Card payments | 2.9% + 30¢ per transaction |
| SendGrid | Email (invoices, quotes, notifications) | Free up to 100/day |
| Cloudinary | Photo storage for job completion | Free up to 25GB |
| Namecheap | workordr.com domain | ~$12/year |
| Apple Developer | iOS TestFlight distribution | $99/year (when needed) |

---

## Questions to Decide Before Building

1. **Technician login on mobile** — same email/password as web, or separate PIN-based login?
2. **Quote approval** — email link only, or also SMS? (SMS needs Twilio ~$0.0075/message)
3. **Photos** — how many max per job? (Cloudinary free = 25GB, ~25,000 photos at 1MB each)
4. **Invoice email** — send from a `noreply@workordr.com` address? (needs domain email setup)

---

## Current Credentials (keep private)

- Admin portal: `workordr.com` — password `workordr2024` (temp, replaced by login system)
- Railway token: in previous session notes
- Stripe: test mode keys in `backend/.env`
- Expo token: in previous session notes
- Demo reset: `POST /admin/reset-demo` with `{"key": "workordr2024"}`
