import { apiRequest, setStoredAuth, clearStoredAuth } from './client';
import type {
  Alert,
  AuthUser,
  DashboardSummary,
  Driver,
  FuelEntry,
  FuelKpis,
  LoginResponse,
  RoutePoint,
  Trip,
  Truck,
  LivePosition,
  User,
} from '../types';

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });
    setStoredAuth(data.accessToken, data.refreshToken, data.user);
    return data;
  },
  logout: () => clearStoredAuth(),
};

export const dashboardApi = {
  summary: () => apiRequest<DashboardSummary>('/dashboard/summary').then((r) => r.data),
};

export const trucksApi = {
  list: () => apiRequest<Truck[]>('/trucks').then((r) => r.data),
  get: (id: string) => apiRequest<Truck>(`/trucks/${id}`).then((r) => r.data),
  live: (id: string) => apiRequest<LivePosition | null>(`/trucks/${id}/live`).then((r) => r.data),
  trips: (id: string, params?: Record<string, string | number>) =>
    apiRequest<Trip[]>(`/trucks/${id}/trips`, { params }).then((r) => ({
      data: r.data,
      meta: r.meta,
    })),
  create: (body: { registrationNumber: string; trailerNumber?: string }) =>
    apiRequest<Truck>('/trucks', { method: 'POST', body }).then((r) => r.data),
  update: (id: string, body: Partial<Pick<Truck, 'registrationNumber' | 'trailerNumber' | 'status'>>) =>
    apiRequest<Truck>(`/trucks/${id}`, { method: 'PATCH', body }).then((r) => r.data),
  updateStatus: (id: string, status: Truck['status']) =>
    apiRequest<Truck>(`/trucks/${id}/status`, { method: 'PATCH', body: { status } }).then(
      (r) => r.data,
    ),
};

export const driversApi = {
  list: () => apiRequest<Driver[]>('/drivers').then((r) => r.data),
  get: (id: string) => apiRequest<Driver>(`/drivers/${id}`).then((r) => r.data),
  update: (id: string, body: Partial<Pick<Driver, 'name' | 'licenseNumber' | 'phone'>>) =>
    apiRequest<Driver>(`/drivers/${id}`, { method: 'PATCH', body }).then((r) => r.data),
  assignTruck: (id: string, truckId: string) =>
    apiRequest<Driver>(`/drivers/${id}/assign-truck`, {
      method: 'POST',
      body: { truckId },
    }).then((r) => r.data),
  trips: (id: string, params?: Record<string, string | number>) =>
    apiRequest<Trip[]>(`/drivers/${id}/trips`, { params }).then((r) => ({
      data: r.data,
      meta: r.meta,
    })),
};

export const tripsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<Trip[]>('/trips', { params }).then((r) => ({ data: r.data, meta: r.meta })),
  get: (id: string) => apiRequest<Trip>(`/trips/${id}`).then((r) => r.data),
  route: (id: string) => apiRequest<RoutePoint[]>(`/trips/${id}/route`).then((r) => r.data),
};

export const fuelApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiRequest<FuelEntry[]>('/fuel', { params }).then((r) => ({ data: r.data, meta: r.meta })),
  kpis: (params?: Record<string, string | undefined>) =>
    apiRequest<FuelKpis>('/fuel/kpis', { params }).then((r) => r.data),
};

export const alertsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<Alert[]>('/alerts', { params }).then((r) => ({ data: r.data, meta: r.meta })),
  resolve: (id: string) =>
    apiRequest<Alert>(`/alerts/${id}/resolve`, { method: 'PATCH' }).then((r) => r.data),
};

export const usersApi = {
  list: () => apiRequest<User[]>('/users').then((r) => r.data),
  create: (body: {
    email: string;
    password: string;
    role: User['role'];
    driverName?: string;
    licenseNumber?: string;
    phone?: string;
  }) => apiRequest<User>('/users', { method: 'POST', body }).then((r) => r.data),
  update: (id: string, body: Partial<Pick<User, 'email' | 'role' | 'isActive'>>) =>
    apiRequest<User>(`/users/${id}`, { method: 'PATCH', body }).then((r) => r.data),
};

export const reportsApi = {
  preview: (type: string, params: Record<string, string>) => {
    const paths: Record<string, string> = {
      daily: '/reports/daily',
      monthly: '/reports/monthly',
      custom: '/reports/custom',
      fuel: '/reports/fuel',
      trips: '/reports/trips',
    };
    return apiRequest<unknown>(paths[type], { params: { ...params, format: 'json' } }).then(
      (r) => r.data,
    );
  },
};

export type { AuthUser };
