import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { driversApi } from '../api';
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import type { Driver } from '../types';

export function DriversPage() {
  const navigate = useNavigate();
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: driversApi.list,
  });

  return (
    <div>
      <PageHeader title="Drivers" description="Manage driver profiles and truck assignments" />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          data={drivers}
          onRowClick={(d) => navigate(`/drivers/${d.id}`)}
          columns={[
            { key: 'name', header: 'Name', render: (d: Driver) => <span className="font-medium">{d.name}</span> },
            { key: 'phone', header: 'Phone', render: (d: Driver) => d.phone ?? '—' },
            { key: 'license', header: 'License', render: (d: Driver) => d.licenseNumber ?? '—' },
            {
              key: 'truck',
              header: 'Assigned truck',
              render: (d: Driver) =>
                d.assignedTruck?.registrationNumber ?? '—',
            },
          ]}
        />
      )}
    </div>
  );
}
