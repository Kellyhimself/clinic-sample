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
import { cn } from '@/lib/utils';

interface NavbarProps {
  handleLogout: () => Promise<void>;
  user: User;
  screenSize?: string;
}

export default function Navbar({ handleLogout, user, screenSize = 'lg' }: NavbarProps) {
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

  // Determine navbar height and padding based on screen size
  const navbarHeight = screenSize === 'xs' ? 'h-12' : 'h-14';
  const navbarPadding = screenSize === 'xs' ? 'px-1' : screenSize === 'sm' ? 'px-1.5' : 'px-2 sm:px-3';

  return (
    <header className={cn(
      "w-full flex items-center justify-between bg-gradient-to-r from-blue-100 via-teal-50 to-indigo-50 border-b border-blue-200 shadow-sm",
      navbarHeight,
      navbarPadding
    )}>
      <div className={cn(
        "flex items-center gap-1",
        screenSize === 'xs' || screenSize === 'sm' ? 'my-1' : 'my-2'
      )}>
        <div className="hidden sm:block">
          <p className={cn(
            "font-semibold text-blue-700",
            screenSize === 'md' ? "text-xs" : "text-sm"
          )}>Welcome, {displayName}</p>
        </div>
      </div>

      <div className={cn(
        "flex items-center gap-1",
        screenSize === 'xs' || screenSize === 'sm' ? 'my-1' : 'my-2'
      )}>
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
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "bg-white text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full shadow-md",
                screenSize === 'xs' ? "h-8 w-8" : "h-9 w-9",
                // Add specific styling for problematic screen sizes to ensure visibility
                screenSize === 'sm' && "mr-1.5"
              )}
            >
              <Menu className={cn(
                screenSize === 'xs' ? "h-3.5 w-3.5" : "h-4 w-4"
              )} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className={cn(
              "mt-1 bg-white border border-blue-100 shadow-lg rounded-lg",
              screenSize === 'xs' ? "w-48" : "w-56"
            )}
          >
            {showStockAlerts && (
              <DropdownMenuItem asChild>
                <Link href="/pharmacy/stock-alerts" className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Bell className="h-3 w-3" />
                  <span className={cn(
                    "font-medium",
                    screenSize === 'xs' ? "text-xs" : "text-sm"
                  )}>Stock Alerts</span>
                  {totalAlerts > 0 && (
                    <Badge variant="destructive" className="ml-auto text-[8px] font-bold">{totalAlerts}</Badge>
                  )}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <UserCircle className="h-3 w-3" />
              <span className={cn(
                "font-medium",
                screenSize === 'xs' ? "text-xs" : "text-sm"
              )}>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-blue-100" />
            {userRole === 'admin' && (
              <DropdownMenuItem asChild>
                <Link href="/signup" className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Plus className="h-3 w-3" />
                  <span className={cn(
                    "font-medium",
                    screenSize === 'xs' ? "text-xs" : "text-sm"
                  )}>New User</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-blue-100" />
            <DropdownMenuItem asChild>
              <form action={handleSignOut} className="w-full">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium",
                    screenSize === 'xs' ? "text-xs" : "text-sm"
                  )}
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