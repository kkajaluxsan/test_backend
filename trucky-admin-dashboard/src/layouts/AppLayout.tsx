import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Truck,
  Users,
  Route,
  Fuel,
  Bell,
  FileText,
  UserCog,
  LogOut,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '../api';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: Map, label: 'Live Map' },
  { to: '/fleet', icon: Truck, label: 'Fleet' },
  { to: '/drivers', icon: Users, label: 'Drivers' },
  { to: '/trips', icon: Route, label: 'Trips' },
  { to: '/fuel', icon: Fuel, label: 'Fuel' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/users', icon: UserCog, label: 'Users' },
];

export function AppLayout() {
  const { user, logout, wsStatus, recentAlerts } = useAuth();
  const navigate = useNavigate();

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'unresolved-count'],
    queryFn: () => alertsApi.list({ resolved: false, limit: 5 }),
    refetchInterval: 60000,
  });

  const unresolvedCount = alertsData?.meta?.total ?? alertsData?.data?.length ?? 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-surface-border bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-surface-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
            T
          </div>
          <div>
            <p className="font-bold text-slate-900">Trucky Italia</p>
            <p className="text-xs text-slate-500">Fleet Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
              {label === 'Alerts' && unresolvedCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {unresolvedCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-surface-border p-4">
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-900">{user?.email}</p>
            <p className="text-xs text-slate-500">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-white/80 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            {wsStatus === 'connected' ? (
              <>
                <Wifi className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">Live connected</span>
              </>
            ) : wsStatus === 'connecting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                <span className="text-amber-700">Reconnecting…</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Offline</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {recentAlerts.length > 0 && (
              <div className="hidden max-w-md md:block">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                  Latest: {recentAlerts[0].message}
                </div>
              </div>
            )}
            <button
              onClick={() => navigate('/alerts')}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              <Bell className="h-5 w-5" />
              {unresolvedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unresolvedCount > 9 ? '9+' : unresolvedCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
