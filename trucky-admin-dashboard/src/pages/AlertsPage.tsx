import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../api';
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { AlertSeverityBadge, AlertTypeLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useState } from 'react';
import { formatDate } from '../lib/utils';
import { fleetSocket } from '../ws/fleet-socket';
import type { Alert, AlertSeverity } from '../types';

export function AlertsPage() {
  const queryClient = useQueryClient();
  const [resolved, setResolved] = useState('false');
  const [severity, setSeverity] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', resolved, severity],
    queryFn: () =>
      alertsApi.list({
        resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
        severity: severity || undefined,
        limit: 50,
      }),
  });

  useEffect(() => {
    const unsub = fleetSocket.onAlertFired(() => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });
    return () => {
      unsub();
    };
  }, [queryClient]);

  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertsApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const alerts = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Alerts" description="Monitor and resolve fleet alerts" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Select
          label="Status"
          value={resolved}
          onChange={(e) => setResolved(e.target.value)}
          options={[
            { value: 'false', label: 'Unresolved' },
            { value: 'true', label: 'Resolved' },
            { value: '', label: 'All' },
          ]}
        />
        <Select
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          options={[
            { value: '', label: 'All severities' },
            ...(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as AlertSeverity[]).map((s) => ({
              value: s,
              label: s,
            })),
          ]}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          data={alerts}
          columns={[
            {
              key: 'severity',
              header: 'Severity',
              render: (a: Alert) => <AlertSeverityBadge severity={a.severity} />,
            },
            {
              key: 'type',
              header: 'Type',
              render: (a: Alert) => <AlertTypeLabel type={a.type} />,
            },
            {
              key: 'message',
              header: 'Message',
              render: (a: Alert) => (
                <span className="max-w-xs truncate block">{a.message}</span>
              ),
            },
            {
              key: 'truck',
              header: 'Truck',
              render: (a: Alert) => a.truck?.registrationNumber ?? '—',
            },
            {
              key: 'time',
              header: 'Time',
              render: (a: Alert) => formatDate(a.timestamp),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (a: Alert) =>
                !a.resolvedAt ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveMutation.mutate(a.id);
                    }}
                    disabled={resolveMutation.isPending}
                  >
                    Resolve
                  </Button>
                ) : (
                  <span className="text-xs text-emerald-600">Resolved</span>
                ),
            },
          ]}
          emptyMessage="No alerts found"
        />
      )}
    </div>
  );
}
