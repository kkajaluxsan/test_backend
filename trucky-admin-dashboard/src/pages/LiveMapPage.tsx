import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { trucksApi } from '../api';
import { FleetMap } from '../components/map/FleetMap';
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { useLivePositions } from '../hooks/useLivePositions';
import type { TruckPositionEvent, TruckStatus } from '../types';

export function LiveMapPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TruckStatus | 'ALL'>('ALL');
  const livePositions = useLivePositions();
  const [initialPositions, setInitialPositions] = useState<Record<string, TruckPositionEvent>>({});

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: trucksApi.list,
  });

  useEffect(() => {
    if (!trucks.length) return;
    trucks.forEach((truck) => {
      trucksApi.live(truck.id).then((live) => {
        if (!live) return;
        setInitialPositions((prev) => ({
          ...prev,
          [truck.id]: {
            truckId: live.truckId,
            lat: live.lat,
            lon: live.lon,
            speed: live.speed,
            heading: live.heading,
            lastUpdate: live.lastUpdate,
          },
        }));
      }).catch(() => undefined);
    });
  }, [trucks]);

  const positions = useMemo(
    () => ({ ...initialPositions, ...livePositions }),
    [initialPositions, livePositions],
  );

  return (
    <div>
      <PageHeader
        title="Live Map"
        description="Real-time fleet positions via WebSocket"
        action={
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TruckStatus | 'ALL')}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'IDLE', label: 'Idle' },
              { value: 'OFFLINE', label: 'Offline' },
              { value: 'MAINTENANCE', label: 'Maintenance' },
            ]}
            className="w-44"
          />
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FleetMap
          trucks={trucks}
          positions={positions}
          height="calc(100vh - 200px)"
          statusFilter={statusFilter}
          onTruckClick={(id) => navigate(`/fleet/${id}`)}
        />
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Idle
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Offline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Maintenance
        </span>
      </div>
    </div>
  );
}
