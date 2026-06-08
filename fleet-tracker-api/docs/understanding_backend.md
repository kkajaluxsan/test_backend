# Understanding the Trucky Italia Fleet Tracker Backend

Developer reference for **fleet-tracker-api** — architecture, data model, business rules, APIs, real-time behavior, and how clients should integrate.

**Related docs:**
- [API_INTEGRATION.md](./API_INTEGRATION.md) — endpoint contracts for frontend/mobile teams
- [README.md](../README.md) — quick start
- [Android Driver App Plan](../../trucky-driver-app/PLAN.md)
- [Admin Dashboard Plan](../../trucky-admin-dashboard/dashboardplan.md)

---

## Table of contents

1. [What this backend does](#1-what-this-backend-does)
2. [System architecture](#2-system-architecture)
3. [Technology stack](#3-technology-stack)
4. [Repository layout](#4-repository-layout)
5. [Local development](#5-local-development)
6. [Configuration](#6-configuration)
7. [Cross-cutting concerns](#7-cross-cutting-concerns)
8. [Authentication and authorization](#8-authentication-and-authorization)
9. [Database schema](#9-database-schema)
10. [Redis usage](#10-redis-usage)
11. [Module reference](#11-module-reference)
12. [REST API — all 40 endpoints](#12-rest-api--all-40-endpoints)
13. [WebSocket API](#13-websocket-api)
14. [Core business flows](#14-core-business-flows)
15. [Alerts system](#15-alerts-system)
16. [Notifications](#16-notifications)
17. [Reports and exports](#17-reports-and-exports)
18. [Audit logging](#18-audit-logging)
19. [Phase 2 scaffolds](#19-phase-2-scaffolds)
20. [Error codes](#20-error-codes)
21. [Client responsibilities](#21-client-responsibilities)
22. [Development notes and pitfalls](#22-development-notes-and-pitfalls)

---

## 1. What this backend does

**Trucky Italia Fleet Tracker API** is a NestJS monolith that powers:

| Client | Role | Primary use |
|--------|------|-------------|
| **Admin Dashboard** (React) | `SUPER_ADMIN`, `FLEET_MANAGER` | Fleet oversight, live map, alerts, reports, user/truck management |
| **Android Driver App** (Kotlin) | `DRIVER` | Daily trip workflow, GPS streaming, fuel logging |

The backend is the **only** integration point between clients. Drivers and admins never communicate peer-to-peer.

**Persistent storage:** PostgreSQL (authoritative data)  
**Ephemeral / fast reads:** Redis (live truck positions, alert deduplication)  
**Real-time:** Socket.IO at path `/ws`

---

## 2. System architecture

```mermaid
flowchart TB
    subgraph clients [Clients]
        Admin[Admin Dashboard]
        Driver[Android Driver App]
    end

    subgraph api [fleet-tracker-api NestJS]
        REST[REST Controllers /api/*]
        WS[FleetGateway Socket.IO /ws]
        Guards[JWT + Roles Guards]
        Services[Domain Services]
    end

    subgraph data [Data layer]
        PG[(PostgreSQL)]
        Redis[(Redis)]
    end

    Admin -->|Bearer JWT ADMIN| REST
    Admin -->|auth.token| WS
    Driver -->|Bearer JWT DRIVER| REST
    Driver -->|auth.token emit GPS| WS

    REST --> Guards --> Services
    WS --> Services
    Services --> PG
    Services --> Redis
    Services --> WS
```

### Request lifecycle (REST)

1. Request hits global prefix `/api`.
2. `ValidationPipe` validates and transforms DTOs (`whitelist`, `forbidNonWhitelisted`).
3. `JwtAuthGuard` runs unless route is `@Public()`.
4. `RolesGuard` checks `@Roles()` if present.
5. Controller delegates to service.
6. `ResponseInterceptor` wraps successful responses as `{ success: true, data }`.
7. On error, `AllExceptionsFilter` returns `{ success: false, error: { code, message, statusCode } }`.

### Module dependency overview

```
AppModule
├── ConfigModule (global)
├── RedisModule (global)
├── TypeOrmModule (PostgreSQL)
├── AuthModule
├── UsersModule
├── DriversModule ──► TripsModule
├── TrucksModule ──► TripsModule
├── TripsModule ──► TrackingModule, WebsocketModule
├── TrackingModule ──► AlertsModule, WebsocketModule
├── FuelModule ──► AlertsModule
├── AlertsModule ──► WebsocketModule, NotificationsModule
├── ReportsModule
├── DashboardModule
├── NotificationsModule
├── WebsocketModule (FleetGateway)
├── SosModule (Phase 2 scaffold)
├── PodModule (Phase 2 scaffold)
└── GeofencesModule (Phase 2 scaffold)
```

---

## 3. Technology stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 11 |
| Language | TypeScript |
| ORM | TypeORM (migrations, `synchronize: false`) |
| Database | PostgreSQL 15 |
| Cache / live state | Redis 7 (ioredis) |
| Auth | JWT (access + refresh), Passport JWT strategy, bcrypt passwords |
| Real-time | Socket.IO via `@nestjs/platform-socket.io` |
| Validation | class-validator + class-transformer |
| API docs | Swagger at `/api/docs` |
| Export | pdfkit (PDF), csv-stringify (CSV) |
| Push (optional) | Firebase Admin (FCM) |
| SMS (optional) | Twilio (SOS / critical alerts) |

---

## 4. Repository layout

```
fleet-tracker-api/
├── src/
│   ├── main.ts                 # Bootstrap, CORS, Swagger, global prefix
│   ├── app.module.ts           # Root module, global guards/filters/interceptors
│   ├── auth/                   # Login, refresh, JWT strategy
│   ├── users/                  # User CRUD (admin)
│   ├── drivers/                # Driver profiles, truck assignment
│   ├── trucks/                 # Fleet CRUD, live position read
│   ├── trips/                  # Trip lifecycle (driver writes, admin reads)
│   ├── tracking/               # GPS ingest (driver only)
│   ├── fuel/                   # Fuel / AdBlue entries
│   ├── alerts/                 # Alert storage, resolve, creation helpers
│   ├── dashboard/              # Summary KPIs
│   ├── reports/                # Daily/monthly/custom/fuel/trips reports
│   ├── notifications/          # FCM + Twilio (optional)
│   ├── websocket/              # FleetGateway
│   ├── sos/                    # Phase 2 scaffold
│   ├── files/                  # POD scaffold
│   ├── geofences/              # Phase 2 scaffold
│   └── common/
│       ├── enums.ts
│       ├── redis.module.ts
│       ├── guards/             # jwt-auth.guard, roles.guard
│       ├── decorators/         # @Public, @Roles, @CurrentUser
│       ├── filters/            # AllExceptionsFilter
│       ├── interceptors/       # ResponseInterceptor
│       └── entities/           # audit-log.entity.ts
├── database/
│   ├── data-source.ts          # TypeORM CLI config
│   ├── migrations/             # InitialSchema migration
│   └── seed.ts                 # Dev seed data
├── docs/
│   ├── API_INTEGRATION.md
│   └── understanding_backend.md  (this file)
├── docker-compose.yml          # PostgreSQL + Redis
├── .env.example
└── package.json
```

---

## 5. Local development

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL and Redis)

### Setup commands

```bash
cd fleet-tracker-api
npm install
cp .env.example .env
# Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env

docker compose up -d
npm run migration:run
npm run seed
npm run start:dev
```

### URLs

| Resource | URL |
|----------|-----|
| API base | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |
| WebSocket | ws://localhost:3000 (path `/ws`) |

### NPM scripts

| Script | Purpose |
|--------|---------|
| `start:dev` | Hot reload development server |
| `build` | Compile to `dist/` |
| `start:prod` | Run compiled app |
| `migration:run` | Apply migrations |
| `migration:revert` | Revert last migration |
| `migration:generate` | Generate new migration from entity changes |
| `seed` | Insert dev users, trucks, driver assignments |
| `test` | Jest unit tests |

### Seed accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@truckyitalia.com | Admin1234! |
| Fleet Manager | manager@truckyitalia.com | Manager1234! |
| Driver 1 | driver1@truckyitalia.com | Driver1234! |
| Driver 2 | driver2@truckyitalia.com | Driver1234! |

Seed trucks: `MI-234AB` (driver1), `MI-567CD` (driver2).

---

## 6. Configuration

All configuration is via environment variables (`.env`). See `.env.example`.

| Variable | Default / example | Purpose |
|----------|-------------------|---------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Enables TypeORM query logging when `development` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/fleet_tracker` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `JWT_ACCESS_SECRET` | *(required)* | Signs access tokens |
| `JWT_REFRESH_SECRET` | *(required)* | Signs refresh tokens |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | `30d` | Refresh token TTL |
| `CORS_ORIGIN` | `http://localhost:3001,...` | Comma-separated allowed origins |
| `OVERSPEED_THRESHOLD_KMH` | `110` | Speed alert threshold |
| `IDLE_THRESHOLD_MINUTES` | `30` | Documented for client idle detection |
| `OFFLINE_THRESHOLD_MINUTES` | `5` | No GPS → mark truck OFFLINE |
| `FIREBASE_*` | optional | FCM push to `admin-alerts` topic |
| `TWILIO_*` | optional | SMS for critical alerts |
| `AWS_*` | optional | Phase 2 POD uploads to S3 |

---

## 7. Cross-cutting concerns

### Response wrapper (`ResponseInterceptor`)

**Success (single object):**
```json
{ "success": true, "data": { } }
```

**Success (paginated):** Services return `{ data: [], meta: { total, page, limit } }` internally; interceptor passes through:
```json
{ "success": true, "data": [], "meta": { "total": 100, "page": 1, "limit": 10 } }
```

**Error (`AllExceptionsFilter`):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid credentials",
    "statusCode": 401
  }
}
```

NestJS exceptions thrown with `{ code, message }` objects preserve the `code` field.

**Exception:** Report endpoints with `format=pdf` or `format=csv` bypass the interceptor and stream raw files.

### Validation

Global `ValidationPipe`:
- Strips unknown properties (`whitelist: true`)
- Rejects unknown properties (`forbidNonWhitelisted: true`)
- Coerces query string types (`transform: true`)

### Decorators

| Decorator | File | Purpose |
|-----------|------|---------|
| `@Public()` | `common/decorators/public.decorator.ts` | Skip JWT guard (login, refresh) |
| `@Roles(...)` | `common/decorators/roles.decorator.ts` | Restrict endpoint by role |
| `@CurrentUser()` | `common/decorators/current-user.decorator.ts` | Inject `{ id, email, role }` from JWT |

---

## 8. Authentication and authorization

### JWT payload

Access and refresh tokens share payload shape:
```json
{ "sub": "<user-uuid>", "email": "...", "role": "DRIVER" }
```

`JwtStrategy.validate()` maps to request user: `{ id: sub, email, role }`.

### Login flow (`AuthService.login`)

1. Find user by email; reject if missing or `isActive === false`.
2. `bcrypt.compare` password against `password_hash`.
3. Write `AuditLog` (`LOGIN_SUCCESS` or `LOGIN_FAILED`).
4. For `DRIVER` role: load driver profile + assigned truck for response enrichment.
5. Sign access + refresh tokens with separate secrets.
6. Return `{ accessToken, refreshToken, user }`.

Driver login response includes `name`, `assignedTruckId`, `assignedTruckNumber`.

### Refresh flow (`AuthService.refresh`)

Verifies refresh token with `JWT_REFRESH_SECRET`, re-issues access token only.

### Role model

| Role | API access |
|------|------------|
| `SUPER_ADMIN` | Full admin API |
| `FLEET_MANAGER` | Full admin API (same as SUPER_ADMIN in `RolesGuard`) |
| `DRIVER` | Driver-only endpoints |

`RolesGuard` treats `SUPER_ADMIN` and `FLEET_MANAGER` as interchangeable when either is required.

### Global guards (order)

1. `JwtAuthGuard` — all routes except `@Public()`
2. `RolesGuard` — enforces `@Roles()` when declared

---

## 9. Database schema

### Entity relationship diagram

```mermaid
erDiagram
    users ||--o| drivers : "user_id"
    drivers ||--o| trucks : "assigned_truck_id"
    trucks ||--o| drivers : "assigned_driver_id"
    drivers ||--{ trips : "driver_id"
    trucks ||--{ trips : "truck_id"
    trips ||--{ trip_stops : "trip_id"
    trips ||--{ tracking_positions : "trip_id"
    trips ||--{ load_pickups : "trip_id"
    trips ||--{ delivery_records : "trip_id"
    trips ||--{ fuel_logs : "trip_id"
    trips ||--{ adblue_logs : "trip_id"
    trip_stops ||--o{ load_pickups : "stop_id"
    trip_stops ||--o{ delivery_records : "stop_id"
    delivery_records ||--o{ pod_signatures : "delivery_id"
    delivery_records ||--o{ pod_photos : "delivery_id"
    trucks ||--o{ alerts : "truck_id"
    drivers ||--o{ alerts : "driver_id"
    users ||--o{ audit_logs : "user_id"
```

### Tables summary

| Table | Purpose |
|-------|---------|
| `users` | Login accounts (all roles) |
| `drivers` | Driver profile linked 1:1 to user |
| `trucks` | Fleet vehicles |
| `trips` | Driver work-day records |
| `trip_stops` | Planned pickup/delivery stops |
| `load_pickups` | Confirmed load pickup GPS + km |
| `delivery_records` | Completed delivery details |
| `tracking_positions` | Historical GPS points (indexed by truck + timestamp) |
| `fuel_logs` | Diesel entries |
| `adblue_logs` | AdBlue entries |
| `alerts` | Fleet alerts with resolve timestamp |
| `geofences` | Phase 2 — zone definitions (JSON coordinates) |
| `pod_signatures` | Phase 2 — signature files per delivery |
| `pod_photos` | Phase 2 — photo files per delivery |
| `audit_logs` | Auth and admin action audit trail |

### Key relationships and rules

- **User ↔ Driver:** Creating a user with `role: DRIVER` also creates a `drivers` row (`UsersService.create`).
- **Driver ↔ Truck assignment:** Bidirectional — `drivers.assigned_truck_id` and `trucks.assigned_driver_id` kept in sync (`DriversService.assignTruck`). Reassigning unlinks previous pairs.
- **Trip:** Belongs to one driver and one truck. Only one non-`COMPLETED` trip per driver at a time.
- **Truck status:** Set `ACTIVE` on trip start, `OFFLINE` on trip end or offline detection.

### Enums (PostgreSQL + TypeScript)

Defined in `src/common/enums.ts`:

| Enum | Values |
|------|--------|
| `UserRole` | SUPER_ADMIN, FLEET_MANAGER, DRIVER |
| `TruckStatus` | ACTIVE, IDLE, OFFLINE, MAINTENANCE |
| `TripStatus` | CREATED → ROUTE_PLANNED → IN_PROGRESS → DELIVERING → COMPLETED |
| `StopType` | LOAD_PICKUP, DELIVERY |
| `StopStatus` | PENDING, CONFIRMED, COMPLETED |
| `FuelType` | DIESEL *(DB enum; AdBlue uses separate table)* |
| `AlertType` | SOS, OFFLINE, OVERSPEED, IDLE, LOW_FUEL, LOW_ADBLUE, GEOFENCE_ENTRY, GEOFENCE_EXIT |
| `AlertSeverity` | CRITICAL, HIGH, MEDIUM, LOW, INFO |
| `GeofenceType` | CIRCLE, POLYGON |

### Migrations

- **Never use `synchronize: true` in production.**
- Initial schema: `database/migrations/1717550000000-InitialSchema.ts`
- Run: `npm run migration:run`

---

## 10. Redis usage

Redis is **not** the source of truth for history — PostgreSQL `tracking_positions` is. Redis holds fast lookups and deduplication keys.

| Key pattern | TTL | Purpose |
|-------------|-----|---------|
| `truck:{truckId}:position` | 60s | Latest position JSON: `{ lat, lon, speed, heading, lastUpdate }` |
| `truck:{truckId}:active_since` | ~(OFFLINE_THRESHOLD + 2) min | Grace period after trip start before offline marking |
| `truck:{truckId}:last_movement` | 24h | Timestamp when speed was last < 0.5 km/h |
| `alert:overspeed:{truckId}` | 600s | Dedupe overspeed alerts (10 min) |
| `alert:offline:{truckId}` | 600s | Dedupe offline alerts (10 min) |

### Live position read path

`GET /api/trucks/:id/live` reads `truck:{id}:position` from Redis. Returns `null` in `data` if key missing or expired.

### Offline detection (`TrackingService`)

Background interval every **60 seconds**:
1. Load all trucks with `status: ACTIVE`.
2. If no Redis position and outside `active_since` grace → mark OFFLINE, emit `TRUCK_OFFLINE`, create offline alert.
3. If position `lastUpdate` older than `OFFLINE_THRESHOLD_MINUTES` → same.

On trip start, `seedTruckActiveGrace()` sets `active_since` to avoid false offline during GPS warm-up.

---

## 11. Module reference

### Auth (`src/auth/`)

| Endpoint | Method | Access |
|----------|--------|--------|
| `/api/auth/login` | POST | Public |
| `/api/auth/refresh` | POST | Public |

### Users (`src/users/`) — ADMIN

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | List users (no password hash) |
| `/api/users` | POST | Create user; auto-creates driver profile if role DRIVER |
| `/api/users/:id` | PATCH | Update email, role, isActive |

**Create driver body:** email, password, role `DRIVER`, driverName, licenseNumber, phone (all required for DRIVER).

### Drivers (`src/drivers/`)

| Endpoint | Method | Role |
|----------|--------|------|
| `/api/drivers/me` | GET | DRIVER |
| `/api/drivers` | GET | ADMIN |
| `/api/drivers/:id` | GET | ADMIN |
| `/api/drivers/:id/trips` | GET | ADMIN |
| `/api/drivers/:id` | PATCH | ADMIN |
| `/api/drivers/:id/assign-truck` | POST | ADMIN |

`getMe` returns driver with `assignedTruck` and `user` relations.

### Trucks (`src/trucks/`)

| Endpoint | Method | Role |
|----------|--------|------|
| `/api/trucks/assigned` | GET | DRIVER |
| `/api/trucks` | GET | ADMIN |
| `/api/trucks/:id` | GET | ADMIN |
| `/api/trucks/:id/live` | GET | ADMIN |
| `/api/trucks/:id/trips` | GET | ADMIN |
| `/api/trucks` | POST | ADMIN |
| `/api/trucks/:id/status` | PATCH | ADMIN |
| `/api/trucks/:id` | PATCH | ADMIN |

`updateStatus` writes audit log `TRUCK_STATUS_UPDATED`.

### Trips (`src/trips/`)

**Driver write endpoints:**

| Endpoint | Effect |
|----------|--------|
| `POST /api/trips` | Start day → status CREATED, truck ACTIVE, offline grace seeded |
| `POST /api/trips/:id/stops` | Add stops → status ROUTE_PLANNED |
| `PATCH .../stops/:stopId/confirm` | Load pickup → stop CONFIRMED, trip IN_PROGRESS or DELIVERING |
| `PATCH .../stops/:stopId/deliver` | Delivery → stop COMPLETED, trip DELIVERING |
| `PATCH /api/trips/:id/end` | End day → COMPLETED, truck OFFLINE, returns summary |

**Admin read endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/trips` | Paginated list with filters |
| `GET /api/trips/:id` | Detail + stops + loadPickups + deliveryRecords |
| `GET /api/trips/:id/route` | Ordered GPS points for map playback |

**Business rules (`TripsService`):**
- `ACTIVE_TRIP_EXISTS` if driver already has non-COMPLETED trip.
- `TRUCK_NOT_ASSIGNED` if driver's assigned truck ≠ trip truck.
- `INVALID_KM` if ending km < starting km.
- Stop type must match action (LOAD_PICKUP for confirm, DELIVERY for deliver).

**Important gap for mobile:** There is **no** `GET /api/trips/active` for drivers. The Android app must persist active trip state locally after `POST /api/trips`.

### Tracking (`src/tracking/`) — DRIVER only

| Endpoint | Description |
|----------|-------------|
| `POST /api/tracking/location` | Single GPS point; timestamp must be ≤ 60s old |
| `POST /api/tracking/location/batch` | Up to 500 points; skips invalid coords and timestamps > 7 days old |

**Validation (`validateDriverGpsAccess`):**
- Driver exists.
- `truckId` === `driver.assignedTruckId`.
- Trip exists, belongs to driver, matches truck, not COMPLETED.

**Side effects per GPS update:**
1. Insert `tracking_positions` row.
2. Update Redis live position.
3. Broadcast `TRUCK_POSITION` to admin room.
4. Check overspeed → may create alert.

### Fuel (`src/fuel/`)

| Endpoint | Role |
|----------|------|
| `POST /api/fuel` | DRIVER |
| `GET /api/fuel` | ADMIN |
| `GET /api/fuel/kpis` | ADMIN |

Diesel → `fuel_logs` table; AdBlue → `adblue_logs` table.  
Anomaly alerts: diesel > 800L or AdBlue > 200L → LOW severity alert.

### Alerts (`src/alerts/`) — ADMIN

| Endpoint | Description |
|----------|-------------|
| `GET /api/alerts` | Paginated list; unresolved first |
| `PATCH /api/alerts/:id/resolve` | Set `resolvedAt`, audit log |

Internal creators: `createOverspeedAlert`, `createIdleAlert`, `createOfflineAlert`, `createFuelAnomalyAlert`, `createAlert` (generic).

### Dashboard (`src/dashboard/`) — ADMIN

`GET /api/dashboard/summary` aggregates truck counts by status, today/month fleet km (completed trips only), unresolved alert counts.

### Reports (`src/reports/`) — ADMIN

Five report types with optional `format=json|pdf|csv` and filters `driverId`, `truckId`.

Uses `@Res()` for PDF/CSV to bypass response interceptor.

### Notifications (`src/notifications/`)

Optional FCM + Twilio. Gracefully no-ops if credentials missing (logs warning once).

### Websocket (`src/websocket/fleet.gateway.ts`)

See [Section 13](#13-websocket-api).

---

## 12. REST API — all 40 endpoints

| # | Method | Path | Role | Client |
|---|--------|------|------|--------|
| 1 | POST | `/api/auth/login` | Public | Both |
| 2 | POST | `/api/auth/refresh` | Public | Both |
| 3 | GET | `/api/users` | ADMIN | Dashboard |
| 4 | POST | `/api/users` | ADMIN | Dashboard |
| 5 | PATCH | `/api/users/:id` | ADMIN | Dashboard |
| 6 | GET | `/api/drivers/me` | DRIVER | Android |
| 7 | GET | `/api/drivers` | ADMIN | Dashboard |
| 8 | GET | `/api/drivers/:id` | ADMIN | Dashboard |
| 9 | GET | `/api/drivers/:id/trips` | ADMIN | Dashboard |
| 10 | PATCH | `/api/drivers/:id` | ADMIN | Dashboard |
| 11 | POST | `/api/drivers/:id/assign-truck` | ADMIN | Dashboard |
| 12 | GET | `/api/trucks/assigned` | DRIVER | Android |
| 13 | GET | `/api/trucks` | ADMIN | Dashboard |
| 14 | GET | `/api/trucks/:id` | ADMIN | Dashboard |
| 15 | GET | `/api/trucks/:id/live` | ADMIN | Dashboard |
| 16 | GET | `/api/trucks/:id/trips` | ADMIN | Dashboard |
| 17 | POST | `/api/trucks` | ADMIN | Dashboard |
| 18 | PATCH | `/api/trucks/:id/status` | ADMIN | Dashboard |
| 19 | PATCH | `/api/trucks/:id` | ADMIN | Dashboard |
| 20 | POST | `/api/trips` | DRIVER | Android |
| 21 | POST | `/api/trips/:id/stops` | DRIVER | Android |
| 22 | PATCH | `/api/trips/:id/stops/:stopId/confirm` | DRIVER | Android |
| 23 | PATCH | `/api/trips/:id/stops/:stopId/deliver` | DRIVER | Android |
| 24 | PATCH | `/api/trips/:id/end` | DRIVER | Android |
| 25 | GET | `/api/trips` | ADMIN | Dashboard |
| 26 | GET | `/api/trips/:id/route` | ADMIN | Dashboard |
| 27 | GET | `/api/trips/:id` | ADMIN | Dashboard |
| 28 | POST | `/api/tracking/location` | DRIVER | Android |
| 29 | POST | `/api/tracking/location/batch` | DRIVER | Android |
| 30 | POST | `/api/fuel` | DRIVER | Android |
| 31 | GET | `/api/fuel/kpis` | ADMIN | Dashboard |
| 32 | GET | `/api/fuel` | ADMIN | Dashboard |
| 33 | GET | `/api/alerts` | ADMIN | Dashboard |
| 34 | PATCH | `/api/alerts/:id/resolve` | ADMIN | Dashboard |
| 35 | GET | `/api/dashboard/summary` | ADMIN | Dashboard |
| 36 | GET | `/api/reports/daily` | ADMIN | Dashboard |
| 37 | GET | `/api/reports/monthly` | ADMIN | Dashboard |
| 38 | GET | `/api/reports/custom` | ADMIN | Dashboard |
| 39 | GET | `/api/reports/fuel` | ADMIN | Dashboard |
| 40 | GET | `/api/reports/trips` | ADMIN | Dashboard |

Full request/response shapes: [API_INTEGRATION.md](./API_INTEGRATION.md).

---

## 13. WebSocket API

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/ws',
  auth: { token: accessToken },
});
```

Invalid/missing token → connection rejected immediately.

### Room assignment (on connect)

| Role | Rooms |
|------|-------|
| SUPER_ADMIN, FLEET_MANAGER | `admin` |
| DRIVER | `driver:{userId}`, `truck:{truckId}` (if assigned) |

### Inbound events (client → server)

| Event | Emitter | Handler behavior |
|-------|---------|------------------|
| `GPS_UPDATE` | Android | Same validation as REST tracking; replies `ACK` |
| `TRIP_STARTED` | Android | Emits `TRIP_UPDATED` to admin |
| `STOP_COMPLETED` | Android | Emits `TRIP_UPDATED` to admin |
| `IDLE_ALERT` | Android | Emits `TRUCK_IDLE` to admin; creates MEDIUM idle alert |

**GPS_UPDATE ACK:**
```json
{ "messageId": "optional-client-id", "status": "received" }
```

Note: WS handler catches tracking errors but still sends `ACK` with `received` — clients should not assume server persistence from ACK alone without error field (current implementation always sends `received`).

### Outbound events (server → admin)

| Event | Trigger |
|-------|---------|
| `TRUCK_POSITION` | Every GPS update (REST or WS) |
| `ALERT_FIRED` | HIGH/MEDIUM/LOW alert created |
| `SOS_TRIGGERED` | CRITICAL alert created |
| `TRUCK_OFFLINE` | Offline detection job |
| `TRUCK_IDLE` | Driver `IDLE_ALERT` event |
| `TRIP_UPDATED` | Trip status changes (confirm, deliver, WS trip events) |

---

## 14. Core business flows

### Trip lifecycle (driver)

```mermaid
stateDiagram-v2
    [*] --> CREATED: POST /trips
    CREATED --> ROUTE_PLANNED: POST /trips/id/stops
    ROUTE_PLANNED --> IN_PROGRESS: PATCH confirm LOAD_PICKUP
    IN_PROGRESS --> DELIVERING: PATCH deliver DELIVERY
    DELIVERING --> DELIVERING: more deliveries
    DELIVERING --> COMPLETED: PATCH /trips/id/end
    COMPLETED --> [*]
```

| Status | Meaning |
|--------|---------|
| CREATED | Trip started, no stops yet |
| ROUTE_PLANNED | Stops added |
| IN_PROGRESS | Load pickup confirmed |
| DELIVERING | At least one delivery activity |
| COMPLETED | Day ended |

### GPS flow

```mermaid
sequenceDiagram
    participant App as Android App
    participant API as TrackingService
    participant PG as PostgreSQL
    participant Redis as Redis
    participant WS as FleetGateway
    participant Admin as Admin Dashboard

    App->>API: POST /tracking/location or GPS_UPDATE
    API->>API: validateDriverGpsAccess
    API->>PG: INSERT tracking_positions
    API->>Redis: SET truck position TTL 60s
    API->>WS: broadcastTruckPosition
    WS->>Admin: TRUCK_POSITION
    API->>API: checkOverspeed
    opt speed > threshold
        API->>Admin: ALERT_FIRED
    end
```

### Admin onboarding a new driver

1. `POST /api/users` with role DRIVER + driver fields.
2. `POST /api/trucks` (if new vehicle).
3. `POST /api/drivers/:id/assign-truck` with `{ truckId }`.
4. Driver logs in on Android → sees truck on `GET /api/trucks/assigned`.

### End of day

1. Driver `PATCH /api/trips/:id/end` with `endingKm`.
2. Trip → COMPLETED; `totalKm` = ending − starting.
3. Truck status → OFFLINE.
4. Response includes summary (driver, km, hours, delivery count).
5. Android should stop GPS service and clear local trip state.

---

## 15. Alerts system

### How alerts are created

| Type | Severity | Source | Deduped |
|------|----------|--------|---------|
| OVERSPEED | HIGH | `TrackingService.checkOverspeed` | Redis 10 min |
| OFFLINE | HIGH | `TrackingService.markTruckOffline` | Redis 10 min |
| IDLE | MEDIUM | WS `IDLE_ALERT` → `AlertsService.createIdleAlert` | No |
| LOW_FUEL | LOW | Diesel > 800L | No |
| LOW_ADBLUE | LOW | AdBlue > 200L | No |
| SOS | CRITICAL | Phase 2 (not wired) | — |

### Notification routing (`AlertsService.notify`)

| Severity | WebSocket | FCM | SMS |
|----------|-----------|-----|-----|
| CRITICAL | `SOS_TRIGGERED` | Yes | Yes |
| HIGH, MEDIUM | `ALERT_FIRED` | Yes | No |
| LOW, INFO | `ALERT_FIRED` | No | No |

### Resolve

`PATCH /api/alerts/:id/resolve` sets `resolvedAt` and writes `ALERT_RESOLVED` audit log.

List default sort: unresolved first (`resolvedAt IS NULL`), then newest `timestamp`.

---

## 16. Notifications

**FCM:** Sends to topic `admin-alerts` with alert title/body and data payload. Requires `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

**Twilio SMS:** Sends to `TWILIO_ADMIN_NUMBER` from `TWILIO_FROM_NUMBER` for CRITICAL alerts only.

Both are **optional** — missing credentials log a one-time warning and skip silently.

---

## 17. Reports and exports

| Report | Required query | Output |
|--------|----------------|--------|
| Daily | `date` (YYYY-MM-DD) | Single day aggregate + stops |
| Monthly | `month` (YYYY-MM) | Summary + dailyBreakdown |
| Custom | `startDate`, `endDate` | Summary + dailyBreakdown |
| Fuel | `startDate`, `endDate` | Fuel entries aggregate |
| Trips | `startDate`, `endDate` | Trip list aggregate |

Optional: `driverId`, `truckId`, `format` (`json` | `pdf` | `csv`).

- **json:** `{ success: true, data: ... }` via manual `res.json` in controller.
- **pdf/csv:** Raw file download with `Content-Disposition: attachment`.

Implementation: `reports.service.ts` (data) + `report-export.util.ts` (PDF/CSV builders).

---

## 18. Audit logging

`audit_logs` table records:

| Action | Entity | When |
|--------|--------|------|
| LOGIN_SUCCESS / LOGIN_FAILED | Auth | Login |
| ALERT_RESOLVED | Alert | Resolve alert |
| TRUCK_STATUS_UPDATED | Truck | Admin changes truck status |

Fields: `userId`, `action`, `entity`, `entityId`, `ipAddress`, `timestamp`.

---

## 19. Phase 2 scaffolds

Modules exist in `app.module.ts` but controllers are **empty** — do not integrate clients yet.

| Module | Controller | Planned |
|--------|------------|---------|
| `SosModule` | `POST /api/sos` | Driver emergency with GPS |
| `PodModule` | `/api/pod/*` | Signature + photo upload to S3 |
| `GeofencesModule` | `/api/geofences/*` | Zone CRUD + entry/exit alerts |

DB tables `geofences`, `pod_signatures`, `pod_photos` already exist in migration.

---

## 20. Error codes

| Code | HTTP | When |
|------|------|------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `INVALID_TOKEN` | 401 | Bad refresh token |
| `UNAUTHORIZED` | 401 | Missing/invalid access token |
| `FORBIDDEN` | 403 | Wrong role |
| `TRUCK_NOT_ASSIGNED` | 403 | Driver trip/GPS on wrong truck |
| `TRIP_NOT_AUTHORIZED` | 403 | GPS for wrong trip |
| `ACTIVE_TRIP_EXISTS` | 409 | Second open trip |
| `INVALID_KM` | 400 | End km < start km |
| `STALE_TIMESTAMP` | 400 | GPS single point > 60s old |
| `BATCH_TOO_LARGE` | 400 | Batch > 500 positions |
| `TRIP_COMPLETED` | 400 | GPS after trip ended |
| `DRIVER_NOT_FOUND` | 404 | No driver profile |
| `TRIP_NOT_FOUND` | 404 | Trip missing/unauthorized |
| `TRUCK_NOT_FOUND` | 404 | Unknown truck |
| `NO_ASSIGNED_TRUCK` | 404 | Driver has no truck |
| `ALERT_NOT_FOUND` | 404 | Invalid alert id |
| `EMAIL_EXISTS` | 409 | Duplicate user email |
| `TRUCK_EXISTS` | 409 | Duplicate registration |
| `USER_NOT_FOUND` | 404 | User id invalid |
| `STOP_NOT_FOUND` | 404 | Stop id invalid |
| `INVALID_STOP_TYPE` | 400 | Wrong stop type for action |
| `INVALID_TYPE` | 400 | Invalid fuel type |

---

## 21. Client responsibilities

### Admin Dashboard

| Must do | API / WS |
|---------|----------|
| Login + refresh tokens | REST auth |
| Connect Socket.IO on login | `/ws` |
| Live map from WS, not polling | `TRUCK_POSITION` |
| Initial map load / reconnect | `GET /trucks`, `GET /trucks/:id/live` |
| Alert UI | `GET /alerts`, `ALERT_FIRED`, resolve |
| Reports download | `GET /reports/*?format=pdf` |

### Android Driver App

| Must do | API / WS |
|---------|----------|
| Login + refresh | REST auth |
| Persist active trip locally | No GET active trip endpoint |
| GPS during active trip | REST and/or `GPS_UPDATE` |
| Offline queue + batch sync | `POST /tracking/location/batch` |
| Match truckId to assigned truck | Validation enforced server-side |
| Emit trip WS events | `TRIP_STARTED`, `STOP_COMPLETED` (optional but helps admin UI) |

### Client integration matrix

| Feature | Admin | Android |
|---------|-------|---------|
| Login / refresh | Yes | Yes |
| Users CRUD | Yes | No |
| Drivers management | Yes | `/drivers/me` only |
| Trucks management | Yes | `/trucks/assigned` only |
| Trip lifecycle | View | Full write workflow |
| GPS tracking | Listen WS | Send REST/WS |
| Fuel logs | List, KPIs | POST |
| Alerts | List, resolve | Triggers only |
| Dashboard summary | Yes | No |
| Reports | Yes | No |

---

## 22. Development notes and pitfalls

### Adding a new endpoint

1. Create/update DTO in module `dto/`.
2. Add service method with business logic.
3. Add controller route with `@Roles()` and Swagger decorators.
4. If schema change needed: update entity → `npm run migration:generate` → review migration → `migration:run`.
5. Update `docs/API_INTEGRATION.md` and this file.

### Circular dependencies

`TrackingService`, `FleetGateway`, and `AlertsService` use `forwardRef()` — avoid tightening coupling further; prefer events or a small shared bus if complexity grows.

### Redis unavailable

`RedisModule` uses `lazyConnect` and swallows connection errors. Live position and deduplication degrade gracefully; offline job may behave unexpectedly without Redis.

### Reports bypass interceptor

When adding new export endpoints, follow `ReportsController.sendReport` pattern if returning non-JSON.

### CORS

Set `CORS_ORIGIN` to include your dashboard dev server (e.g. `http://localhost:5173` for Vite). Comma-separated list.

### Swagger

Interactive testing at `/api/docs` — use Bearer token from login response.

### Testing trip flow manually

```bash
# 1. Login as driver
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver1@truckyitalia.com","password":"Driver1234!"}'

# 2. Use accessToken for subsequent calls
# 3. POST /api/trips, POST stops, PATCH confirm/deliver, POST fuel, PATCH end
```

### Known design gaps (for future backend work)

1. **No driver GET active trip** — mobile must cache state.
2. **WS GPS ACK always `received`** — even on validation failure inside try/catch.
3. **`TRIP_STARTED` / `STOP_COMPLETED` WS handlers** use hardcoded status strings rather than reading DB.
4. **IDLE truck status** — enum exists but automatic IDLE transition is not fully implemented in tracking (client-driven idle alert only).
5. **Phase 2 modules** — DB tables exist without API implementation.

---

## Quick reference links

| Item | Location |
|------|----------|
| Enums | `src/common/enums.ts` |
| Global app config | `src/app.module.ts` |
| Trip business logic | `src/trips/trips.service.ts` |
| GPS + offline job | `src/tracking/tracking.service.ts` |
| WebSocket gateway | `src/websocket/fleet.gateway.ts` |
| Alert creation | `src/alerts/alerts.service.ts` |
| Seed data | `database/seed.ts` |
| Initial migration | `database/migrations/1717550000000-InitialSchema.ts` |

---

*Last updated to match fleet-tracker-api as documented in API Integration Guide v1.0 (40 REST endpoints, 4 WS inbound, 6 WS outbound).*
