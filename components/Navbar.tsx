// components/Navbar.tsx
'use client';

import { Bell, UserCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';

interface NavbarProps {
  handleLogout: () => Promise<void>;
  user: User; // Add user prop
}

export default function Navbar({ handleLogout, user }: NavbarProps) {
  const displayName = user.user_metadata?.full_name || user.email || 'User';

  return (
    <header className="w-full h-16 px-4 sm:px-6 flex items-center justify-between border-b bg-white shadow-sm">
      <h2 className="text-lg font-semibold">Welcome back, {displayName} 👋</h2>
      <div className="flex items-center gap-2 sm:gap-4">
        <Bell className="text-gray-600 w-5 h-5" />
        <UserCircle className="text-gray-600 w-5 h-5" />
        <Button
          variant="outline"
          className="w-full sm:w-auto text-blue-600 border-blue-600 hover:bg-blue-50 text-sm py-1 px-2 sm:px-3"
        >
          Register User
        </Button>
        <form action={handleLogout}>
          <Button
            variant="outline"
            className="w-full sm:w-auto text-red-600 border-red-600 hover:bg-red-50 text-sm py-1 px-2 sm:px-3"
            type="submit"
          >
            <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </form>
      </div>
    </header>
  );
}