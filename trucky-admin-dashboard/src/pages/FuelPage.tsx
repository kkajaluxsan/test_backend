import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../api';
import { StatCard, Card } from '../components/ui/Card';
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatDate, formatNumber } from '../lib/utils';
import type { FuelEntry } from '../types';

export function FuelPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('');

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['fuel', 'kpis', startDate, endDate],
    queryFn: () =>
      fuelApi.kpis({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['fuel', 'list', startDate, endDate, type],
    queryFn: () =>
      fuelApi.list({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: type || undefined,
        limit: 50,
      }),
  });

  return (
    <div>
      <PageHeader title="Fuel" description="Fuel entries and fleet KPIs" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: '', label: 'All types' },
            { value: 'DIESEL', label: 'Diesel' },
            { value: 'ADBLUE', label: 'AdBlue' },
          ]}
        />
      </div>

      {!kpisLoading && kpis && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total litres" value={formatNumber(kpis.totalLitres)} accent="brand" />
          <StatCard label="Total cost" value={`€${formatNumber(kpis.totalCost, 2)}`} />
          <StatCard label="L/100km" value={formatNumber(kpis.avgLitresPer100km)} accent="green" />
          <StatCard
            label="AdBlue"
            value={`${formatNumber(kpis.adblueTotal)} L`}
            sub={`Rate: ${formatNumber(kpis.adblueConsumptionRate)}%`}
          />
        </div>
      )}

      <Card title="Fuel entries">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={entriesData?.data ?? []}
            columns={[
              { key: 'date', header: 'Date', render: (e: FuelEntry) => formatDate(e.timestamp) },
              { key: 'type', header: 'Type', render: (e: FuelEntry) => e.type },
              { key: 'truck', header: 'Truck', render: (e: FuelEntry) => e.truck?.registrationNumber ?? '—' },
              { key: 'driver', header: 'Driver', render: (e: FuelEntry) => e.driver?.name ?? '—' },
              { key: 'litres', header: 'Litres', render: (e: FuelEntry) => formatNumber(e.litres) },
              {
                key: 'cost',
                header: 'Cost',
                render: (e: FuelEntry) => `€${formatNumber(e.totalCost ?? e.cost ?? 0, 2)}`,
              },
              { key: 'location', header: 'Location', render: (e: FuelEntry) => e.location },
            ]}
            emptyMessage="No fuel entries"
          />
        )}
      </Card>
    </div>
  );
}
