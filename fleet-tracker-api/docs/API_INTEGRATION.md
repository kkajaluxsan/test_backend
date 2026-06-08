# Trucky Italia — API Integration Guide

Integration reference for the **Admin Dashboard** (React) and **Android Driver App** (Kotlin). Both clients talk only to this backend via REST and WebSocket.

| Resource | URL |
|----------|-----|
| REST base | `https://<host>/api` (local: `http://localhost:3000/api`) |
| Swagger UI | `https://<host>/api/docs` |
| WebSocket | `wss://<host>` — Socket.IO path `/ws` |

---

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│  Admin Dashboard    │         │  Android Driver App │
│  (React)            │         │  (Kotlin)           │
└─────────┬───────────┘         └─────────┬───────────┘
          │  JWT (ADMIN)                  │  JWT (DRIVER)
          │  REST + WebSocket             │  REST + WebSocket
          └──────────────┬────────────────┘
                         ▼
              ┌──────────────────────┐
              │  fleet-tracker-api   │
              │  PostgreSQL + Redis  │
              └──────────────────────┘
```

The mobile app and dashboard **never communicate directly** with each other.

---

## Roles and access

| Role | Used by | REST access |
|------|---------|-------------|
| `SUPER_ADMIN` | Admin dashboard | Full admin API |
| `FLEET_MANAGER` | Admin dashboard | Full admin API (same as SUPER_ADMIN) |
| `DRIVER` | Android app | Driver-only endpoints |

In code, `SUPER_ADMIN` and `FLEET_MANAGER` are treated as **ADMIN**.

---

## Standard response format

All REST responses use a consistent wrapper.

**Success (single object):**
```json
{
  "success": true,
  "data": { }
}
```

**Success (paginated list):**
```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

**Error:**
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

Common status codes: `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `400` Bad Request.

---

## Authentication

### POST `/api/auth/login` — Public

**Clients:** Admin Dashboard, Android

**Request:**
```json
{
  "email": "driver1@truckyitalia.com",
  "password": "Driver1234!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "name": "Marco Rossi",
      "email": "driver1@truckyitalia.com",
      "role": "DRIVER",
      "assignedTruckId": "uuid-or-null",
      "assignedTruckNumber": "MI-234AB"
    }
  }
}
```

- `name`, `assignedTruckId`, `assignedTruckNumber` are populated for `DRIVER` role only.
- Access token expiry: **15 minutes** (configurable via `JWT_ACCESS_EXPIRY`).
- Refresh token expiry: **30 days** (configurable via `JWT_REFRESH_EXPIRY`).

**Errors:** `401` with `code: "INVALID_CREDENTIALS"`

---

### POST `/api/auth/refresh` — Public

**Clients:** Admin Dashboard, Android

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:** `401` with `code: "INVALID_TOKEN"`

---

### Authenticated requests

All other REST endpoints require:

```
Authorization: Bearer <accessToken>
```

Refresh the access token before it expires, or on `401` responses.

---

## REST API — Complete endpoint list

**Total: 40 endpoints** across 10 modules.

### Auth (2) — Public

| Method | Path | Client |
|--------|------|--------|
| POST | `/api/auth/login` | Both |
| POST | `/api/auth/refresh` | Both |

---

### Users (3) — ADMIN only

**Client:** Admin Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/:id` | Update user |

**POST body:**
```json
{
  "email": "newdriver@truckyitalia.com",
  "password": "Password123!",
  "role": "DRIVER",
  "driverName": "Marco Rossi",
  "licenseNumber": "AB1234567",
  "phone": "+39 333 1234567"
}
```

When `role` is `DRIVER`, `driverName`, `licenseNumber`, and `phone` are **required**.

**PATCH body:** `{ "email?", "role?", "isActive?" }`

---

### Drivers (6)

| Method | Path | Role | Client |
|--------|------|------|--------|
| GET | `/api/drivers/me` | DRIVER | **Android** |
| GET | `/api/drivers` | ADMIN | Admin |
| GET | `/api/drivers/:id` | ADMIN | Admin |
| GET | `/api/drivers/:id/trips` | ADMIN | Admin |
| PATCH | `/api/drivers/:id` | ADMIN | Admin |
| POST | `/api/drivers/:id/assign-truck` | ADMIN | Admin |

