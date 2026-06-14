import { cn } from '../../lib/utils';
import type {
  AlertSeverity,
  AlertType,
  TripStatus,
  TruckStatus,
  UserRole,
} from '../../types';

const truckStatusStyles: Record<TruckStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  IDLE: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  OFFLINE: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  MAINTENANCE: 'bg-purple-100 text-purple-800 ring-purple-600/20',
};

const tripStatusStyles: Record<TripStatus, string> = {
  CREATED: 'bg-slate-100 text-slate-700',
  ROUTE_PLANNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-800',
  DELIVERING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-slate-100 text-slate-600',
};

const severityStyles: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW: 'bg-slate-100 text-slate-700',
  INFO: 'bg-blue-100 text-blue-800',
};

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TruckStatusBadge({ status }: { status: TruckStatus }) {
  return <Badge className={truckStatusStyles[status]}>{status.replace('_', ' ')}</Badge>;
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge className={tripStatusStyles[status]}>{status.replace(/_/g, ' ')}</Badge>;
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  return <Badge className={severityStyles[severity]}>{severity}</Badge>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800',
    FLEET_MANAGER: 'bg-brand-100 text-brand-800',
    DRIVER: 'bg-slate-100 text-slate-700',
  };
  return <Badge className={styles[role]}>{role.replace(/_/g, ' ')}</Badge>;
}

export function AlertTypeLabel({ type }: { type: AlertType }) {
  return type.replace(/_/g, ' ');
}
