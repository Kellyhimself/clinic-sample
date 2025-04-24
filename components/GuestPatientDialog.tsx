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
  DialogFooter,
} from '@/components/ui/dialog';
import GuestPatientForm from './GuestPatientForm';
import type { Patient } from '@/types/supabase';

interface GuestPatientDialogProps {
  onPatientCreated?: (patient: Patient) => void;
  triggerButtonText?: string;
  className?: string;
}

export default function GuestPatientDialog({ 
  onPatientCreated,
  triggerButtonText = "Add Guest Patient",
  className
}: GuestPatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');

  const handleSuccess = (patient: Patient) => {
    console.log('Guest patient created successfully:', patient);
    if (onPatientCreated) {
      onPatientCreated(patient);
    }
    // Close the dialog after successful creation
    setOpen(false);
  };

  const handleProgress = (status: string) => {
    setProgressStatus(status);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Only allow closing if we're not in the middle of an operation
      if (!progressStatus || !isOpen) {
        setOpen(isOpen);
        if (!isOpen) {
          setProgressStatus('');
        }
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 text-xs ${className || ''}`}
        >
          {triggerButtonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg rounded-lg overflow-hidden p-0 bg-white shadow-xl sm:w-full">
        <DialogHeader className="p-2 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <DialogTitle className="text-sm font-semibold text-blue-700">Add Guest Patient</DialogTitle>
          <DialogDescription className="text-xs text-gray-600">
            Create a guest patient without requiring user registration.
            Only full name and phone number are required.
          </DialogDescription>
        </DialogHeader>
        <div className="p-3 max-h-[80vh] overflow-y-auto">
          <GuestPatientForm onSuccess={handleSuccess} onProgress={handleProgress} />
        </div>
        {progressStatus && (
          <DialogFooter className="p-2 border-t bg-blue-50">
            <div className="w-full flex items-center">
              <div className="mr-2 h-4 w-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
              <p className="text-xs text-blue-700">{progressStatus}</p>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
} 