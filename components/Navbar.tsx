// components/Navbar.tsx
'use client';

import { Bell, UserCircle, LogOut, Menu, Plus, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchStockAlerts } from '@/lib/inventory';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface NavbarProps {
  screenSize: string;
  user: User;
  tenantContext: {
    name: string;
    role: string;
  } | null;
  onLogout: () => Promise<void>;
}

export default function Navbar({ screenSize, user, tenantContext, onLogout }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminOrStaff = tenantContext?.role === 'admin' || tenantContext?.role === 'staff';
  const isPharmacist = tenantContext?.role === 'pharmacist' || tenantContext?.role === 'admin';
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);

  // Debug props
  useEffect(() => {
    console.log("Navbar received props:", { user, tenantContext, screenSize });
  }, [user, tenantContext, screenSize]);

  const handleSignOut = async () => {
    await onLogout();
  };

  const handleBack = () => {
    // Check if we're in a form page
    if (pathname.includes('/cashier') || pathname.includes('/pharmacy/new-sale') || pathname.includes('/appointments/book')) {
      // Refresh the page to reset the form
      window.location.reload();
    } else {
      // Regular back navigation
      router.back();
    }
  };

  useEffect(() => {
    const checkStockAlerts = async () => {
      try {
        if (isPharmacist) {
          const result = await fetchStockAlerts();
          if (result) {
            const { lowStock = [], expiring = [] } = result;
            setLowStockCount(lowStock.length);
            setExpiringCount(expiring.length);
          } else {
            setLowStockCount(0);
            setExpiringCount(0);
          }
        }
      } catch (error) {
        console.error('Error checking stock alerts:', error);
        setLowStockCount(0);
        setExpiringCount(0);
      }
    };

    checkStockAlerts();
    const interval = setInterval(checkStockAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isPharmacist]);

  const showStockAlerts = isAdminOrStaff;
  const totalAlerts = lowStockCount + expiringCount;
  
  // Get the second name from the user's full name
  const getSecondName = (fullName: string) => {
    const names = fullName.split(' ');
    return names.length > 1 ? names[1] : names[0];
  };
  
  const displayName = user?.user_metadata?.full_name 
    ? getSecondName(user.user_metadata.full_name)
    : 'User';

  // Determine navbar height and padding based on screen size
  const navbarHeight = screenSize === 'xs' ? 'h-12' : 'h-14';
  const navbarPadding = screenSize === 'xs' ? 'px-1' : screenSize === 'sm' ? 'px-1.5' : 'px-2 sm:px-3';

  return (
    <header className={cn(
      "w-full flex items-center justify-between bg-gradient-to-r from-blue-100 via-teal-50 to-indigo-50 border-b border-blue-200 shadow-sm",
      navbarHeight,
      navbarPadding
    )}>
      {/* Left Section */}
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

      {/* Center Section - Navigation Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-9 px-3 rounded-full flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-9 px-3 rounded-full flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
          <span className="text-sm font-medium">Home</span>
        </Button>
      </div>

      {/* Right Section */}
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
                        <span className="relative flex h-5 w-5 absolute -top-1 -right-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 items-center justify-center text-white text-xs font-bold">
                            {totalAlerts}
                          </span>
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border border-blue-100 shadow-md">
                    <p className="text-xs text-blue-700">
                      {lowStockCount} low stock and {expiringCount} expiring items
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
          )}
          
          {isAdminOrStaff && (
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
                "bg-blue-100 text-blue-600 hover:text-blue-700 hover:bg-blue-200 shadow-md",
                screenSize === 'xs' ? "h-8 w-8 rounded-none" : "h-9 w-9 rounded-none",
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
                    <span className="relative flex h-5 w-5 ml-auto">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 items-center justify-center text-white text-xs font-bold">
                        {totalAlerts}
                      </span>
                    </span>
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
            {isAdminOrStaff && (
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