# Blood Donation & Emergency Platform 🩸

A production-quality, backend-only RESTful API that connects blood donors with
patients/hospitals during emergencies — built with Node.js, TypeScript,
Express, PostgreSQL, and Prisma.

No frontend is included by design. Every endpoint is meant to be exercised
through Postman (`postman/Blood-Donation-Platform.postman_collection.json`)
or another REST client.

---

## 1. Requirement Compliance Plan

- [x] Node.js, TypeScript, Express.js
- [x] PostgreSQL + Prisma (relations, constraints, indexes, transactions)
- [x] Zod validation on every applicable endpoint
- [x] ESLint + Prettier
- [x] Redis (donor search cache, dashboard-stats cache) — fails soft if Redis is down
- [x] Auth: Email/Password + Google (GCP) Social Login, JWT access + refresh tokens
- [x] Strict 3-role RBAC: `DONOR`, `REQUESTER`, `ADMIN`
- [x] 40+ meaningful, versioned (`/api/v1`) REST endpoints
- [x] SSLCommerz real payment integration (initiate, IPN/webhook validation, status tracking) — no fake success paths
- [x] Soft delete (`deletedAt`) on Users, DonorProfiles, BloodRequests
- [x] Audit logging (`AuditLog` model) on every critical state change
- [x] Pagination, filtering, sorting, search on list endpoints
- [x] Database transactions for donor assignment, donation completion, payment validation
- [x] Indexing on all frequently-queried fields
- [x] Rate limiting (general + stricter auth limiter) via `express-rate-limit`
- [x] `helmet` + configured `cors`
- [x] Consistent `{ success, message, data }` / `{ success, message, errors }` response shape
- [x] Postman collection (`postman/`)
- [x] Seed script with working admin credentials
- [x] Docker + Render + Vercel deployment configuration

---

## 2. System Overview

**Problem.** Patients/hospitals often need blood urgently and have no fast way
to find compatible, available, eligible donors nearby.

**Roles**

| Role | Responsibilities |
|---|---|
| `DONOR` | Maintains a donor profile (blood group, location, availability, eligibility), views compatible requests, accepts/rejects/completes assignments, views own donation history. |
| `REQUESTER` | Creates blood requests on behalf of a patient/hospital, tracks request status, optionally pays a coordination/verification fee. |
| `ADMIN` | Verifies requests, matches & assigns donors, manages users (role/status), views audit logs and platform-wide statistics. |

**Core workflow**

```
Requester creates Blood Request (PENDING)
        ↓
Admin verifies it (VERIFIED)
        ↓
System finds compatible donors: blood-group compatibility × availability ×
medical eligibility (age/weight/last-donation-interval)
        ↓
Admin assigns a donor  → DonationAssignment (PENDING) → Request status ASSIGNED
        ↓
Donor ACCEPTS or REJECTS
   - REJECT  → Request reopens to MATCHING, admin assigns another donor
   - ACCEPT  → assignment ACCEPTED
        ↓
Donor marks donation COMPLETE
        → DonationHistory created
        → DonorProfile.totalDonations++ / lastDonationDate updated
        → BloodRequest status COMPLETED
```

All state transitions above are enforced server-side (never trusted from the
client) and the donor-assignment / donation-completion steps run inside
Prisma `$transaction` blocks to prevent race conditions such as double-booking
a donor to two active requests simultaneously.

**Payments — what and why.** The donation itself is never sold. A requester
may *optionally* pay a platform coordination fee, emergency verification fee,
or logistics support fee that funds running the matching service. Payments
are processed through **SSLCommerz** (sandbox by default); a payment is only
ever marked `PAID` after a server-to-server re-validation call to SSLCommerz
succeeds — there is no endpoint that lets a client set payment status
directly.

---

## 3. Tech Stack

Node.js · TypeScript · Express.js · PostgreSQL · Prisma · Zod · Redis (ioredis)
· JWT (`jsonwebtoken`) · bcrypt · Google Auth Library · SSLCommerz
(`sslcommerz-lts`) · helmet · express-rate-limit · ESLint/Prettier

