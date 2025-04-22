'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface NewServiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function NewServiceForm({ onSuccess, onCancel }: NewServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // This is a stub - would normally call an API
    // Simulate API call with timeout
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess();
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-md">
        This is a stub form for demonstration purposes. 
        In a production environment, this would include fields for patient selection, 
        service items, doctor assignment, payment details, etc.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patient">Patient Name</Label>
          <Input id="patient" placeholder="Select patient..." />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="doctor">Doctor</Label>
          <Input id="doctor" placeholder="Select doctor..." />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Service Items</Label>
        <div className="border p-3 rounded-md">
          <p className="text-gray-500 text-sm">Service items would be added here...</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment">Payment Method</Label>
        <Input id="payment" placeholder="Select payment method..." />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Service Record'}
        </Button>
      </div>
    </form>
  );
} 