**GET `/api/drivers/me`** — Returns driver profile with `assignedTruck` relation.

**GET `/api/drivers/:id/trips`** — Query params: `startDate`, `endDate`, `page`, `limit`

**PATCH body:** `{ "name?", "licenseNumber?", "phone?" }`

**POST assign-truck body:** `{ "truckId": "uuid" }`

---

### Trucks (8)

| Method | Path | Role | Client |
|--------|------|------|--------|
| GET | `/api/trucks/assigned` | DRIVER | **Android** |
| GET | `/api/trucks` | ADMIN | Admin |
| GET | `/api/trucks/:id` | ADMIN | Admin |
| GET | `/api/trucks/:id/live` | ADMIN | Admin |
| GET | `/api/trucks/:id/trips` | ADMIN | Admin |
| POST | `/api/trucks` | ADMIN | Admin |
| PATCH | `/api/trucks/:id/status` | ADMIN | Admin |
| PATCH | `/api/trucks/:id` | ADMIN | Admin |

**GET `/api/trucks/assigned`** — Driver's assigned truck (404 if none).

**GET `/api/trucks/:id/live`** — Latest position from Redis:
```json
{
  "success": true,
  "data": {
    "truckId": "uuid",
    "lat": 45.4642,
    "lon": 9.19,
    "speed": 80.5,
    "heading": 120.0,
    "lastUpdate": "2024-06-05T10:00:00.000Z"
  }
}
```
Returns `null` in `data` if no recent position.

**GET `/api/trucks/:id/trips`** — Query: `startDate`, `endDate`, `page`, `limit`

**POST body:** `{ "registrationNumber": "MI-234AB", "trailerNumber?": "TRL-001" }`

**PATCH `/status` body:** `{ "status": "ACTIVE" }` — see TruckStatus enum

**PATCH `/api/trucks/:id` body:** `{ "registrationNumber?", "trailerNumber?", "status?" }`

---

### Trips (8)

| Method | Path | Role | Client |
|--------|------|------|--------|
| POST | `/api/trips` | DRIVER | **Android** |
| POST | `/api/trips/:id/stops` | DRIVER | **Android** |
| PATCH | `/api/trips/:id/stops/:stopId/confirm` | DRIVER | **Android** |
| PATCH | `/api/trips/:id/stops/:stopId/deliver` | DRIVER | **Android** |
| PATCH | `/api/trips/:id/end` | DRIVER | **Android** |
| GET | `/api/trips` | ADMIN | Admin |
| GET | `/api/trips/:id/route` | ADMIN | Admin |
| GET | `/api/trips/:id` | ADMIN | Admin |

#### POST `/api/trips` — Start day

**Body:**
```json
{
  "truckNumber": "MI-234AB",
  "trailerNumber": "TRL-001",
  "startingPlace": "Milan Hub",
  "startingKm": 10500,
  "startTime": "2024-06-05T08:00:00.000Z"
}
```

- Driver must not have an active trip → `409 ACTIVE_TRIP_EXISTS`
- Driver must be assigned to the truck → `403 TRUCK_NOT_ASSIGNED`
- Sets truck status to `ACTIVE`

#### POST `/api/trips/:id/stops` — Add planned stops

**Body:**
```json
{
  "stops": [
    {
      "sequence": 1,
      "type": "LOAD_PICKUP",
      "locationName": "Warehouse A",
      "lat": 45.4642,
      "lon": 9.19
    },
    {
      "sequence": 2,
      "type": "DELIVERY",
      "locationName": "Customer B",
      "lat": 45.47,
      "lon": 9.20
    }
  ]
}
```

Updates trip status to `ROUTE_PLANNED`.

#### PATCH `.../stops/:stopId/confirm` — Load pickup

**Body:**
```json
{
  "lat": 45.4642,
  "lon": 9.19,
  "kmReading": 10550,
  "gpsAccuracy": 5.5,
  "timestamp": "2024-06-05T09:00:00.000Z"
}
```

