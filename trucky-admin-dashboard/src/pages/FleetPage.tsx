import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { trucksApi } from '../api';
import { PageHeader, LoadingSpinner, Modal } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { TruckStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import type { Truck, TruckStatus } from '../types';

export function FleetPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [registration, setRegistration] = useState('');
  const [trailer, setTrailer] = useState('');

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: trucksApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      trucksApi.create({ registrationNumber: registration, trailerNumber: trailer || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setShowAdd(false);
      setRegistration('');
      setTrailer('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TruckStatus }) =>
      trucksApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trucks'] }),
  });

  return (
    <div>
      <PageHeader
        title="Fleet"
        description="Manage trucks and status"
        action={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add truck
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          data={trucks}
          onRowClick={(row) => navigate(`/fleet/${row.id}`)}
          columns={[
            {
              key: 'registration',
              header: 'Registration',
              render: (t: Truck) => (
                <span className="font-medium text-slate-900">{t.registrationNumber}</span>
              ),
            },
            {
              key: 'trailer',
              header: 'Trailer',
              render: (t: Truck) => t.trailerNumber ?? '—',
            },
            {
              key: 'status',
              header: 'Status',
              render: (t: Truck) => <TruckStatusBadge status={t.status} />,
            },
            {
              key: 'driver',
              header: 'Driver',
              render: (t: Truck) => t.assignedDriver?.name ?? '—',
            },
            {
              key: 'actions',
              header: 'Quick status',
              render: (t: Truck) => (
                <Select
                  value={t.status}
                  onChange={(e) => {
                    e.stopPropagation();
                    statusMutation.mutate({ id: t.id, status: e.target.value as TruckStatus });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'IDLE', label: 'Idle' },
                    { value: 'OFFLINE', label: 'Offline' },
                    { value: 'MAINTENANCE', label: 'Maintenance' },
                  ]}
                  className="w-36"
                />
              ),
            },
          ]}
        />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add truck">
        <div className="space-y-4">
          <Input
            label="Registration number"
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
            placeholder="MI-234AB"
            required
          />
          <Input
            label="Trailer number (optional)"
            value={trailer}
            onChange={(e) => setTrailer(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!registration || createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