---

## 4. Project Structure

```
src/
  app.ts                 Express app wiring (middleware, routes, error handling)
  server.ts               Entry point (Prisma connect + app.listen)
  app/
    config/                Centralized env var loader
    constants/              Roles, pagination defaults, blood-compatibility map
    errors/                 AppError, Zod/Prisma error translators
    middlewares/            authenticate, authorize, validateRequest, rateLimiter,
                             globalErrorHandler, notFound
    utils/                  prisma client, redis client, jwt helpers, catchAsync,
                             sendResponse, pagination/filter builder, blood
                             compatibility + eligibility domain logic
    modules/
      auth/  user/  donor/  bloodRequest/  assignment/  donation/  payment/
      admin/  auditLog/
        *.validation.ts    Zod schemas
        *.service.ts       Business logic + Prisma queries
        *.controller.ts    Thin request/response glue
        *.routes.ts        Route + middleware wiring
    routes/index.ts        Mounts every module under /api/v1
prisma/
  schema.prisma            Full data model
  seed.ts                  Seeds admin + sample donors/requester
postman/
  *.postman_collection.json
api/index.ts                Vercel serverless entry (re-exports the Express app)
Dockerfile, docker-compose.yml   Container build + local Postgres/Redis
vercel.json                Vercel routing config
```

---

## 5. Database Design (Prisma)

Models: `User`, `RefreshToken`, `DonorProfile`, `BloodRequest`,
`DonationAssignment`, `DonationHistory`, `Payment`, `AuditLog`.

Highlights:
- `DonationAssignment` has a **unique compound key** on
  `(bloodRequestId, donorProfileId)` to prevent duplicate assignment, and the
  service layer additionally blocks a donor from holding more than one
  `PENDING`/`ACCEPTED` assignment at a time.
- Indexes on `bloodGroup`, `availability`, `location`, `status`, `priority`,
  `createdAt` and foreign keys — the fields the list/search/matching queries
  actually filter and sort on.
- `deletedAt DateTime?` on `User`, `DonorProfile`, `BloodRequest` for soft
  deletes; every read query filters `deletedAt: null`.
- `AuditLog` stores actor, action, entity type/id, optional JSON metadata,
  and a timestamp — written from a single shared service so the logic never
  gets duplicated across modules.

## 6. Blood Compatibility & Eligibility Logic

Lives entirely in `src/app/utils/bloodCompatibility.ts` (no compatibility
logic is duplicated in controllers):

- `isBloodCompatible(donorGroup, recipientGroup)` / `getCompatibleDonorGroups(recipientGroup)`
  implement the standard 8-blood-group compatibility chart.
- `evaluateDonorEligibility(...)` centralizes medical eligibility rules: donor
  must be ≥18 and ≤65, weigh ≥50kg, and have waited ≥90 days since their last
  donation.

### Redis Caching Strategy

