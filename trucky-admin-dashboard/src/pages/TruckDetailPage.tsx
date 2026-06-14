import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { trucksApi } from '../api';
import { Card } from '../components/ui/Card';
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { TruckStatusBadge, TripStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FleetMap } from '../components/map/FleetMap';
import { useLivePositions } from '../hooks/useLivePositions';
import { formatDate, formatNumber } from '../lib/utils';
import type { Trip, TruckStatus } from '../types';

export function TruckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const livePositions = useLivePositions();
  const [editing, setEditing] = useState(false);
  const [registration, setRegistration] = useState('');
  const [trailer, setTrailer] = useState('');
  const [status, setStatus] = useState<TruckStatus>('OFFLINE');

  const { data: truck, isLoading } = useQuery({
    queryKey: ['trucks', id],
    queryFn: () => trucksApi.get(id!),
    enabled: !!id,
  });

  const { data: tripsData } = useQuery({
    queryKey: ['trucks', id, 'trips'],
    queryFn: () => trucksApi.trips(id!, { limit: 10 }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      trucksApi.update(id!, { registrationNumber: registration, trailerNumber: trailer, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setEditing(false);
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!truck) return <p>Truck not found</p>;

  const pos = livePositions[truck.id];
  const mapPositions = pos ? { [truck.id]: pos } : {};

  return (
    <div>
      <Link to="/fleet" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to fleet
      </Link>

      <PageHeader
        title={truck.registrationNumber}
        description={truck.trailerNumber ? `Trailer: ${truck.trailerNumber}` : undefined}
        action={
          <Button variant="secondary" onClick={() => {
            setRegistration(truck.registrationNumber);
            setTrailer(truck.trailerNumber ?? '');
            setStatus(truck.status);
            setEditing(true);
          }}>
            Edit
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Truck info">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd><TruckStatusBadge status={truck.status} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Assigned driver</dt>
              <dd>{truck.assignedDriver?.name ?? '—'}</dd>
            </div>
            {pos && (
              <>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Last speed</dt>
                  <dd>{formatNumber(pos.speed, 0)} km/h</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Last update</dt>
                  <dd>{formatDate(pos.lastUpdate)}</dd>
                </div>
              </>
            )}
          </dl>
        </Card>

        <Card title="Live position">
          <FleetMap trucks={[truck]} positions={mapPositions} height="280px" />
        </Card>
      </div>

      <Card title="Trip history" className="mt-6">
        <DataTable
          data={tripsData?.data ?? []}
          onRowClick={(t: Trip) => navigate(`/trips/${t.id}`)}
          columns={[
            { key: 'date', header: 'Start', render: (t: Trip) => formatDate(t.startTime) },
            { key: 'status', header: 'Status', render: (t: Trip) => <TripStatusBadge status={t.status} /> },
            { key: 'km', header: 'Total km', render: (t: Trip) => formatNumber(t.totalKm ?? 0) },
            { key: 'driver', header: 'Driver', render: (t: Trip) => t.driver?.name ?? '—' },
          ]}
          emptyMessage="No trips yet"
        />
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setEditing(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Edit truck</h2>
            <div className="space-y-4">
              <Input label="Registration" value={registration} onChange={(e) => setRegistration(e.target.value)} />
              <Input label="Trailer" value={trailer} onChange={(e) => setTrailer(e.target.value)} />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TruckStatus)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'IDLE', label: 'Idle' },
                  { value: 'OFFLINE', label: 'Offline' },
                  { value: 'MAINTENANCE', label: 'Maintenance' },
                ]}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
