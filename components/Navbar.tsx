// components/Navbar.tsx
'use client';

import { Bell, UserCircle, LogOut, Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchInventory, fetchUserRole } from '@/lib/authActions';
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

  useEffect(() => {
    const checkStockAlerts = async () => {
      try {
        const role = await fetchUserRole();
        setUserRole(role);
        
        if (role === 'admin' || role === 'pharmacist') {
          const data = await fetchInventory() as {
            id: string;
            name: string;
            batches: {
              quantity: number;
              expiry_date: string;
            }[];
          }[];
          
          let lowStock = 0;
          let expiring = 0;
          
          data.forEach(medication => {
            medication.batches.forEach(batch => {
              if (batch.quantity < 10) lowStock++;
              if (new Date(batch.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
                expiring++;
              }
            });
          });
          
          setLowStockCount(lowStock);
          setExpiringCount(expiring);
        }
      } catch (error) {
        console.error('Error checking stock alerts:', error);
      }
    };

    checkStockAlerts();
    const interval = setInterval(checkStockAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const showStockAlerts = userRole === 'admin' || userRole === 'pharmacist';
  const totalAlerts = lowStockCount + expiringCount;

  return (
    <header className="w-full h-16 px-4 sm:px-6 flex items-center justify-between bg-gradient-to-r from-blue-50 via-teal-50 to-gray-50">
      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900">Welcome, {displayName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {showStockAlerts && (
            <Link href="/pharmacy/stock-alerts">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative text-gray-600 hover:text-blue-600 hover:bg-transparent">
                      <Bell className="h-5 w-5" />
                      {totalAlerts > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                          {totalAlerts}
                        </Badge>
                      )}
          </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {lowStockCount} low stock, {expiringCount} expiring
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
          )}
          
          {userRole === 'admin' && (
          <Link href="/signup">
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>New User</span>
          </Button>
          </Link>
          )}

          <form action={handleLogout}>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </form>
        </div>

        {/* Mobile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="sm:hidden">
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-blue-600">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {showStockAlerts && (
            <DropdownMenuItem asChild>
                <Link href="/pharmacy/stock-alerts" className="flex items-center gap-2 py-2">
                  <Bell className="h-4 w-4" />
                  <span>Stock Alerts</span>
                  {totalAlerts > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive" className="ml-auto">{totalAlerts}</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {lowStockCount} low stock, {expiringCount} expiring
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Link>
            </DropdownMenuItem>
            )}
            <DropdownMenuItem className="flex items-center gap-2 py-2">
              <UserCircle className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {userRole === 'admin' && (
            <DropdownMenuItem asChild>
                <Link href="/signup" className="flex items-center gap-2 py-2">
                  <Plus className="h-4 w-4" />
                  <span>New User</span>
                </Link>
            </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={handleLogout} className="w-full">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
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