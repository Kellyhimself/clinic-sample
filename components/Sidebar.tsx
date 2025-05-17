// components/Sidebar.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  ChevronDown, 
  Pill, 
  BarChart, 
  Package, 
  ShoppingCart, 
  FileText,
  Plus,
  ClipboardList,
  DollarSign,
  History,
  AlertCircle,
  Boxes,
  Receipt,
  Truck,
  CreditCard,
  LineChart,
  HeartPulse,
  Stethoscope,
  PlusCircle,
  X
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchStockAlerts } from '@/lib/inventory';
import { getAllPendingPayments } from '@/lib/cashier';
import { useAuth } from '@/app/lib/auth/AuthProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SubNavItem { 
  label: string; 
  href: string; 
  icon?: React.ReactNode;
  roles?: string[];
  hasAlerts?: boolean;
  alertCount?: number;
}

interface NavItem { 
  label: string; 
  href: string; 
  icon: React.ReactNode; 
  subItems?: SubNavItem[];
  roles?: string[]; // Add role restriction
}

interface Medication {
  id: string;
  name: string;
  category: string | null;
  dosage_form: string;
  strength: string;
  description: string | null;
  batches?: {
    id: string;
    quantity: number;
    expiry_date: string;
  }[];
}

interface SidebarProps {
  closeSidebar?: () => void; // Optional callback to close the sidebar when a link is clicked
}

