import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { TruckPositionEvent } from '../../types';
import { TruckStatusBadge } from '../ui/Badge';
import type { Truck, TruckStatus } from '../../types';
import { formatDate, formatNumber } from '../../lib/utils';

const statusColors: Record<TruckStatus, string> = {
  ACTIVE: '#10b981',
  IDLE: '#f59e0b',
  OFFLINE: '#64748b',
  MAINTENANCE: '#a855f7',
};

function createTruckIcon(color: string, heading = 0) {
  return L.divIcon({
    className: 'truck-marker',
    html: `<div style="transform:rotate(${heading}deg);width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);
  return null;
}

interface FleetMapProps {
  trucks: Truck[];
  positions: Record<string, TruckPositionEvent>;
  height?: string;
  statusFilter?: TruckStatus | 'ALL';
  routePoints?: { lat: number; lon: number }[];
  onTruckClick?: (truckId: string) => void;
}

export function FleetMap({
  trucks,
  positions,
  height = '500px',
  statusFilter = 'ALL',
  routePoints,
  onTruckClick,
}: FleetMapProps) {
  const filteredTrucks = useMemo(
    () =>
      statusFilter === 'ALL' ? trucks : trucks.filter((t) => t.status === statusFilter),
    [trucks, statusFilter],
  );

  const boundsPoints = useMemo(() => {
    const pts: [number, number][] = [];
    filteredTrucks.forEach((truck) => {
      const pos = positions[truck.id];
      if (pos) pts.push([pos.lat, pos.lon]);
    });
    routePoints?.forEach((p) => pts.push([p.lat, p.lon]));
    return pts;
  }, [filteredTrucks, positions, routePoints]);

  const defaultCenter: [number, number] = boundsPoints[0] ?? [45.4642, 9.19];

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={boundsPoints} />

        {routePoints && routePoints.length > 1 && (
          <Polyline
            positions={routePoints.map((p) => [p.lat, p.lon] as [number, number])}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.8 }}
          />
        )}

        {filteredTrucks.map((truck) => {
          const pos = positions[truck.id];
          if (!pos) return null;
          const color = statusColors[truck.status];
          return (
            <Marker
              key={truck.id}
              position={[pos.lat, pos.lon]}
              icon={createTruckIcon(color, pos.heading ?? 0)}
              eventHandlers={{
                click: () => onTruckClick?.(truck.id),
              }}
            >
              <Popup>
                <div className="min-w-[180px] space-y-2">
                  <p className="font-semibold">{truck.registrationNumber}</p>
                  <TruckStatusBadge status={truck.status} />
                  <p className="text-sm text-slate-600">
                    Speed: {formatNumber(pos.speed, 0)} km/h
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(pos.lastUpdate)}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
