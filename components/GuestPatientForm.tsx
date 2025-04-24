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
import { createGuestPatient, verifyPatientExists } from '@/lib/authActions';
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
    } else if (!/^\+?[0-9]+$/.test(formData.phone_number.replace(/\s/g, ''))) {
      newErrors.phone_number = 'Please enter a valid phone number';
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

  const verifyPatient = async (patientId: string, maxAttempts = 5): Promise<Patient | null> => {
    if (onProgress) onProgress('Verifying patient record...');
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const result = await verifyPatientExists(patientId);
        if (result.success && result.patient) {
          return result.patient;
        }
        
        // If not found but we have more attempts, wait before retrying
        if (attempts < maxAttempts) {
          if (onProgress) onProgress(`Waiting for database synchronization (attempt ${attempts})...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
        }
      } catch (error) {
        console.error(`Verification attempt ${attempts} failed:`, error);
        if (attempts === maxAttempts) throw error;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission attempted with data:', formData);
    
    // Validate form before submission
    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      toast.error('Please fill out all required fields correctly');
      return;
    }
    
    setIsSubmitting(true);
    if (onProgress) onProgress('Creating patient...');
    
    try {
      console.log('Submitting guest patient data:', formData);
      
      // Format phone number if needed
      let phoneNumber = formData.phone_number.trim();
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+254' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }
      
      const payload = {
        full_name: formData.full_name.trim(),
        phone_number: phoneNumber,
        email: formData.email.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
        address: formData.address.trim() || undefined
      };
      
      console.log('Formatted guest patient payload:', payload);
      
      const response = await createGuestPatient(payload);
      console.log('Guest patient creation response:', response);

      if (!response.success || !response.patient) {
        throw new Error(response.message || 'Failed to create patient');
      }
      
      // After successful creation, verify the patient exists in the database
      const verifiedPatient = await verifyPatient(response.patient.id);
      
      if (!verifiedPatient) {
        throw new Error('Patient was created but could not be verified in the database');
      }

      toast.success('Patient created and verified successfully');
      
      // Reset form
      setFormData({
        full_name: '',
        phone_number: '',
        email: '',
        date_of_birth: '',
        gender: '',
        address: ''
      });
      
      if (onSuccess) {
        onSuccess(verifiedPatient);
      }
    } catch (error) {
      console.error('Error creating guest patient:', error);
      
      // More detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to create patient';
      toast.error(`Registration failed: ${errorMessage}`);
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
          placeholder="+254XXXXXXXXX"
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
          <p className="text-[10px] text-gray-500">Format: +254XXXXXXXXX or 07XXXXXXXX</p>
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