Stop must be type `LOAD_PICKUP`. Updates trip to `IN_PROGRESS` or `DELIVERING`.

#### PATCH `.../stops/:stopId/deliver` — Complete delivery

**Body:**
```json
{
  "place": "Customer B",
  "kmReading": 10600,
  "labourCharges": 50.00,
  "notes": "Left at reception",
  "timestamp": "2024-06-05T10:00:00.000Z"
}
```

Stop must be type `DELIVERY`.

#### PATCH `/api/trips/:id/end` — End day

**Body:**
```json
{
  "endingKm": 10700
}
```

- `endingKm` must be >= `startingKm` → `400 INVALID_KM` if not
- Returns trip summary:

```json
{
  "success": true,
  "data": {
    "date": "2024-06-05T08:00:00.000Z",
    "driverName": "Marco Rossi",
    "truckNumber": "MI-234AB",
    "startingKm": 10500,
    "endingKm": 10700,
    "totalKm": 200,
    "workingHours": 9.5,
    "deliveryCount": 2,
    "fuelEntriesSummary": []
  }
}
```

#### GET `/api/trips` — Admin list

Query: `driverId`, `truckId`, `status`, `startDate`, `endDate`, `page`, `limit`

#### GET `/api/trips/:id` — Trip detail

Returns trip with `stops`, `loadPickups`, `deliveryRecords`.

#### GET `/api/trips/:id/route` — GPS route playback

```json
{
  "success": true,
  "data": [
    {
      "lat": 45.4642,
      "lon": 9.19,
      "speed": 80.5,
      "heading": 120.0,
      "timestamp": "2024-06-05T10:00:00.000Z"
    }
  ]
}
```

---

### Tracking (2) — DRIVER only

**Client:** Android (send). Admin receives positions via WebSocket.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tracking/location` | Single GPS point |
| POST | `/api/tracking/location/batch` | Offline sync (max 500) |

**Single GPS body:**
```json
{
  "truckId": "uuid",
  "tripId": "uuid",
  "lat": 45.4642,
  "lon": 9.19,
  "speed": 80.5,
  "heading": 120.0,
  "accuracy": 5.5,
  "altitude": 150.0,
  "timestamp": "2024-06-05T10:00:00.000Z"
}
```

**Validation rules:**
- `lat` in [-90, 90], `lon` in [-180, 180]
- Timestamp not older than **60 seconds** (single endpoint)
- `truckId` must match driver's assigned truck
- `tripId` must be driver's active (non-completed) trip

**Response (single):** `{ "success": true, "data": { "received": true } }`

**Batch body:** `{ "positions": [ /* GpsUpdateDto[] */ ] }`

**Batch response:** `{ "success": true, "data": { "processed": 450, "skipped": 50 } }`

- Batch skips invalid coordinates and timestamps older than 7 days
- Overspeed alerts fire on processed positions (threshold: 110 km/h default)

---

### Fuel (3)

| Method | Path | Role | Client |
|--------|------|------|--------|
| POST | `/api/fuel` | DRIVER | **Android** |
| GET | `/api/fuel/kpis` | ADMIN | Admin |
| GET | `/api/fuel` | ADMIN | Admin |

**POST body:**
```json
{
  "type": "DIESEL",
  "tripId": "uuid",
  "litres": 250.5,
  "pricePerLitre": 1.85,
  "kmReading": 10800,
  "location": "Milan Eni Station",
  "timestamp": "2024-06-05T12:00:00.000Z"
}
```

- `type`: `DIESEL` or `ADBLUE`
- `totalCost` / `cost` calculated server-side (`litres * pricePerLitre`)
- Unusually high fill-up (>800L diesel, >200L AdBlue) creates a LOW severity alert

**GET `/api/fuel`** — Query: `truckId`, `driverId`, `type`, `startDate`, `endDate`, `page`, `limit`

**GET `/api/fuel/kpis`** — Query: `truckId?`, `startDate?`, `endDate?`

```json
{
  "success": true,
  "data": {
    "totalLitres": 1500.5,
    "totalCost": 2775.93,
    "avgLitresPer100km": 32.5,
    "adblueTotal": 120.0,
    "adblueCost": 240.0,
    "adblueConsumptionRate": 2.6
  }
}
```

---

### Alerts (2) — ADMIN only

**Client:** Admin Dashboard (+ real-time via WebSocket)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/alerts` | List alerts |
| PATCH | `/api/alerts/:id/resolve` | Resolve alert |

