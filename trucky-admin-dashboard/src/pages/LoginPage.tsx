import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../layouts/AppLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ApiClientError } from '../api/client';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('manager@truckyitalia.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">
            T
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Trucky Italia</h1>
          <p className="mt-1 text-sm text-slate-500">Fleet management portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Fleet managers and super admins only
        </p>
      </div>
    </AuthLayout>
  );
}
