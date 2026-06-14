import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Truck, Activity, AlertTriangle, Gauge, Map, Bell } from 'lucide-react';
import { dashboardApi } from '../api';
import { StatCard } from '../components/ui/Card';
import { PageHeader, LoadingSpinner, ErrorMessage } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { formatNumber } from '../lib/utils';
import { fleetSocket } from '../ws/fleet-socket';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.summary,
    refetchInterval: 60000,
  });

  useEffect(() => {
    const unsubAlert = fleetSocket.onAlertFired(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });
    const unsubTrip = fleetSocket.onTripUpdated(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    });
    return () => {
      unsubAlert();
      unsubTrip();
    };
  }, [queryClient]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load dashboard" onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Fleet overview and key metrics"
        action={
          <div className="flex gap-2">
            <Link to="/map">
              <Button variant="secondary" size="sm">
                <Map className="h-4 w-4" /> Live map
              </Button>
            </Link>
            <Link to="/alerts">
              <Button variant="secondary" size="sm">
                <Bell className="h-4 w-4" /> Alerts
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total trucks"
          value={data.totalTrucks}
          icon={<Truck className="h-5 w-5" />}
        />
        <StatCard
          label="Active"
          value={data.activeTrucks}
          sub={`${data.idleTrucks} idle · ${data.offlineTrucks} offline`}
          icon={<Activity className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Today's fleet km"
          value={formatNumber(data.todayFleetKm)}
          sub={`${formatNumber(data.monthFleetKm)} km this month`}
          icon={<Gauge className="h-5 w-5" />}
        />
        <StatCard
          label="Active alerts"
          value={data.activeAlerts}
          sub={`${data.fuelAlerts} fuel-related`}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={data.activeAlerts > 0 ? 'red' : 'slate'}
        />
      </div>

      {data.totalTrucks === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-brand-300 bg-brand-50 p-6 text-center">
          <p className="font-medium text-brand-900">No trucks registered yet</p>
          <p className="mt-1 text-sm text-brand-700">Add your first truck to start tracking.</p>
          <Link to="/fleet" className="mt-4 inline-block">
            <Button size="sm">Go to Fleet</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
