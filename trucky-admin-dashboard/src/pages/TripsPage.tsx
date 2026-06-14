import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tripsApi } from '../api';
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { TripStatusBadge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { formatDate, formatNumber } from '../lib/utils';
import type { Trip, TripStatus } from '../types';

export function TripsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['trips', status, startDate, endDate, page],
    queryFn: () =>
      tripsApi.list({
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 20,
      }),
  });

  const trips = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div>
      <PageHeader title="Trips" description="View and filter trip history" />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Select
          label="Status"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[
            { value: '', label: 'All statuses' },
            ...(['CREATED', 'ROUTE_PLANNED', 'IN_PROGRESS', 'DELIVERING', 'COMPLETED'] as TripStatus[]).map(
              (s) => ({ value: s, label: s.replace(/_/g, ' ') }),
            ),
          ]}
        />
        <Input label="Start date" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
        <Input label="End date" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            data={trips}
            onRowClick={(t) => navigate(`/trips/${t.id}`)}
            columns={[
              { key: 'date', header: 'Start', render: (t: Trip) => formatDate(t.startTime) },
              { key: 'driver', header: 'Driver', render: (t: Trip) => t.driver?.name ?? '—' },
              { key: 'truck', header: 'Truck', render: (t: Trip) => t.truck?.registrationNumber ?? '—' },
              { key: 'status', header: 'Status', render: (t: Trip) => <TripStatusBadge status={t.status} /> },
              { key: 'km', header: 'Total km', render: (t: Trip) => formatNumber(t.totalKm ?? 0) },
            ]}
          />
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>{total} trips total</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border px-3 py-1 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2 py-1">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
