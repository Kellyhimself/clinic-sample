'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGuestPatient } from '@/lib/patients';
import { toast } from 'sonner';
import type { Patient } from '@/types/supabase';

interface GuestPatientDialogProps {
  onPatientCreated: (patient: Patient) => Promise<void>;
  triggerButtonText?: string;
  triggerButton?: React.ReactNode;
}

export default function GuestPatientDialog({ 
  onPatientCreated, 
  triggerButtonText = "Add Guest",
  triggerButton
}: GuestPatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createGuestPatient({
        full_name: fullName,
        phone_number: phoneNumber
      });

      if (result.success && result.patient) {
        await onPatientCreated(result.patient as unknown as Patient);
        setOpen(false);
        setFullName('');
        setPhoneNumber('');
        toast.success('Guest patient created successfully');
      } else {
        throw new Error(result.message || 'Failed to create guest patient');
      }
    } catch (error) {
      console.error('Error creating guest patient:', error);
      toast.error('Failed to create guest patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={handleOpen}>
          {triggerButton}
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleOpen}
        >
          {triggerButtonText}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Guest Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Guest'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 