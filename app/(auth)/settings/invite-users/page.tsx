'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LimitAwareButton } from '@/components/shared/LimitAwareButton';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';

const roles = [
  { value: 'admin', label: 'Administrator' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'staff', label: 'Staff' }
];

export default function InviteUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();
  const { tenantId } = useTenant();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: '',
    license_number: '',
    specialty: '',
    department: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/staff/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          tenantId,
          metadata: {
            full_name: formData.full_name,
            license_number: formData.license_number,
            specialization: formData.specialty,
            department: formData.department
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast.success('Invitation sent successfully!');
      setFormData({
        email: '',
        full_name: '',
        role: '',
        license_number: '',
        specialty: '',
        department: ''
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value,
      // Reset role-specific fields when role changes
      license_number: '',
      specialty: '',
      department: value === 'cashier' ? 'Finance' : 
                 value === 'admin' ? 'Administration' : ''
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Send User Invitation
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Invite new users to join your clinic. They will receive an email with instructions to set up their account.
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(formData.role === 'doctor' || formData.role === 'pharmacist') && (
              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  required
                  value={formData.license_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                  placeholder="Enter license number"
                />
              </div>
            )}
            {formData.role === 'doctor' && (
              <div>
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  required
                  value={formData.specialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Enter specialty"
                />
              </div>
            )}
            {formData.role && (
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Enter department"
                />
              </div>
            )}
          </div>
          <LimitAwareButton
            type="button"
            limitType="users"
            loading={loading}
            className="w-full"
            onClick={handleSubmit}
          >
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </LimitAwareButton>
        </form>
      </div>
    </div>
  );
} 