**GET query params:** `type`, `severity`, `resolved` (boolean), `truckId`, `startDate`, `endDate`, `page`, `limit`

Default ordering: unresolved first, then by timestamp descending.

**PATCH resolve** — Sets `resolvedAt`, writes audit log entry.

---

### Dashboard (1) — ADMIN only

| Method | Path | Client |
|--------|------|--------|
| GET | `/api/dashboard/summary` | Admin |

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTrucks": 6,
    "activeTrucks": 2,
    "idleTrucks": 1,
    "offlineTrucks": 3,
    "todayFleetKm": 450.5,
    "monthFleetKm": 12500.0,
    "activeAlerts": 3,
    "fuelAlerts": 1
  }
}
```

---

### Reports (5) — ADMIN only

| Method | Path | Required query |
|--------|------|----------------|
| GET | `/api/reports/daily` | `date` (YYYY-MM-DD) |
| GET | `/api/reports/monthly` | `month` (YYYY-MM) |
| GET | `/api/reports/custom` | `startDate`, `endDate` |
| GET | `/api/reports/fuel` | `startDate`, `endDate` |
| GET | `/api/reports/trips` | `startDate`, `endDate` |

**Optional on all:** `driverId`, `truckId`, `format` (`json` | `pdf` | `csv`)

- Default `format=json` returns standard `{ success, data }` wrapper
- `format=pdf` or `format=csv` returns file download (not JSON wrapper)

**Daily report fields:** `date`, `driverName`, `truckNumber`, `totalKm`, `workingHours`, `deliveryCount`, `fuelLitres`, `fuelCost`, `adblueLitres`, `adblueCost`, `stops[]`

**Monthly/custom:** `summary` + `dailyBreakdown[]`

---

### Phase 2 — Not implemented

These modules exist as scaffolds only. **Do not integrate yet.**

| Planned path | Module |
|--------------|--------|
| `POST /api/sos` | SOS emergency trigger |
| `/api/pod/*` | Proof of delivery (signature + photo upload to S3) |
| `/api/geofences/*` | Geofence zone CRUD |

---

## WebSocket API (Socket.IO)

### Connection

| Setting | Value |
|---------|-------|
| URL | Same host as API (e.g. `https://api.truckyitalia.com`) |
| Path | `/ws` |
| Transport | Socket.IO |
| Auth | Handshake `auth: { token: "<accessToken>" }` |

Invalid or missing token → connection rejected immediately.

### Rooms (server-assigned)

| Role | Rooms joined |
|------|--------------|
| ADMIN (`SUPER_ADMIN`, `FLEET_MANAGER`) | `admin` |
| DRIVER | `driver:{userId}`, `truck:{truckId}` (if truck assigned) |

---

### Inbound events (client → server)

Send via `socket.emit(eventName, payload)`.

#### `GPS_UPDATE` — Android

```json
{
  "truckId": "uuid",
  "tripId": "uuid",
  "lat": 45.4642,
  "lon": 9.19,
  "speed": 80.5,
  "heading": 120.0,
  "accuracy": 5.5,
  "altitude": 150.0,
  "timestamp": "2024-06-05T10:00:00.000Z",
  "messageId": "optional-client-id"
}
```

Same validation as REST `/tracking/location`.

**Server replies with `ACK`:**
```json
{
  "messageId": "optional-client-id",
  "status": "received"
}
```

#### `TRIP_STARTED` — Android

```json
{
  "tripId": "uuid",
  "truckId": "uuid",
  "driverId": "uuid",
  "startTime": "2024-06-05T08:00:00.000Z"
}
```

#### `STOP_COMPLETED` — Android

```json
{
  "tripId": "uuid",
  "stopId": "uuid",
  "type": "LOAD_PICKUP",
  "timestamp": "2024-06-05T09:00:00.000Z"
}
```

#### `IDLE_ALERT` — Android

```json
{
  "truckId": "uuid",
  "idleMinutes": 35,
  "lat": 45.4642,
  "lon": 9.19
}
```

Creates MEDIUM severity alert and broadcasts `TRUCK_IDLE` to admin.

---

### Outbound events (server → admin dashboard)

Listen via `socket.on(eventName, callback)`. All sent to the `admin` room.

#### `TRUCK_POSITION`

```json
{
  "truckId": "uuid",
  "lat": 45.4642,
  "lon": 9.19,
  "speed": 80.5,
  "heading": 120.0,
  "bearing": 120.0,
  "lastUpdate": "2024-06-05T10:00:00.000Z"
}
```

Emitted on every GPS update (REST or WebSocket).

#### `ALERT_FIRED`

```json
{
  "alertType": "OVERSPEED",
  "severity": "HIGH",
  "truckId": "uuid",
  "driverId": "uuid",
  "message": "Overspeed detected: 120 km/h",
  "lat": 45.4642,
  "lon": 9.19
}
```

#### `SOS_TRIGGERED`

```json
{
  "driverId": "uuid",
  "truckId": "uuid",
  "lat": 45.4642,
  "lon": 9.19,
  "timestamp": "2024-06-05T10:00:00.000Z"
}
```

CRITICAL severity alerts only.

#### `TRUCK_OFFLINE`

```json
{
  "truckId": "uuid",
  "lastSeen": "2024-06-05T09:55:00.000Z"
}
```

#### `TRUCK_IDLE`

```json
{
  "truckId": "uuid",
  "idleMinutes": 35,
  "lat": 45.4642,
  "lon": 9.19
}
```

#### `TRIP_UPDATED`

```json
{
  "tripId": "uuid",
  "status": "IN_PROGRESS",
  "currentStop": "uuid",
  "driverId": "uuid"
}
```

---

## Enums reference

Use these exact string values in requests and UI mapping.

### UserRole
`SUPER_ADMIN` | `FLEET_MANAGER` | `DRIVER`

### TruckStatus
`ACTIVE` | `IDLE` | `OFFLINE` | `MAINTENANCE`

### TripStatus (lifecycle order)
`CREATED` → `ROUTE_PLANNED` → `IN_PROGRESS` → `DELIVERING` → `COMPLETED`

### StopType
`LOAD_PICKUP` | `DELIVERY`

### StopStatus
`PENDING` | `CONFIRMED` | `COMPLETED`

### FuelEntryType
`DIESEL` | `ADBLUE`

### AlertType
`SOS` | `OFFLINE` | `OVERSPEED` | `IDLE` | `LOW_FUEL` | `LOW_ADBLUE` | `GEOFENCE_ENTRY` | `GEOFENCE_EXIT`

### AlertSeverity
`CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `INFO`

---

## Client integration matrix

| Feature | Admin Dashboard | Android App |
|---------|-----------------|-------------|
| Login / refresh | Yes | Yes |
| Users CRUD | Yes | No |
| Drivers management | Yes | `/drivers/me` only |
| Trucks management | Yes | `/trucks/assigned` only |
| Trip lifecycle | View, list, route | Full driver workflow |
| GPS tracking | Listen via WebSocket | Send via REST and/or WebSocket |
| Fuel logs | List, KPIs, reports | POST entries |
| Alerts | List, resolve, WebSocket | Triggers only (overspeed, idle, fuel anomaly) |
| Dashboard summary | Yes | No |
| Reports (PDF/CSV) | Yes | No |

---

## Integration flows

### Admin Dashboard — typical session

1. `POST /api/auth/login` with admin credentials
2. Store `accessToken` and `refreshToken`
3. Connect Socket.IO to `/ws` with `auth.token = accessToken`
4. `GET /api/dashboard/summary` — home widgets
5. `GET /api/trucks` — fleet list
6. Listen for `TRUCK_POSITION` — live map updates
7. Listen for `ALERT_FIRED` — alert notifications panel
8. `GET /api/alerts?resolved=false` — alert list
9. `PATCH /api/alerts/:id/resolve` — dismiss alert
10. `GET /api/trips/:id/route` — route playback on map
11. `GET /api/reports/daily?date=2024-06-05&format=pdf` — export report

Refresh token before 15-minute expiry or on `401`.

---

### Android Driver — typical work day

1. `POST /api/auth/login` with driver credentials
2. `GET /api/drivers/me` — profile and assigned truck
3. `GET /api/trucks/assigned` — confirm truck details
4. Connect Socket.IO (optional, for ACK-based GPS)
5. `POST /api/trips` — start day
6. `POST /api/trips/:id/stops` — plan route
7. Loop during trip:
   - `POST /api/tracking/location` every N seconds **or** emit `GPS_UPDATE` via WebSocket
   - `POST /api/tracking/location/batch` on reconnect (offline sync)
8. `PATCH /api/trips/:id/stops/:stopId/confirm` — load pickup
9. `PATCH /api/trips/:id/stops/:stopId/deliver` — each delivery
10. `POST /api/fuel` — diesel or AdBlue entries
11. Emit `IDLE_ALERT` if stationary too long (optional, client-side detection)
12. `PATCH /api/trips/:id/end` — end day with final odometer reading

**Important:** GPS `truckId` must match assigned truck. `tripId` must be the active trip.

---

## Seed data (development)

After `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@truckyitalia.com | Admin1234! |
| Fleet Manager | manager@truckyitalia.com | Manager1234! |
| Driver 1 | driver1@truckyitalia.com | Driver1234! |
| Driver 2 | driver2@truckyitalia.com | Driver1234! |

Trucks: `MI-234AB`, `MI-567CD` (assigned to drivers).

---

## Android (Kotlin) — connection example

```kotlin
// Retrofit base URL
const val API_BASE = "https://api.truckyitalia.com/api/"

// OkHttp interceptor
request.addHeader("Authorization", "Bearer $accessToken")

// Socket.IO
val options = IO.Options().apply {
    auth = mapOf("token" to accessToken)
    path = "/ws"
}
val socket = IO.socket("https://api.truckyitalia.com", options)
socket.connect()
socket.emit("GPS_UPDATE", gpsPayload)
socket.on("ACK") { args -> /* handle ack */ }
```

---

## Admin Dashboard (React) — connection example

```typescript
const API_BASE = 'https://api.truckyitalia.com/api';

