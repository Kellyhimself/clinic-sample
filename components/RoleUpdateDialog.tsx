// components/RoleUpdateDialog.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setUserRole } from '@/lib/authActions';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: string;
};

interface RoleUpdateDialogProps {
  user: Profile;
}

export default function RoleUpdateDialog({ user }: RoleUpdateDialogProps) {
  const [role, setRole] = useState(user.role);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('role', role);
      await setUserRole(formData);
      setOpen(false);
      router.refresh(); // Refresh to update table
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Role</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Role for {user.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="patient">Patient</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSubmit}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}