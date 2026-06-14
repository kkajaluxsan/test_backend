import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api';
import { getStoredUser } from '../api/client';
import { fleetSocket, logoutAndDisconnect, type WsStatus } from '../ws/fleet-socket';
import type { AlertFiredEvent, AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  wsStatus: WsStatus;
  recentAlerts: AlertFiredEvent[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearRecentAlert: (index: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser<AuthUser>());
  const [isLoading, setIsLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');
  const [recentAlerts, setRecentAlerts] = useState<AlertFiredEvent[]>([]);

  useEffect(() => {
    if (user && (user.role === 'SUPER_ADMIN' || user.role === 'FLEET_MANAGER')) {
      fleetSocket.connect();
    }
    return () => fleetSocket.disconnect();
  }, [user?.id]);

  useEffect(() => {
    const unsubStatus = fleetSocket.onStatus(setWsStatus);
    const unsubAlert = fleetSocket.onAlertFired((alert) => {
      setRecentAlerts((prev) => [alert, ...prev].slice(0, 10));
    });
    const unsubSos = fleetSocket.onSosTriggered((alert) => {
      const payload = alert as { truckId?: string };
      setRecentAlerts((prev) => [
        {
          alertType: 'SOS' as const,
          severity: 'CRITICAL' as const,
          truckId: payload.truckId ?? '',
          message: 'SOS emergency triggered',
        },
        ...prev,
      ].slice(0, 10));
    });
    return () => {
      unsubStatus();
      unsubAlert();
      unsubSos();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(email, password);
      if (data.user.role === 'DRIVER') {
        authApi.logout();
        throw new Error('This portal is for fleet managers only.');
      }
      setUser(data.user);
      fleetSocket.connect();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutAndDisconnect();
    setUser(null);
    setRecentAlerts([]);
  }, []);

  const clearRecentAlert = useCallback((index: number) => {
    setRecentAlerts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      wsStatus,
      recentAlerts,
      login,
      logout,
      clearRecentAlert,
    }),
    [user, isLoading, wsStatus, recentAlerts, login, logout, clearRecentAlert],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
