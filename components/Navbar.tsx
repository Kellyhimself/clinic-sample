// components/Navbar.tsx
'use client';

import { Bell, UserCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';

interface NavbarProps {
  handleLogout: () => Promise<void>;
  user: User;
}

export default function Navbar({ handleLogout, user }: NavbarProps) {
  const displayName = user.user_metadata?.full_name || user.email || 'User';

  return (
    <header className="w-full h-16 px-4 sm:px-6 flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-teal-50 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 truncate max-w-[50%] sm:max-w-full">
        Welcome back, {displayName} 👋
      </h2>
      <div className="flex items-center gap-2">
        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" className="p-2 text-gray-600 hover:bg-blue-100">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" className="p-2 text-gray-600 hover:bg-blue-100">
            <UserCircle className="w-5 h-5" />
          </Button>
          <Button variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-100 text-sm py-1 px-3">
            Register User
          </Button>
          <form action={handleLogout}>
            <Button
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-100 text-sm py-1 px-3 flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </form>
        </div>
        {/* Mobile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="sm:hidden">
            <Button variant="ghost" className="p-2 text-gray-600 hover:bg-blue-100">
              <Menu className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Button variant="ghost" className="w-full justify-start text-gray-600">
                <Bell className="w-5 h-5 mr-2" />
                Notifications
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button variant="ghost" className="w-full justify-start text-gray-600">
                <UserCircle className="w-5 h-5 mr-2" />
                Profile
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button variant="outline" className="w-full justify-start text-blue-600 border-blue-600">
                Register staff
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <form action={handleLogout} className="w-full">
                <Button variant="outline" className="w-full justify-start text-red-600 border-red-600 flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}