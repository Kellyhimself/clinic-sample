'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createGuestPatient, verifyPatientExists } from '@/lib/patients';
import type { Patient } from '@/types/supabase';
import {
  formLabelStyles,
  formLabelErrorStyles,
  formInputStyles,
  formInputErrorStyles,
  formSelectStyles,
  formErrorStyles,
  formHelperStyles,
  formSectionStyles,
  formGroupStyles,
  formButtonStyles,
  formLoadingStates,
  formValidationMessages,
  formPlaceholders
} from '@/components/shared/FormStyles';

interface GuestPatientFormProps {
  onSuccess?: (patient: Patient) => void;
  onProgress?: (status: string) => void;
}

export default function GuestPatientForm({ onSuccess, onProgress }: GuestPatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    gender: '',
    address: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user makes a selection
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = formValidationMessages.required;
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = formValidationMessages.required;
    } else {
      const phoneRegex = /^(\+254|0)[17]\d{8}$/;
      if (!phoneRegex.test(formData.phone_number)) {
        newErrors.phone_number = formValidationMessages.invalidPhone;
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = formValidationMessages.invalidEmail;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    onProgress?.(formLoadingStates.creating);

    try {
      // Check if patient already exists
      const exists = await verifyPatientExists(formData.phone_number);
      if (exists) {
        setErrors({ phone_number: 'A patient with this phone number already exists' });
        return;
      }

      const result = await createGuestPatient(formData);
      
      if (result.success && result.patient) {
        // Convert the guest patient to the expected Patient type
        const patient: Patient = {
          ...result.patient,
          patient_type: 'guest',
          reference_id: result.patient.id,
          user_id: null
        };
        
        toast.success('Guest patient created successfully');
        onSuccess?.(patient);
      } else {
        throw new Error(result.message || 'Failed to create guest patient');
      }
    } catch (error) {
      console.error('Error creating guest patient:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create guest patient');
    } finally {
      setIsSubmitting(false);
      onProgress?.('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={formSectionStyles}>
      <div className={formGroupStyles}>
        <Label htmlFor="full_name" className={errors.full_name ? formLabelErrorStyles : formLabelStyles}>
          Full Name*
        </Label>
        <Input
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          className={errors.full_name ? formInputErrorStyles : formInputStyles}
          placeholder={formPlaceholders.name}
          required
        />
        {errors.full_name && <p className={formErrorStyles}>{errors.full_name}</p>}
      </div>

      <div className={formGroupStyles}>
        <Label htmlFor="phone_number" className={errors.phone_number ? formLabelErrorStyles : formLabelStyles}>
          Phone Number*
        </Label>
        <Input
          id="phone_number"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          className={errors.phone_number ? formInputErrorStyles : formInputStyles}
          placeholder={formPlaceholders.phone}
          required
        />
        {errors.phone_number ? (
          <p className={formErrorStyles}>{errors.phone_number}</p>
        ) : (
          <p className={formHelperStyles}>Format: +254XXXXXXXXX (e.g., +254712345678) or 07XXXXXXXX (e.g., 0712345678)</p>
        )}
      </div>

      <div className={formGroupStyles}>
        <Label htmlFor="email" className={errors.email ? formLabelErrorStyles : formLabelStyles}>
          Email (Optional)
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? formInputErrorStyles : formInputStyles}
          placeholder={formPlaceholders.email}
        />
        {errors.email && <p className={formErrorStyles}>{errors.email}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={formGroupStyles}>
          <Label htmlFor="date_of_birth" className={formLabelStyles}>Date of Birth (Optional)</Label>
          <Input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={handleChange}
            className={formInputStyles}
            placeholder={formPlaceholders.date}
          />
        </div>

        <div className={formGroupStyles}>
          <Label htmlFor="gender" className={formLabelStyles}>Gender (Optional)</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => handleSelectChange('gender', value)}
          >
            <SelectTrigger className={formSelectStyles}>
              <SelectValue placeholder={formPlaceholders.select} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={formGroupStyles}>
        <Label htmlFor="address" className={formLabelStyles}>Address (Optional)</Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className={formInputStyles}
          placeholder={formPlaceholders.address}
        />
      </div>

      <Button 
        type="submit" 
        className={formButtonStyles.primary}
        disabled={isSubmitting}
      >
        {isSubmitting ? formLoadingStates.creating : 'Create Guest Patient'}
      </Button>
    </form>
  );
} 