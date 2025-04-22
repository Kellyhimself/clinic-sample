'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import GuestPatientForm from './GuestPatientForm';
import { Patient } from '@/types/supabase';
import { Plus } from 'lucide-react';

interface GuestPatientDialogProps {
  onPatientCreated: (patient: Patient) => void;
  triggerButtonText?: string;
}

export default function GuestPatientDialog({
  onPatientCreated,
  triggerButtonText = 'Add New Patient',
}: GuestPatientDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = (patient: Patient) => {
    onPatientCreated(patient);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1 bg-gradient-to-r from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200">
          <Plus className="h-3.5 w-3.5" />
          {triggerButtonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Create a new patient record. Fill in at least the required fields.
          </DialogDescription>
        </DialogHeader>
        <GuestPatientForm
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
} 