export default function Sidebar({ closeSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { tenantContext } = useAuth();
  const [hasStockAlerts, setHasStockAlerts] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0); 
  const [pendingSales, setPendingSales] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key for dropdowns
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  // Handle role-based data fetching and alerts
  useEffect(() => {
    if (!['admin', 'cashier'].includes(tenantContext?.role || '')) {
      return;
    }

    const checkPendingPayments = async () => {
      try {
        const pendingPayments = await getAllPendingPayments();
        setPendingPaymentsCount(pendingPayments.total);
        setPendingAppointments(pendingPayments.appointmentsCount);
        setPendingSales(pendingPayments.salesCount);
      } catch (error) {
        console.error('Error checking pending payments:', error);
      }
    };

    checkPendingPayments();
    const interval = setInterval(checkPendingPayments, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tenantContext?.role]);

  // Only set up inventory checks for admin and pharmacist roles
  useEffect(() => {
    if (!['admin', 'pharmacist'].includes(tenantContext?.role || '')) {
      return;
    }

    const checkStockAlerts = async () => {
      try {
        const result = await fetchStockAlerts();
        if (result) {
          const { lowStock = [], expiring = [] } = result;
          setLowStockCount(lowStock.length);
          setExpiringCount(expiring.length);
          setHasStockAlerts(lowStock.length > 0 || expiring.length > 0);
        } else {
          setLowStockCount(0);
          setExpiringCount(0);
          setHasStockAlerts(false);
        }
      } catch (error) {
        console.error('Error checking stock alerts:', error);
        setLowStockCount(0);
        setExpiringCount(0);
        setHasStockAlerts(false);
      }
    };

    checkStockAlerts();
    const interval = setInterval(checkStockAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tenantContext?.role]);

  // Handle alert clearing on navigation
  useEffect(() => {
    if (pathname === '/pharmacy/stock-alerts') {
      setHasStockAlerts(false);
    }
    if (pathname === '/cashier') {
      setPendingPaymentsCount(0);
    }
  }, [pathname]);

  const baseNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <Home size={18} /> },
    { 
      label: 'Appointments', 
      href: '/bookAppointment', 
      icon: <Calendar size={18} />,
      subItems: [
        { 
          label: 'Book New Appointment', 
          href: '/bookAppointment', 
          icon: <Plus size={18} /> 
        },
        { 
          label: 'View Appointments', 
          href: '/appointments', 
          icon: <Calendar size={18} />,
          roles: ['admin', 'staff', 'doctor']
        },
        { 
          label: 'Appointment Schedule', 
          href: '/appointments/schedule', 
          icon: <Calendar size={18} />,
          roles: ['admin', 'staff', 'doctor']
        }
      ]
    },
    { 
      label: 'Cashier',
      href: '/cashier',
      icon: <CreditCard size={18} />,
      roles: ['admin', 'cashier'],
      subItems: [
        { 
          label: 'Process Payments', 
          href: '/cashier', 
          icon: <DollarSign size={18} />,
          roles: ['admin', 'cashier'],
          hasAlerts: pendingPaymentsCount > 0,
          alertCount: pendingPaymentsCount
        },
        { 
          label: 'Payment History', 
          href: '/cashier/history', 
          icon: <History size={18} />,
          roles: ['admin', 'cashier']
        }
      ]
    },
    { 
      label: 'Pharmacy',
      href: '/pharmacy',
      icon: <Pill size={18} />,
      roles: ['admin', 'pharmacist'],
      subItems: [
        // Inventory Management
        { 
          label: 'Inventory Overview', 
          href: '/pharmacy/inventory', 
          icon: <Package size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Add New Item', 
          href: '/pharmacy/inventory/add', 
          icon: <PlusCircle size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Batch Management', 
          href: '/pharmacy/inventory/batches', 
          icon: <Boxes size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Stock Alerts', 
          href: '/pharmacy/stock-alerts', 
          icon: <AlertCircle size={18} />,
          roles: ['admin', 'pharmacist'],
          hasAlerts: hasStockAlerts,
          alertCount: lowStockCount + expiringCount
        },
        { 
          label: 'Restock', 
          href: '/pharmacy/restock', 
          icon: <Package size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Purchase Orders', 
          href: '/pharmacy/purchase-orders', 
          icon: <Boxes size={18} />,
          roles: ['admin', 'pharmacist']
        },
        
        // Sales Management
        { 
          label: 'Pharmacy Sales', 
          href: '/pharmacy/pharmacy-sales-management', 
          icon: <ShoppingCart size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'New Sale', 
          href: '/pharmacy/pharmacy-sales-management/new-sale', 
          icon: <Plus size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Transactions', 
          href: '/pharmacy/transactions', 
          icon: <DollarSign size={18} />,
          roles: ['admin', 'pharmacist']
        },
        
        // Reports & Audit
        { 
          label: 'Sales Analytics', 
          href: '/pharmacy/pharmacy-sales-management?tab=analytics', 
          icon: <BarChart size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Reports', 
          href: '/pharmacy/reports', 
          icon: <BarChart size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Audit Logs', 
          href: '/pharmacy/audit-logs', 
          icon: <FileText size={18} />,
          roles: ['admin']
        },
        { 
          label: 'Receipts', 
          href: '/pharmacy/receipts', 
          icon: <Receipt size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Suppliers', 
          href: '/pharmacy/suppliers', 
          icon: <Truck size={18} />,
          roles: ['admin', 'pharmacist']
        }
      ],
    },
    { 
      label: 'Clinical Services', 
      href: '/services', 
      icon: <HeartPulse size={18} />, 
      roles: ['admin', 'doctor', 'staff'],
      subItems: [
        { 
          label: 'Services Overview', 
          href: '/services', 
          icon: <HeartPulse size={18} />,
          roles: ['admin', 'doctor', 'staff']
        },
        { 
          label: 'New Service Record', 
          href: '/services/new', 
          icon: <Plus size={18} />,
          roles: ['admin', 'doctor', 'staff']
        },
        { 
          label: 'Service Categories', 
          href: '/services/categories', 
          icon: <ClipboardList size={18} />,
          roles: ['admin', 'staff']
        },
        { 
          label: 'Doctors', 
          href: '/services/doctors', 
          icon: <Stethoscope size={18} />,
          roles: ['admin', 'staff']
        },
        { 
          label: 'Service Pricing', 
          href: '/services/pricing', 
          icon: <DollarSign size={18} />,
          roles: ['admin', 'staff']
        }
      ]
    },
    { 
      label: 'Reports & Analytics', 
      href: '/reports', 
      icon: <LineChart size={18} />, 
      roles: ['admin', 'staff', 'doctor', 'pharmacist', 'cashier'],
      subItems: [
        { 
          label: 'Dashboard', 
          href: '/reports', 
          icon: <BarChart size={18} />,
          roles: ['admin', 'staff', 'doctor', 'pharmacist', 'cashier']
        },
        { 
          label: 'Pharmacy Sales', 
          href: '/reports?tab=pharmacy', 
          icon: <ShoppingCart size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'Clinical Services', 
          href: '/reports?tab=services', 
          icon: <ClipboardList size={18} />,
          roles: ['admin', 'doctor', 'staff']
        },
        { 
          label: 'Financial', 
          href: '/reports?tab=financial', 
          icon: <DollarSign size={18} />,
          roles: ['admin', 'cashier']
        }
      ] 
    },
  ];

  const adminNavItems: NavItem[] = [
    { 
      label: 'Settings', 
      href: '/settings', 
      icon: <Settings size={18} />, 
      roles: ['admin'],
      subItems: [
        { label: 'Manage Users', href: '/settings/users', icon: <Users size={18} /> },
        { label: 'Role Management', href: '/admin/roles', icon: <Users size={18} /> },
        { label: 'System Settings', href: '/settings/system', icon: <Settings size={18} /> },
        { label: 'Billing & Subscription', href: '/settings/billing', icon: <DollarSign size={18} /> },
        { label: 'Invite Users', href: '/settings/invite-users', icon: <Users size={18} /> }
      ] 
    },
    {
      label: 'Tenant Management',
      href: '/tenant-management',
      icon: <Users size={18} />,
      roles: ['admin']
    }
  ];

  const staffNavItems: NavItem[] = [
    { 
      label: 'Patient Management', 
      href: '/dashboard/patients', 
      icon: <Users size={18} />, 
      roles: ['admin', 'staff', 'doctor'],
      subItems: [
        { label: 'Patient List', href: '/dashboard/patients', icon: <Users size={18} /> },
        { label: 'New Patient', href: '/signup', icon: <Plus size={18} /> }
      ] 
    },
  ];

  const doctorNavItems: NavItem[] = [
    { 
      label: 'Patient Records', 
      href: '/patients', 
      icon: <Users size={18} />, 
      roles: ['admin', 'doctor'],
      subItems: [
        { label: 'View Summaries', href: '/patients', icon: <ClipboardList size={18} /> },
        { label: 'Medical History', href: '/patients/history', icon: <History size={18} /> }
      ] 
    },
  ];

  // Add all appropriate menus based on the user role
  let navItems: NavItem[] = [...baseNavItems];
  
  // Add staff menus for admin and staff roles
  if (tenantContext?.role === 'admin' || tenantContext?.role === 'staff') {
    navItems = [...navItems, ...staffNavItems];
  }
  
  // Add doctor menus for admin and doctor roles
  if (tenantContext?.role === 'admin' || tenantContext?.role === 'doctor') {
    navItems = [...navItems, ...doctorNavItems];
  }
  
  // Add admin menus for admin only
  if (tenantContext?.role === 'admin') {
    navItems = [...navItems, ...adminNavItems];
  }

  const hasAccess = (item: NavItem | SubNavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(tenantContext?.role || '');
  };

  const handleDropdownToggle = useCallback((label: string) => {
    setOpenDropdown(prev => prev === label ? null : label);
  }, []);

  const handleNavigation = useCallback(() => {
    if (isMobileView && closeSidebar) {
      closeSidebar();
    }
    setOpenDropdown(null);
  }, [isMobileView, closeSidebar]);

  return (
    <div className="h-screen flex flex-col" ref={sidebarRef}>
      {/* Header with logo and mobile toggle */}
      <div className="flex items-center justify-between mb-4 py-2">
        <h1 className="text-xl font-bold text-blue-700 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">@Veylor360</h1>
        {isMobileView && (
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSidebar}
            className="h-8 w-8 rounded-none bg-white text-blue-600 hover:text-blue-700 hover:bg-blue-50 shadow-md"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Scrollable navigation */}
      <ScrollArea className="flex-1">
        <nav className="space-y-2">
          <div className="text-sm text-blue-700 mb-2 px-2 font-medium">
            Role: <span className="font-semibold bg-blue-100 px-2 py-0.5 rounded-full">{tenantContext?.role}</span>
          </div>
          
          {navItems.map((item) => (
            hasAccess(item) && (
              <div key={item.label}>
                {item.subItems ? (
                  <DropdownMenu open={openDropdown === item.label} onOpenChange={() => handleDropdownToggle(item.label)}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full flex items-center justify-between p-2 rounded-lg text-blue-700 hover:bg-blue-100 focus:outline-none transition-colors duration-200"
                        aria-expanded={openDropdown === item.label}
                      >
                        <span className="flex items-center gap-3 font-medium text-sm">{item.icon} {item.label}</span>
                        <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="w-56 bg-white shadow-lg rounded-lg border border-blue-100 transition-all duration-200"
                      align="start"
                      sideOffset={5}
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      onPointerDownOutside={(e) => {
                        // Only close if clicking outside the dropdown
                        if (!sidebarRef.current?.contains(e.target as Node)) {
                          setOpenDropdown(null);
                        }
                      }}
                    >
                      <DropdownMenuLabel className="font-semibold text-blue-700 text-sm">
                        {item.label}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-blue-100" />
                      {item.subItems.map((subItem) => (
                        hasAccess(subItem) && (
                          <DropdownMenuItem 
                            key={subItem.label} 
                            asChild
                            className="focus:bg-blue-50 focus:text-blue-700 transition-colors duration-200"
                          >
                            <Link 
                              href={subItem.href} 
                              className={`flex items-center p-2 text-blue-600 hover:bg-blue-50 font-medium text-sm ${
                                pathname === subItem.href ? 'bg-blue-100 text-blue-700 rounded-md' : ''
                              }`}
                              onClick={handleNavigation}
                            >
                              {subItem.icon && <span className="mr-2">{subItem.icon}</span>}
                              {subItem.label}
                              {subItem.hasAlerts && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="ml-auto">
                                        <span className="relative flex h-5 w-5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 items-center justify-center text-white text-xs font-bold">
                                            {subItem.alertCount}
                                          </span>
                                        </span>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-white border border-blue-100 shadow-md">
                                      <p className="text-xs text-blue-700">
                                        {subItem.href === '/pharmacy/stock-alerts' 
                                          ? `${lowStockCount} low stock and ${expiringCount} expiring items` 
                                          : subItem.href === '/cashier'
                                            ? `${pendingAppointments} unpaid appointments and ${pendingSales} unpaid sales`
                                            : `${subItem.alertCount} pending payment${subItem.alertCount !== 1 ? 's' : ''}`
                                        }
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        )
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center p-2 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors duration-200 ${
                      pathname === item.href ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                    onClick={handleNavigation}
                  >
                    <span className="mr-2">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                )}
              </div>
            )
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}