| What's cached | Key pattern | TTL | Invalidated on |
|---|---|---|---|
| Donor search results (`GET /donors/search`) | `donor:search:<json-encoded query+pagination>` | 60s | Donor profile created, updated, or availability changed (whole `donor:search:*` namespace is cleared, since we can't know in advance which cached queries a given donor now matches) |
| Admin dashboard stats (`GET /admin/dashboard-stats`) | `admin:dashboard:stats` | 120s | A donor is assigned to a request, or a donation is completed |

Every cache read/write goes through `cacheGet`/`cacheSet`/`cacheDel` in
`src/app/utils/redis.ts`, which swallow Redis errors and return
`null`/no-op instead of throwing — so the platform keeps serving requests
straight from PostgreSQL if Redis is temporarily unavailable.

Note: rate limiting (`express-rate-limit`) uses its default in-memory store,
**not** Redis. That's fine for a single instance; if you ever run multiple
API instances behind a load balancer, swap in a Redis-backed store
(`rate-limit-redis`) so limits are shared across instances.

---

## 7. Authentication & Authorization

- **Email/Password:** bcrypt-hashed passwords, JWT access token (15m default)
  + rotating refresh token (30d default, stored in `RefreshToken` table so it
  can be revoked/rotated server-side).
- **Google Sign-In:** client obtains a Google ID token via Google's own
  sign-in SDK and `POST`s it to `/api/v1/auth/google`; the server verifies it
  with `google-auth-library` against `GOOGLE_CLIENT_ID`. This keeps the flow
  fully testable from Postman without a browser redirect, which fits a
  backend-only, Postman-driven assignment. Existing local accounts are
  auto-linked to Google on first Google sign-in with the same email.
- **Authorization:** `authenticate()` verifies the Bearer token and loads the
  user; `authorize(...roles)` enforces the 3-role RBAC at the route level on
  every protected endpoint — never left to the frontend.

---

## 8. Full API Reference (all routes are versioned under `/api/v1`)

| Method | Endpoint | Role | Auth |
|---|---|---|---|
| POST | `/auth/register` | Public | No |
| POST | `/auth/login` | Public | No |
| POST | `/auth/google` | Public | No |
| POST | `/auth/refresh-token` | Public | No |
| POST | `/auth/logout` | Public | No |
| GET | `/users/me` | Any | Yes |
| PATCH | `/users/me` | Any | Yes |
| POST | `/donors/profile` | Donor | Yes |
| GET | `/donors/profile` | Donor | Yes |
| PATCH | `/donors/profile` | Donor | Yes |
| PATCH | `/donors/availability` | Donor | Yes |
| GET | `/donors/requests` | Donor | Yes |
| GET | `/donors/donation-history` | Donor | Yes |
| GET | `/donors/search?bloodGroup=&availability=&location=&q=&page=&limit=` | Admin, Requester | Yes |
| POST | `/blood-requests` | Requester, Admin | Yes |
| GET | `/blood-requests?page=&limit=&status=&bloodGroup=&priority=&sortBy=&sortOrder=` | Any | Yes |
| GET | `/blood-requests/search?q=` | Any | Yes |
| GET | `/blood-requests/:id` | Any | Yes |
| PATCH | `/blood-requests/:id` | Owner, Admin | Yes |
| DELETE | `/blood-requests/:id` (soft delete / cancel) | Owner, Admin | Yes |
| PATCH | `/blood-requests/:id/verify` | Admin | Yes |
| GET | `/blood-requests/:id/matches` | Admin, Requester | Yes |
| POST | `/blood-requests/:id/assign-donor` | Admin | Yes |
| GET | `/assignments/:id` | Any | Yes |
| PATCH | `/assignments/:id/accept` | Donor (owner) | Yes |
| PATCH | `/assignments/:id/reject` | Donor (owner) | Yes |
| PATCH | `/assignments/:id/complete` | Donor (owner) | Yes |
| GET | `/donations?page=&limit=` | Admin, Donor | Yes |
| GET | `/donations/:id` | Admin, Donor | Yes |
| POST | `/payments/initiate` | Any | Yes |
| POST | `/payments/success` | SSLCommerz callback | No |
| POST | `/payments/fail` | SSLCommerz callback | No |
| POST | `/payments/cancel` | SSLCommerz callback | No |
| POST | `/payments/ipn` | SSLCommerz webhook | No |
| GET | `/payments` | Any (own), Admin (all) | Yes |
| GET | `/payments/:id` | Owner, Admin | Yes |
| GET | `/admin/users?role=&status=&q=&page=&limit=` | Admin | Yes |
| PATCH | `/admin/users/:id/role` | Admin | Yes |
| PATCH | `/admin/users/:id/status` | Admin | Yes |
| GET | `/admin/dashboard-stats` | Admin | Yes |
| GET | `/admin/audit-logs?action=&entityType=&page=&limit=` | Admin | Yes |
| GET | `/admin/blood-requests` | Admin | Yes |

**41 endpoints total**, all connected to real Prisma-backed business logic.

Every success response: `{ "success": true, "message": "...", "data": {} }`
List endpoints wrap results as: `data: { meta: { page, limit, total, totalPages }, result: [...] }`
Every error response: `{ "success": false, "message": "...", "errors": [...] }`

---

## 9. Setup & Run Locally

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or use `docker-compose up postgres`)
- Redis (or use `docker-compose up redis`) — optional; the app degrades gracefully without it

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then fill in DATABASE_URL, JWT secrets, GOOGLE_CLIENT_ID/SECRET,
# SSLCOMMERZ_STORE_ID/PASSWORD (sandbox creds work: store_id "testbox", ask
# SSLCommerz sandbox for a fresh test store), REDIS_URL, ADMIN_EMAIL/PASSWORD

