'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SignupFormProps {
  token: string;
  role: string;
  email: string;
}

export default function SignupForm({ token, role, email }: SignupFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    confirm_password: '',
    phone_number: '',
    license_number: '',
    specialty: '',
    specialization: '',
    department: '',
    permissions: [] as string[]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digitsOnly.startsWith('254')) {
      // Already in international format
      return `+${digitsOnly}`;
    } else if (digitsOnly.startsWith('0')) {
      // Convert 07XXXXXXXX to +2547XXXXXXXX
      return `+254${digitsOnly.substring(1)}`;
    } else if (digitsOnly.startsWith('7') || digitsOnly.startsWith('1')) {
      // For numbers starting with 7 or 1, add 254 prefix
      return `+254${digitsOnly}`;
    }
    
    // If none of the above, assume it's a full number with country code
    return `+${digitsOnly}`;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const formattedPhone = formatPhoneNumber(phone);
    return formattedPhone.match(/^\+254\d{9}$/) !== null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!validatePhoneNumber(formData.phone_number)) {
      toast.error('Invalid phone number format. Please use format 07XXXXXXXX or +254XXXXXXXXX');
      setIsLoading(false);
      return;
    }

    try {
      const form = new FormData();
      form.append('email', email);
      form.append('password', formData.password);
      form.append('fullName', formData.full_name);
      form.append('phoneNumber', formatPhoneNumber(formData.phone_number));
      form.append('token', token);

      // Add role-specific fields
      if (role === 'doctor') {
        form.append('licenseNumber', formData.license_number);
        form.append('specialty', formData.specialty);
      } else if (role === 'pharmacist') {
        form.append('licenseNumber', formData.license_number);
        form.append('specialization', formData.specialization);
      } else if (role === 'admin') {
        form.append('department', formData.department);
        form.append('permissions', JSON.stringify(formData.permissions));
      }

      const response = await fetch('/api/staff/accept-invitation', {
        method: 'POST',
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      toast.success('Account created successfully. Please log in.');

      router.push(data.redirect || '/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Invalid Invitation</h2>
            <p className="mt-2 text-sm text-gray-600">
              This invitation link is invalid or has expired.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Complete your account setup for {email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              required
              value={formData.full_name}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              name="phone_number"
              type="tel"
              required
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="07XXXXXXXX or +254XXXXXXXXX"
            />
            <p className="text-xs text-gray-500">Format: 07XXXXXXXX (e.g., 0712345678) or +254XXXXXXXXX (e.g., +254712345678)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              value={formData.confirm_password}
              onChange={handleChange}
            />
          </div>

          {(role === 'pharmacist' || role === 'doctor') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  name="license_number"
                  type="text"
                  required
                  value={formData.license_number}
                  onChange={handleChange}
                />
              </div>

              {role === 'doctor' && (
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input
                    id="specialty"
                    name="specialty"
                    type="text"
                    required
                    value={formData.specialty}
                    onChange={handleChange}
                  />
                </div>
              )}

              {role === 'pharmacist' && (
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    name="specialization"
                    type="text"
                    required
                    value={formData.specialization}
                    onChange={handleChange}
                  />
                </div>
              )}
            </>
          )}

          {role === 'admin' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administration">Administration</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {['all', 'read', 'write', 'delete'].map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`permission-${permission}`}
                        checked={formData.permissions.includes(permission)}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            permissions: e.target.checked
                              ? [...prev.permissions, permission]
                              : prev.permissions.filter(p => p !== permission)
                          }));
                        }}
                      />
                      <Label htmlFor={`permission-${permission}`} className="capitalize">
                        {permission}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 