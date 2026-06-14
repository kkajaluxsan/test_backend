const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const TOKEN_KEY = 'trucky_access_token';
const REFRESH_KEY = 'trucky_refresh_token';
const USER_KEY = 'trucky_user';

export function getApiUrl() {
  return API_URL.replace(/\/$/, '');
}

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function setStoredAuth(accessToken: string, refreshToken: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser<T>() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) return null;

  const res = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearStoredAuth();
    return null;
  }

  const json = await res.json();
  const accessToken = json.data?.accessToken as string;
  if (accessToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    return accessToken;
  }
  return null;
}

export async function getValidAccessToken(): Promise<string | null> {
  const { accessToken } = getStoredTokens();
  return accessToken;
}

export class ApiClientError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

function buildUrl(path: string, params?: RequestOptions['params']) {
  const url = new URL(`${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: import('../types').ApiMeta }> {
  const { body, params, skipAuth, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = await getValidAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(buildUrl(path, params), {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(buildUrl(path, params), {
        ...rest,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } else {
      clearStoredAuth();
      window.location.href = '/login';
      throw new ApiClientError('UNAUTHORIZED', 'Session expired', 401);
    }
  }

  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/pdf') || contentType.includes('text/csv')) {
    const blob = await res.blob();
    if (!res.ok) throw new ApiClientError('EXPORT_FAILED', 'Export failed', res.status);
    return { data: blob as unknown as T };
  }

  const json = await res.json();

  if (!res.ok || json.success === false) {
    const err = json.error ?? {};
    throw new ApiClientError(
      err.code ?? 'UNKNOWN',
      err.message ?? 'Request failed',
      err.statusCode ?? res.status,
    );
  }

  return { data: json.data as T, meta: json.meta };
}

export async function downloadReport(
  type: import('../types').ReportType,
  params: Record<string, string>,
  format: 'pdf' | 'csv',
) {
  const paths: Record<string, string> = {
    daily: '/reports/daily',
    monthly: '/reports/monthly',
    custom: '/reports/custom',
    fuel: '/reports/fuel',
    trips: '/reports/trips',
  };

  const token = await getValidAccessToken();
  const url = buildUrl(paths[type], { ...params, format });
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) throw new ApiClientError('EXPORT_FAILED', 'Export failed', res.status);
  return res.blob();
}