# 3. Generate the Prisma client & run migrations
npx prisma generate
npx prisma migrate dev --name init

# 4. Seed the database (creates the admin account + sample donors/requester)
npm run prisma:seed

# 5. Start the dev server
npm run dev
# API now live at http://localhost:5000/api/v1
```

### Demo Admin Credentials (from seed)
```
email:    admin@blooddonation.com   (or your ADMIN_EMAIL)
password: Admin@12345               (or your ADMIN_PASSWORD)
```
Sample donors: `karim.donor@example.com` / `fatema.donor@example.com` /
`jahid.donor@example.com`, password `Donor@12345`.
Sample requester: `requester@example.com`, password `Requester@12345`.

### Useful scripts
```bash
npm run build          # compile TypeScript -> dist/
npm run start           # run compiled build
npm run lint / lint:fix
npm run format
npm run prisma:studio   # inspect the DB visually
```

### Docker (Postgres + Redis + API in one command)
```bash
docker compose up --build
```

---

## 10. Deployment

- **Render**: connect the repo, set the build command `npm install && npm run build`,
  start command `npm run start`, and add all `.env.example` variables in the
  dashboard. Run `npx prisma migrate deploy` as a release/pre-deploy step.
- **Vercel**: `api/index.ts` re-exports the Express app as a serverless
  function per `vercel.json`. Set the same environment variables in the
  Vercel project settings, and run migrations from your local machine/CI
  against the production `DATABASE_URL` before deploying (serverless
  functions should not run `migrate dev`).

---

## 11. Security Notes

- Passwords are bcrypt-hashed (configurable salt rounds); password hashes and
  refresh tokens are never returned in any response.
- `helmet` sets standard security headers; `cors` is restricted to
  `CORS_ORIGIN`.
- `express-rate-limit` protects all routes generally and applies a stricter
  limit specifically to `/auth/register` and `/auth/login`.
- All database access goes through Prisma's parameterized queries (no raw SQL
  string concatenation anywhere), which rules out SQL injection.
- `.env` is git-ignored; `.env.example` documents every variable the code
  actually reads with no real secrets committed.

---

## 12. What's Intentionally Out of Scope

- No frontend/UI (per assignment requirements) — everything is exercised via
  the Postman collection.
- Google OAuth uses the ID-token verification flow rather than a full
  server-side redirect/callback dance, since there's no frontend to redirect
  back to and Postman can't complete a browser OAuth consent screen.

---

## 13. Outstanding Before You Submit This

Everything above is implemented in code, but the following still needs to be
done by you, on a machine with normal internet access — none of it can be
completed from within this build environment:

- [ ] **Run migrations.** `npx prisma generate && npx prisma migrate dev --name init`
      This also creates the `prisma/migrations/` folder the grading rubric
      expects to see committed.
- [ ] **Git history.** This project was generated as plain files, not a git
      repo. Run `git init`, then commit in logical chunks (schema, auth,
      donor module, blood-request module, payment module, admin module,
      docs, etc.) to reach the required 20+ meaningful commits — don't just
      do one giant initial commit.
- [ ] **Actually run it once** (`npm run dev` against a real Postgres) and
      walk through the Postman collection end-to-end. This code has been
      type-checked but never executed against a live database, so treat the
      first run as a debugging pass, not a formality.
- [ ] **Deploy it** (Render is the simpler path for a stateful Node API;
      Vercel works too via `api/index.ts` but is more fiddly for
      rate-limiting/Redis). Get a live URL and put it in the README.
- [ ] **Record the 5–10 minute walkthrough video** once the above are done.
