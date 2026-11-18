# Doctor Tracker API

REST API for **Doctor Tracker**, a small-clinic admin console. It owns authentication, the doctor directory, every patient registered under a doctor, and the aggregated dashboard data.

**Frontend repository:** [horenminjee31-dev/doctor-tracker-client](https://github.com/horenminjee31-dev/doctor-tracker-client)

**Stack:** Node.js 20+ · Express 4 (ESM) · MongoDB · Mongoose 8 · Zod · JWT in an httpOnly cookie · Helmet · CORS allowlist · Rate limiting

---

## Contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [API reference](#api-reference)
- [Authentication model](#authentication-model)
- [Data model and indexes](#data-model-and-indexes)
- [Query, filtering, and pagination](#query-filtering-and-pagination)
- [Error format](#error-format)
- [Testing](#testing)
- [Deployment on Render](#deployment-on-render)
- [Project layout](#project-layout)

---

## Quick start

Requires **Node.js 20+** and a MongoDB instance. A local server is enough; MongoDB Atlas works too.

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/doctor_tracker
JWT_SECRET=replace-with-a-long-random-string-at-least-32-characters
CLIENT_ORIGIN=http://localhost:3000
```

Seed the demo dataset (12 doctors, 86 patients spread over six months, one admin user):

```bash
npm run seed
```

Start the server:

```bash
npm run dev
```

Verify it is up:

```bash
curl http://localhost:5000/api/health
# {"status":"ok","uptime":1.234}
```

Demo admin created by the seed:

| Field | Value |
| --- | --- |
| Email | `admin@doctortracker.dev` |
| Password | `Admin@12345` |

The Next.js client talks to this API through its `/api/backend/*` rewrite, so both run on the same origin (`http://localhost:3000`). That keeps the session cookie first-party; no extra CORS setup is needed in development.

---

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | HTTP port |
| `NODE_ENV` | No | `development` | `production` enables secure cookies by default and silences request logs |
| `MONGODB_URI` | No | `mongodb://127.0.0.1:27017/doctor_tracker` | Mongo connection string |
| `JWT_SECRET` | **Yes** | — | Signing key, must be **≥ 32 characters**; the process exits otherwise |
| `JWT_EXPIRES_IN` | No | `8h` | Session lifetime |
| `CLIENT_ORIGIN` | No | `http://localhost:3000` | CORS allowlist, comma-separated |
| `COOKIE_SAMESITE` | No | `lax` | `lax` works when frontend proxies `/api/backend` |
| `COOKIE_SECURE` | No | `true` in production | Set `true` when served over HTTPS |
| `TRUST_PROXY` | No | off | Set `1` behind Render/NGINX so rate limits see client IPs |
| `SEED_ADMIN_EMAIL` | No | `admin@doctortracker.dev` | Seed only |
| `SEED_ADMIN_PASSWORD` | No | `Admin@12345` | Seed only |

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with `nodemon` on port 5000 |
| `npm start` | Start once (production) |
| `npm run seed` | Rebuild the demo dataset and admin user |
| `npm run smoke` | Run the end-to-end API smoke suite against an in-memory MongoDB |
| `npm run dev:db` | Boot a disposable in-memory MongoDB for local work without installing Mongo |

---

## API reference

Base path: `/api`. Every route except `/api/health`, `/api/auth/login`, and `/api/auth/logout` requires a valid session cookie.

### Auth

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Body `{ email, password }`. Sets `dt_session` httpOnly cookie; returns `{ user }` |
| `POST` | `/api/auth/logout` | Clears the cookie, returns `204` |
| `GET` | `/api/auth/me` | Returns the current user |

Login attempts are limited to 20 per 15 minutes per IP.

### Metadata

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Public liveness probe |
| `GET` | `/api/meta` | Allowed specializations, conditions, and genders (drives client selects) |

### Doctors

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/doctors` | Paginated list with `patientCount` and `lastVisitAt` per doctor |
| `POST` | `/api/doctors` | Create a doctor |
| `GET` | `/api/doctors/:id` | One doctor plus `summary: { totalPatients, thisMonth, lastVisitAt }` |
| `GET` | `/api/doctors/:doctorId/patients` | Paginated caseload for one doctor |
| `POST` | `/api/doctors/:doctorId/patients` | Register a patient under the doctor |

Create doctor body:

```json
{
  "name": "Dr. Ayesha Rahman",
  "specialization": "Cardiology",
  "hospital": "City General Hospital",
  "phone": "+880 1711 204501",
  "email": "ayesha.rahman@example.com"
}
```

### Patients

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/patients` | Paginated, filterable list across all doctors |
| `PATCH` | `/api/patients/:id` | Partial update; body must contain at least one field |
| `DELETE` | `/api/patients/:id` | Delete, returns `204` |

Create/update patient body:

```json
{
  "name": "Nadia Hossain",
  "age": 34,
  "gender": "female",
  "condition": "Diabetes",
  "phone": "+880 1811 223344",
  "email": "nadia@example.com",
  "notes": "Routine follow-up scheduled.",
  "visitDate": "2026-10-14"
}
```

### Dashboard

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/dashboard` | One call returning summary, six-month trend, condition mix, doctor workload, recent visits |

Response shape:

```json
{
  "summary": {
    "totalDoctors": 12,
    "totalPatients": 86,
    "patientsThisMonth": 14,
    "avgPatientsPerDoctor": 7.2,
    "lastVisitAt": "2026-11-16T09:30:00.000Z"
  },
  "trend": [{ "month": "2026-06", "label": "Jun", "patients": 11, "doctors": 3 }],
  "byCondition": [{ "label": "Diabetes", "value": 19 }],
  "byDoctor": [{ "doctorId": "…", "name": "Dr. Ayesha Rahman", "specialization": "Cardiology", "count": 12 }],
  "recentPatients": [{ "id": "…", "name": "Nadia Hossain", "condition": "Diabetes", "visitDate": "…", "doctorId": "…", "doctorName": "Dr. Ayesha Rahman" }]
}
```

List responses share the envelope `{ data: [...], meta: { total, page, limit, pages, hasNext, hasPrev } }`.

---

## Authentication model

- Credentials are verified with `bcryptjs` against `User.passwordHash`, which is `select: false` so it never leaves the model by accident.
- On success the API signs a JWT (`sub`, `role`, 8h default) and sets it as `dt_session`: `httpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`.
- `requireAuth` reads the cookie, verifies the signature, then re-loads the user so deleted accounts lose access immediately.
- The frontend proxies `/api/backend/*` to this service, which makes the cookie first-party and lets the Next.js middleware gate pages on the same cookie. That is why the client should **not** point `NEXT_PUBLIC_API_URL` at the API origin.
- Login is rate-limited; a global limit of 600 requests/minute/IP applies to everything under `/api`.

---

## Data model and indexes

**User** — `name`, `email` (unique), `passwordHash`, `role`.

**Doctor** — `name`, `specialization` (enum), `hospital`, `phone`, `email` (unique), timestamps.

```
{ name: 1 }
{ hospital: 1 }
{ createdAt: -1 }
{ specialization: 1, createdAt: -1 }
```

**Patient** — `name`, `age` (0–130), `gender` (enum), `condition` (enum), `phone`, `email`, `notes`, `visitDate`, `doctor` (ref, required), timestamps.

```
{ doctor: 1, visitDate: -1 }
{ visitDate: -1 }
{ condition: 1, visitDate: -1 }
{ createdAt: -1 }
```

Indexes follow the actual access paths: every patient list is either scoped by doctor or sorted by visit date, and the dashboard filters on `visitDate` and groups by `condition`/`doctor`. Indexes are created at boot via `Model.init()`.

---

## Query, filtering, and pagination

List endpoints accept:

| Param | Applies to | Notes |
| --- | --- | --- |
| `q` | doctors, patients | Case-insensitive substring across name, email, phone, hospital, condition |
| `page`, `limit` | all lists | Default `1` / `10`, max `50` |
| `sort` | all lists | `newest`, `oldest`, `name`, `name_desc`, `visit_newest`, `visit_oldest` (per endpoint) |
| `from`, `to` | all lists | `YYYY-MM-DD`, inclusive, interpreted in UTC |
| `specialization` | doctors | Enum |
| `condition`, `gender`, `doctorId` | patients | Enum / ObjectId |

Search terms are escaped with `escapeRegex` before building the `RegExp`, so a query like `a+b` or `(` is treated literally instead of crashing the request or altering the pattern.

Pagination is classic `skip`/`limit` with a parallel `countDocuments`. It is the right trade-off for an admin console of this size; for deep pages at very large scale, keyset pagination on `(visitDate, _id)` would be the next step.

`GET /api/doctors` avoids an N+1: patient counts and last visits for the current page are fetched with a single `$group` over the page's doctor ids, then joined in memory.

The dashboard is one pair of aggregation pipelines. `$facet` computes totals, this-month visits, the six-month trend, condition mix, doctor workload, and recent visits without six round trips; month buckets use `$dateToString` with an explicit UTC timezone so counts are stable regardless of server locale.

---

## Error format

```json
{ "message": "Enter a valid email" }
```

Validation errors from Zod return `400`, missing/expired sessions `401`, missing records `404`, and duplicate doctor emails `409` via the unique index. Unknown routes return `404` with a JSON body, and all errors pass through one handler that never leaks stack traces.

---

## Testing

```bash
npm run smoke
```

The suite boots an in-memory MongoDB (`mongodb-memory-server`), seeds a user, exercises all 21 checks — health, login, cookie session, metadata, doctor CRUD paths, search, filters, pagination, patient create/update/delete, dashboard shape, auth rejection, logout — then exits with the result. No local database required.

---

## Deployment on Render

This repository includes [`render.yaml`](./render.yaml) as a Render Blueprint. Because the API lives at the repository root, the service needs no `rootDir`; the blueprint runs `npm install` and `npm start` and health-checks `/api/health`.

1. Create a MongoDB Atlas **M0** cluster, a database user, and allow network access from `0.0.0.0/0` (or Render's egress ranges). Copy the SRV connection string.
2. In Render: **New → Blueprint**, select this repository. Or create a Web Service manually with build `npm install`, start `npm start`.
3. Set the environment variables:

   | Key | Value |
   | --- | --- |
   | `MONGODB_URI` | Atlas SRV string with the database name |
   | `CLIENT_ORIGIN` | Deployed frontend origin, e.g. `https://doctor-tracker-client.vercel.app` |
   | `COOKIE_SAMESITE` | `lax` |
   | `COOKIE_SECURE` | `true` |
   | `TRUST_PROXY` | `1` |

   `JWT_SECRET` is generated by the blueprint; `NODE_ENV=production` is preset.
4. Seed the deployed database once from a local checkout with the Atlas URI:

   ```bash
   MONGODB_URI="mongodb+srv://…" npm run seed
   ```

5. Confirm `https://<service>.onrender.com/api/health` returns `{"status":"ok"}`.

On the frontend side, set `API_PROXY_TARGET=https://<service>.onrender.com` (build-time variable, then redeploy) and leave `NEXT_PUBLIC_API_URL` unset so the proxy topology — and therefore the cookie — stays intact.

---

## Project layout

```
src/
  app.js                 Express app: helmet, CORS, compression, parsers, limits
  server.js              Boot: connect Mongo, init indexes, listen, graceful shutdown
  config/                env loading/validation, Mongoose connection
  constants.js           Specializations, conditions, genders
  models/                User, Doctor, Patient schemas and indexes
  schemas/               Zod request validation
  routes/                auth, meta, doctors, patients, dashboard, health
  controllers/           Request handlers and serialization
  lib/                   ApiError, asyncHandler, query helpers, serializers
  middleware/            auth, validation, error handling
seed/seed.js             Deterministic demo dataset
test/smoke.mjs           21-check API smoke suite on in-memory Mongo
scripts/dev-db.mjs       Disposable local MongoDB
```
