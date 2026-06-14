import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { driversApi, trucksApi } from '../api';
import { Card } from '../components/ui/Card';
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { TripStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatDate, formatNumber } from '../lib/utils';
import type { Trip } from '../types';

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [selectedTruck, setSelectedTruck] = useState('');

  const { data: driver, isLoading } = useQuery({
    queryKey: ['drivers', id],
    queryFn: () => driversApi.get(id!),
    enabled: !!id,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks'],
    queryFn: trucksApi.list,
  });

  const { data: tripsData } = useQuery({
    queryKey: ['drivers', id, 'trips'],
    queryFn: () => driversApi.trips(id!, { limit: 10 }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: () => driversApi.update(id!, { name, licenseNumber: license, phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setEditing(false);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (truckId: string) => driversApi.assignTruck(id!, truckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!driver) return <p>Driver not found</p>;

  return (
    <div>
      <Link to="/drivers" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to drivers
      </Link>

      <PageHeader
        title={driver.name}
        description={driver.phone}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setName(driver.name);
              setPhone(driver.phone);
              setLicense(driver.licenseNumber);
              setEditing(true);
            }}
          >
            Edit profile
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">License</dt>
              <dd>{driver.licenseNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Phone</dt>
              <dd>{driver.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Assigned truck</dt>
              <dd>{driver.assignedTruck?.registrationNumber ?? 'None'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Assign truck">
          <div className="flex gap-2">
            <Select
              value={selectedTruck}
              onChange={(e) => setSelectedTruck(e.target.value)}
              options={[
                { value: '', label: 'Select truck…' },
                ...trucks.map((t) => ({
                  value: t.id,
                  label: `${t.registrationNumber} (${t.status})`,
                })),
              ]}
              className="flex-1"
            />
            <Button
              onClick={() => selectedTruck && assignMutation.mutate(selectedTruck)}
              disabled={!selectedTruck || assignMutation.isPending}
            >
              Assign
            </Button>
          </div>
        </Card>
      </div>

      <Card title="Trip history" className="mt-6">
        <DataTable
          data={tripsData?.data ?? []}
          onRowClick={(t: Trip) => navigate(`/trips/${t.id}`)}
          columns={[
            { key: 'date', header: 'Start', render: (t: Trip) => formatDate(t.startTime) },
            { key: 'truck', header: 'Truck', render: (t: Trip) => t.truck?.registrationNumber ?? '—' },
            { key: 'status', header: 'Status', render: (t: Trip) => <TripStatusBadge status={t.status} /> },
            { key: 'km', header: 'Km', render: (t: Trip) => formatNumber(t.totalKm ?? 0) },
          ]}
          emptyMessage="No trips yet"
        />
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setEditing(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Edit driver</h2>
            <div className="space-y-4">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="License" value={license} onChange={(e) => setLicense(e.target.value)} />
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
