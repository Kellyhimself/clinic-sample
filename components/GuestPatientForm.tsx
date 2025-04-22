'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createGuestPatientAction } from '@/lib/authActions';
import { toast } from 'sonner';
import { Patient } from '@/types/supabase';

interface GuestPatientFormProps {
  onSuccess?: (patient: Patient) => void;
  onCancel?: () => void;
}

export default function GuestPatientForm({ onSuccess, onCancel }: GuestPatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await createGuestPatientAction(formData);

      if (!response.success || !response.patient) {
        throw new Error(response.message || 'Failed to create patient');
      }

      toast.success('Patient created successfully');
      if (onSuccess) {
        onSuccess(response.patient);
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name *</Label>
        <Input
          id="full_name"
          name="full_name"
          placeholder="Enter full name"
          required
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">Phone Number *</Label>
        <Input
          id="phone_number"
          name="phone_number"
          placeholder="e.g. 0712345678"
          required
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter email address"
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_of_birth">Date of Birth</Label>
        <Input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <Select name="gender">
          <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          placeholder="Enter address"
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
        >
          {isSubmitting ? 'Creating...' : 'Create Patient'}
        </Button>
      </div>
    </form>
  );
} 