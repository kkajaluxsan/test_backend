# Trucky Italia — Fleet Tracker API

NestJS backend for fleet tracking and management. Serves the **Admin Dashboard** (React) and **Android Driver App** (Kotlin) via REST and WebSocket.

## Quick links

| Resource | URL (local) |
|----------|-------------|
| API base | http://localhost:3000/api |
| Swagger UI | http://localhost:3000/api/docs |
| Integration guide | [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md) |

The integration guide is the primary reference for frontend and mobile teams: all endpoints, WebSocket events, auth, enums, and client flows.

## Local development

### Prerequisites

- Node.js 20+
- Docker (PostgreSQL + Redis)

### Setup

```bash
npm install
cp .env.example .env
# Edit .env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

docker compose up -d
npm run migration:run
npm run seed
npm run start:dev
```

### Seed logins

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@truckyitalia.com | Admin1234! |
| Fleet Manager | manager@truckyitalia.com | Manager1234! |
| Driver | driver1@truckyitalia.com | Driver1234! |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start:prod` | Run production build |
| `npm run migration:run` | Apply database migrations |
| `npm run seed` | Seed test data |
| `npm test` | Unit tests |

## Stack

- NestJS, TypeORM, PostgreSQL
- Redis (live truck positions, alert deduplication)
- Socket.IO (real-time tracking and alerts)
- JWT authentication
- Firebase FCM / Twilio (optional, for push/SMS alerts)

## API overview

- **40 REST endpoints** across auth, users, drivers, trucks, trips, tracking, fuel, alerts, dashboard, and reports
- **WebSocket** at `/ws` for live GPS, alerts, and trip updates
- **Phase 2 scaffolds:** SOS, POD uploads, geofences (not yet implemented)

See [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md) for the complete reference.