// Fetch
const res = await fetch(`${API_BASE}/dashboard/summary`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// Socket.IO
import { io } from 'socket.io-client';
const socket = io('https://api.truckyitalia.com', {
  path: '/ws',
  auth: { token: accessToken },
});
socket.on('TRUCK_POSITION', (data) => updateMapMarker(data));
socket.on('ALERT_FIRED', (data) => showNotification(data));
```

---

## Error codes reference

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `INVALID_TOKEN` | 401 | Expired or invalid refresh token |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `FORBIDDEN` | 403 | Wrong role for endpoint |
| `TRUCK_NOT_ASSIGNED` | 403 | Driver GPS/trip on wrong truck |
| `TRIP_NOT_AUTHORIZED` | 403 | GPS for wrong trip |
| `ACTIVE_TRIP_EXISTS` | 409 | Driver already has open trip |
| `INVALID_KM` | 400 | Ending km < starting km |
| `STALE_TIMESTAMP` | 400 | GPS timestamp too old |
| `BATCH_TOO_LARGE` | 400 | More than 500 GPS records |
| `DRIVER_NOT_FOUND` | 404 | No driver profile for user |
| `TRIP_NOT_FOUND` | 404 | Trip missing or not owned |
| `ALERT_NOT_FOUND` | 404 | Alert id invalid |

---

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2024-06 | Initial integration guide — 40 REST endpoints, 4 WS inbound, 6 WS outbound |

For interactive exploration, use **Swagger** at `/api/docs`.
