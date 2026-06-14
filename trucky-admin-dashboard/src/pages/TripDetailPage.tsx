import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Package } from 'lucide-react';
import { tripsApi } from '../api';
import { Card } from '../components/ui/Card';
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader';
import { TripStatusBadge, Badge } from '../components/ui/Badge';
import { FleetMap } from '../components/map/FleetMap';
import { formatDate, formatNumber } from '../lib/utils';
import type { TripStop } from '../types';

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => tripsApi.get(id!),
    enabled: !!id,
  });

  const { data: route = [] } = useQuery({
    queryKey: ['trips', id, 'route'],
    queryFn: () => tripsApi.route(id!),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!trip) return <p>Trip not found</p>;

  const stops = [...(trip.stops ?? [])].sort((a, b) => a.sequence - b.sequence);

  return (
    <div>
      <Link to="/trips" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to trips
      </Link>

      <PageHeader
        title={`Trip — ${trip.truck?.registrationNumber ?? 'Unknown truck'}`}
        description={`${trip.driver?.name ?? 'Unknown driver'} · ${formatDate(trip.startTime)}`}
        action={<TripStatusBadge status={trip.status} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Starting km</p>
          <p className="text-xl font-bold">{formatNumber(trip.startingKm, 0)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Ending km</p>
          <p className="text-xl font-bold">{formatNumber(trip.endingKm ?? 0, 0)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Total km</p>
          <p className="text-xl font-bold">{formatNumber(trip.totalKm ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Stops</p>
          <p className="text-xl font-bold">{stops.length}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Stop timeline">
          <div className="space-y-4">
            {stops.map((stop: TripStop) => (
              <div key={stop.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  {stop.type === 'LOAD_PICKUP' ? <Package className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                </div>
                <div className="flex-1 border-b border-surface-border pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{stop.locationName}</p>
                    <Badge className="bg-slate-100 text-slate-700">{stop.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {stop.type.replace(/_/g, ' ')} · Seq {stop.sequence}
                  </p>
                </div>
              </div>
            ))}
            {stops.length === 0 && <p className="text-sm text-slate-500">No stops recorded</p>}
          </div>
        </Card>

        <Card title="Deliveries">
          {(trip.deliveryRecords ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No deliveries yet</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {trip.deliveryRecords?.map((d) => (
                <li key={d.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium">{d.place}</p>
                  <p className="text-slate-500">{formatDate(d.timestamp)} · {formatNumber(d.kmReading, 0)} km</p>
                  {d.notes && <p className="mt-1 text-slate-600">{d.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {route.length > 0 && (
        <Card title="Route playback" className="mt-6">
          <FleetMap
            trucks={trip.truck ? [trip.truck] : []}
            positions={{}}
            routePoints={route}
            height="400px"
          />
          <p className="mt-2 text-xs text-slate-500">{route.length} GPS points</p>
        </Card>
      )}
    </div>
  );
}
