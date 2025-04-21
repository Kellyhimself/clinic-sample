// components/Navbar.tsx
'use client';

import { Bell, UserCircle, LogOut, Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchUserRole, fetchStockAlerts } from '@/lib/authActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  handleLogout: () => Promise<void>;
  user: User;
}

export default function Navbar({ handleLogout, user }: NavbarProps) {
  const displayName = user.user_metadata?.full_name || user.email || 'User';
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('');

  const handleSignOut = async () => {
    await handleLogout();
    window.location.href = '/';
  };

  useEffect(() => {
    const checkStockAlerts = async () => {
      try {
        const role = await fetchUserRole();
        setUserRole(role);
        
        if (role === 'admin' || role === 'pharmacist') {
          const { lowStock, expiring } = await fetchStockAlerts();
          setLowStockCount(lowStock.length);
          setExpiringCount(expiring.length);
        }
      } catch (error) {
        console.error('Error checking stock alerts:', error);
      }
    };

    checkStockAlerts();
    const interval = setInterval(checkStockAlerts, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const showStockAlerts = userRole === 'admin' || userRole === 'pharmacist';
  const totalAlerts = lowStockCount + expiringCount;

  return (
    <header className="w-full h-14 px-2 sm:px-3 flex items-center justify-between bg-gradient-to-r from-blue-100 via-teal-50 to-indigo-50 border-b border-blue-200 shadow-sm">
      <div className="flex items-center gap-1 mt-2">
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-blue-700">Welcome, {displayName}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2">
        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2">
          {showStockAlerts && (
            <Link href="/pharmacy/stock-alerts" className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-9 w-9 rounded-full">
                      <Bell className="h-4 w-4" />
                      {totalAlerts > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px] font-bold">
                          {totalAlerts}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border border-blue-100 shadow-md">
                    <p className="text-sm font-medium text-blue-700">
                      {lowStockCount} low stock, {expiringCount} expiring
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
          )}
          
          {userRole === 'admin' && (
            <Link href="/signup">
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-sm font-medium h-9 rounded-full">
                <Plus className="h-3 w-3" />
                <span>New User</span>
              </Button>
            </Link>
          )}

          <form action={handleSignOut}>
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1 text-sm font-medium h-9 rounded-full"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign Out</span>
            </Button>
          </form>
        </div>

        {/* Mobile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="sm:hidden">
            <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-9 w-9 rounded-full">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1 bg-white border border-blue-100 shadow-lg rounded-lg">
            {showStockAlerts && (
              <DropdownMenuItem asChild>
                <Link href="/pharmacy/stock-alerts" className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Bell className="h-3 w-3" />
                  <span className="text-sm font-medium">Stock Alerts</span>
                  {totalAlerts > 0 && (
                    <Badge variant="destructive" className="ml-auto text-[8px] font-bold">{totalAlerts}</Badge>
                  )}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <UserCircle className="h-3 w-3" />
              <span className="text-sm font-medium">Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-blue-100" />
            {userRole === 'admin' && (
              <DropdownMenuItem asChild>
                <Link href="/signup" className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Plus className="h-3 w-3" />
                  <span className="text-sm font-medium">New User</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-blue-100" />
            <DropdownMenuItem asChild>
              <form action={handleSignOut} className="w-full">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm font-medium"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign Out</span>
                </Button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}