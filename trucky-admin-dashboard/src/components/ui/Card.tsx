import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border border-surface-border bg-white shadow-card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          {title && <h3 className="font-semibold text-slate-900">{title}</h3>}
          {action}
        </div>
      )}
      <div className={cn(!title && !action && 'p-5', (title || action) && 'p-5')}>{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'brand',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  accent?: 'brand' | 'green' | 'amber' | 'red' | 'slate';
}) {
  const accents = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
        </div>
        {icon && (
          <div className={cn('rounded-lg p-2.5', accents[accent])}>{icon}</div>
        )}
      </div>
    </div>
  );
}
