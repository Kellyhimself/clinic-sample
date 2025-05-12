'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { createGuestPatient, verifyPatientExists } from '@/lib/patients';
import type { Patient } from '@/types/supabase';

interface GuestPatientFormProps {
  onSuccess?: (patient: Patient) => void;
  onProgress?: (status: string) => void;
}

export default function GuestPatientForm({ onSuccess, onProgress }: GuestPatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    gender: '',
    address: ''
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else {
      // Remove any spaces from the phone number
      const cleanPhone = formData.phone_number.replace(/\s/g, '');
      
      // Check if it starts with +254 or 0
      if (!cleanPhone.startsWith('+254') && !cleanPhone.startsWith('0')) {
        newErrors.phone_number = 'Phone number must start with +254 or 0';
      }
      
      // Check if it's a valid length after removing +254 or 0
      const numberLength = cleanPhone.startsWith('+254') ? cleanPhone.length - 4 : cleanPhone.length - 1;
      if (numberLength !== 9) {
        newErrors.phone_number = 'Phone number must be 9 digits after the prefix';
      }
      
      // Check if it contains only numbers after the prefix
      const numberPart = cleanPhone.startsWith('+254') ? cleanPhone.substring(4) : cleanPhone.substring(1);
      if (!/^\d+$/.test(numberPart)) {
        newErrors.phone_number = 'Phone number must contain only digits after the prefix';
      }
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fill out all required fields correctly');
      return;
    }
    
    setIsSubmitting(true);
    if (onProgress) onProgress('Creating patient...');

    try {
      // Create the patient
      const response = await createGuestPatient(formData);
      
      if (!response || !response.patient) {
        throw new Error('Failed to create patient');
      }

      if (onProgress) onProgress('Verifying patient...');
      
      // Extract the actual UUID from the guest patient ID
      const actualId = response.patient.id.replace('guest_', '');
      console.log('Verifying patient with ID:', actualId);
      
      // Verify the patient exists using our existing function with the actual UUID
      const verifyResult = await verifyPatientExists(actualId);
      
      if (!verifyResult.success || !verifyResult.patient) {
        console.error('Error verifying patient:', verifyResult.message);
        throw new Error('Patient was created but could not be verified in the database');
      }

      toast.success('Patient created and verified successfully');
      
      // Call onSuccess with the original response patient (which has the guest_ prefix)
      if (onSuccess) {
        onSuccess(response.patient);
      }
    } catch (error) {
      console.error('Error creating guest patient:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
      if (onProgress) onProgress('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="full_name" className={`text-xs font-medium ${errors.full_name ? "text-red-500" : ""}`}>
          Full Name*
        </Label>
        <Input
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          className={`w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 ${
            errors.full_name ? "border-red-500" : ""
          }`}
          required
        />
        {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone_number" className={`text-xs font-medium ${errors.phone_number ? "text-red-500" : ""}`}>
          Phone Number*
        </Label>
        <Input
          id="phone_number"
          name="phone_number"
          placeholder="+254XXXXXXXXX or 07XXXXXXXX"
          value={formData.phone_number}
          onChange={handleChange}
          className={`w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 ${
            errors.phone_number ? "border-red-500" : ""
          }`}
          required
        />
        {errors.phone_number ? (
          <p className="text-xs text-red-500">{errors.phone_number}</p>
        ) : (
          <p className="text-[10px] text-gray-500">Format: +254XXXXXXXXX (e.g., +254712345678) or 07XXXXXXXX (e.g., 0712345678)</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email" className={`text-xs font-medium ${errors.email ? "text-red-500" : ""}`}>
          Email (Optional)
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className={`w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 ${
            errors.email ? "border-red-500" : ""
          }`}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="date_of_birth" className="text-xs font-medium">Date of Birth (Optional)</Label>
          <Input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={handleChange}
            className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="gender" className="text-xs font-medium">Gender (Optional)</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => handleSelectChange('gender', value)}
          >
            <SelectTrigger className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="address" className="text-xs font-medium">Address (Optional)</Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full h-8 mt-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating Patient...' : 'Create Guest Patient'}
      </Button>
    </form>
  );
} 