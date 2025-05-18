// components/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Menu, Search, Settings, User, LogOut, Plus, Home, ArrowLeft, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { fetchStockAlerts } from '@/lib/inventory';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavbarProps {
  screenSize?: string;
  onLogout?: () => void;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (value: boolean) => void;
  isMobileView?: boolean;
}

export default function Navbar({ 
  screenSize = 'md', 
  onLogout,
  onMenuClick,
  isMenuOpen,
  isSidebarOpen,
  setIsSidebarOpen,
  isMobileView
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthContext();
  const { role } = useTenant();
  const [isScrolled, setIsScrolled] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);

  console.log('Navbar - User:', user);
  console.log('Navbar - Role:', role);

  const isPharmacist = role === 'pharmacist';
  const isAdminOrStaff = ['admin', 'staff'].includes(role || '');
  const showStockAlerts = isPharmacist || role === 'admin';
  const totalAlerts = lowStockCount + expiringCount;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check stock alerts
  useEffect(() => {
    const checkStockAlerts = async () => {
      try {
        if (isPharmacist || role === 'admin') {
          console.log('Checking stock alerts...');
          const result = await fetchStockAlerts();
          console.log('Stock alerts result:', result);
          
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
  }, [isPharmacist, role]);

  const handleBack = () => {
    console.log('Handling back navigation from:', pathname);
    if (pathname.includes('/cashier') || pathname.includes('/pharmacy/new-sale') || pathname.includes('/appointments/book')) {
      window.location.reload();
    } else {
      router.back();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const userInitials = user?.user_metadata?.full_name
    ? getInitials(user.user_metadata.full_name)
    : user?.email?.[0].toUpperCase() || 'U';

  // Determine navbar height and padding based on screen size
  const navbarHeight = screenSize === 'xs' ? 'h-12' : 'h-14';
  const navbarPadding = screenSize === 'xs' ? 'px-1' : screenSize === 'sm' ? 'px-1.5' : 'px-2 sm:px-3';

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-gradient-to-r from-blue-100 via-teal-50 to-indigo-50 border-b border-blue-200 shadow-sm",
      navbarHeight,
      navbarPadding
    )}>
      {/* Left Section */}
      <div className={cn(
        "flex items-center gap-1",
        screenSize === 'xs' || screenSize === 'sm' ? 'my-1' : 'my-2'
      )}>
        {isMobileView && !isSidebarOpen && setIsSidebarOpen && (
          <Button
            variant="ghost"
            onClick={() => setIsSidebarOpen(true)}
            className={cn(
              "bg-blue-100 text-blue-600 hover:text-blue-700 hover:bg-blue-200 h-9 px-3 rounded-full flex items-center gap-1",
              screenSize === 'xs' && "h-8 px-2"
            )}
          >
            <div className="flex flex-col items-center gap-0.5">
              <ChevronDown className={cn('w-4 h-4', screenSize === 'xs' && 'w-3 h-3')} />
              <ChevronDown className={cn('w-4 h-4', screenSize === 'xs' && 'w-3 h-3')} />
            </div>
          </Button>
        )}
        <div className="hidden sm:block">
          <p className={cn(
            "font-semibold text-blue-700",
            screenSize === 'md' ? "text-xs" : "text-sm"
          )}>Welcome, {user?.user_metadata?.full_name || 'User'}</p>
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
                      {lowStockCount > 0 && `${lowStockCount} low stock item${lowStockCount !== 1 ? 's' : ''}`}
                      {lowStockCount > 0 && expiringCount > 0 && ' and '}
                      {expiringCount > 0 && `${expiringCount} expiring item${expiringCount !== 1 ? 's' : ''}`}
                      {totalAlerts === 0 && 'No stock alerts'}
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

          <form action={onLogout}>
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
        <DropdownMenu open={isMenuOpen} onOpenChange={onMenuClick}>
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
            onPointerDownOutside={onMenuClick}
            onInteractOutside={onMenuClick}
          >
            {showStockAlerts && (
              <DropdownMenuItem asChild>
                <Link href="/pharmacy/stock-alerts" className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={onMenuClick}>
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
            <DropdownMenuItem className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={onMenuClick}>
              <User className="h-3 w-3" />
              <span className={cn(
                "font-medium",
                screenSize === 'xs' ? "text-xs" : "text-sm"
              )}>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-blue-100" />
            {isAdminOrStaff && (
              <DropdownMenuItem asChild>
                <Link href="/signup" className="flex items-center gap-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={onMenuClick}>
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
              <form action={onLogout} className="w-full">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium",
                    screenSize === 'xs' ? "text-xs" : "text-sm"
                  )}
                  onClick={onMenuClick}
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