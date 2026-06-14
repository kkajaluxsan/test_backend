import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { usersApi } from '../api';
import { PageHeader, LoadingSpinner, Modal } from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { RoleBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import type { User, UserRole } from '../types';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('FLEET_MANAGER');
  const [driverName, setDriverName] = useState('');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        email,
        password,
        role,
        ...(role === 'DRIVER'
          ? { driverName, licenseNumber: license, phone }
          : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setShowCreate(false);
      resetForm();
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  function resetForm() {
    setEmail('');
    setPassword('');
    setRole('FLEET_MANAGER');
    setDriverName('');
    setLicense('');
    setPhone('');
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage admin and driver accounts"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create user
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          data={users}
          columns={[
            { key: 'email', header: 'Email', render: (u: User) => <span className="font-medium">{u.email}</span> },
            { key: 'role', header: 'Role', render: (u: User) => <RoleBadge role={u.role} /> },
            {
              key: 'active',
              header: 'Status',
              render: (u: User) => (
                <span className={u.isActive !== false ? 'text-emerald-600' : 'text-slate-400'}>
                  {u.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (u: User) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    toggleActiveMutation.mutate({ id: u.id, isActive: u.isActive === false })
                  }
                >
                  {u.isActive === false ? 'Activate' : 'Deactivate'}
                </Button>
              ),
            },
          ]}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create user">
        <div className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: 'SUPER_ADMIN', label: 'Super Admin' },
              { value: 'FLEET_MANAGER', label: 'Fleet Manager' },
              { value: 'DRIVER', label: 'Driver' },
            ]}
          />
          {role === 'DRIVER' && (
            <>
              <Input label="Driver name" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              <Input label="License number" value={license} onChange={(e) => setLicense(e.target.value)} />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!email || !password || createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
