# Trucky Italia — Admin Dashboard

React admin web application for fleet management. Connects to the **fleet-tracker-api** backend via REST and Socket.IO.

## Features

- **Dashboard** — fleet KPIs (trucks, km, alerts)
- **Live Map** — real-time truck positions via WebSocket
- **Fleet** — truck CRUD and status management
- **Drivers** — profiles and truck assignment
- **Trips** — list, detail, route playback on map
- **Fuel** — entries table and KPI cards
- **Alerts** — list, filter, resolve (+ real-time notifications)
- **Reports** — daily/monthly/custom/fuel/trips with PDF/CSV export
- **Users** — create admins and drivers

## Quick start

```bash
cd trucky-admin-dashboard
npm install
cp .env.example .env
# Edit .env with your EC2 API URL
npm run dev
```

Open http://localhost:5173

**Default login (seed data):**
- Email: `manager@truckyitalia.com`
- Password: `Manager1234!`

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | REST API base URL including `/api` (e.g. `http://YOUR_EC2_IP:3000/api`) |
| `VITE_WS_URL` | WebSocket host without `/api` (e.g. `http://YOUR_EC2_IP:3000`) |

## Connect to AWS EC2 backend

1. Copy `.env.example` to `.env`
2. Set your EC2 public IP or domain:

```env
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:3000/api
VITE_WS_URL=http://YOUR_EC2_PUBLIC_IP:3000
```

3. Ensure EC2 security group allows inbound on port **3000** (and **5173** only for local dev)
4. Add your dashboard origin to backend `CORS_ORIGIN` in EC2 `.env`:

```env
CORS_ORIGIN=http://localhost:5173,https://your-dashboard-domain.com
```

5. Restart the backend after changing CORS

## Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (S3 + CloudFront, Netlify, Vercel, nginx on EC2, etc.).

## Tech stack

- React 18 + TypeScript + Vite
- TanStack Query (data fetching)
- React Router (navigation)
- Socket.IO client (live updates)
- Leaflet + OpenStreetMap (maps)
- Tailwind CSS (UI)

## API docs

See `planning documents/API_INTEGRATION.md` and backend Swagger at `/api/docs`.
