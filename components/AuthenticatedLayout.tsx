// components/AuthenticatedLayout.tsx
'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  handleLogout: () => Promise<void>;
  userRole: string;
  user: User;
  profile: { role: string };
}

export default function AuthenticatedLayout({
  children,
  handleLogout,
  userRole,
  user,
  profile, // eslint-disable-line @typescript-eslint/no-unused-vars
}: AuthenticatedLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  console.log('AuthenticatedLayout userRole:', userRole); // Debug log
  return (
    <div className="flex h-screen">
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 md:w-64`}
      >
        <Sidebar userRole={userRole} />
        <Button
          variant="ghost"
          className="absolute top-4 right-4 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex flex-col flex-1">
        <Navbar handleLogout={handleLogout} user={user} />
        <main className="p-4 sm:p-6 bg-gray-50 flex-1 overflow-y-auto">
          <Button
            variant="ghost"
            className="md:hidden mb-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          {children}
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}