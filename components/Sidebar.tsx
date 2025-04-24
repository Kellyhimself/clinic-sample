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
  Stethoscope
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchBasicMedications, fetchInventory, getAllPendingPayments } from '@/lib/authActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  userRole: string;
  closeSidebar?: () => void; // Optional callback to close the sidebar when a link is clicked
}

export default function Sidebar({ userRole, closeSidebar }: SidebarProps) {
  const pathname = usePathname();
  const [hasStockAlerts, setHasStockAlerts] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0); 
  const [pendingSales, setPendingSales] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Check if mobile view for handling navigation
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Debug userRole
  useEffect(() => {
    console.log("Sidebar received userRole:", userRole);
  }, [userRole]);

  // Check for pending payments (for admin and cashier roles)
  useEffect(() => {
    if (!['admin', 'cashier'].includes(userRole)) {
      return;
    }

    const checkPendingPayments = async () => {
      try {
        // Use the new comprehensive function
        const pendingPayments = await getAllPendingPayments();
        setPendingPaymentsCount(pendingPayments.total);
        setPendingAppointments(pendingPayments.appointmentsCount);
        setPendingSales(pendingPayments.salesCount);
      } catch (error) {
        console.error('Error checking pending payments:', error);
      }
    };

    checkPendingPayments();
    // Check every 5 minutes for new pending payments
    const interval = setInterval(checkPendingPayments, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Only set up inventory checks for admin and pharmacist roles
  useEffect(() => {
    if (!['admin', 'pharmacist'].includes(userRole)) {
      return;
    }

    const checkStockAlerts = async () => {
      try {
        // Get medications based on role
        const data = userRole === 'admin' || userRole === 'pharmacist' 
          ? await fetchInventory()
          : await fetchBasicMedications();
        
        // Only show alerts for admin/pharmacist
        if (userRole === 'admin' || userRole === 'pharmacist') {
          let lowStock = 0;
          let expiring = 0;
          
          data.forEach((medication: Medication) => {
            medication.batches?.forEach((batch) => {
              if (batch.quantity < 10) lowStock++;
              if (new Date(batch.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
                expiring++;
              }
            });
          });
          
          setLowStockCount(lowStock);
          setExpiringCount(expiring);
          setHasStockAlerts(lowStock > 0 || expiring > 0);
        }
      } catch (error) {
        console.error('Error checking stock alerts:', error);
      }
    };

    checkStockAlerts();
    const interval = setInterval(checkStockAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Clear alerts when visiting the stock alerts page
  useEffect(() => {
    if (pathname === '/pharmacy/stock-alerts') {
      setHasStockAlerts(false);
    }
    
    // Clear payment alerts when visiting the cashier page
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
          href: '/pharmacy/inventory/new', 
          icon: <Plus size={18} />,
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
        { label: 'System Settings', href: '/settings/system', icon: <Settings size={18} /> }
      ] 
    },
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
  if (userRole === 'admin' || userRole === 'staff') {
    navItems = [...navItems, ...staffNavItems];
  }
  
  // Add doctor menus for admin and doctor roles
  if (userRole === 'admin' || userRole === 'doctor') {
    navItems = [...navItems, ...doctorNavItems];
  }
  
  // Add admin menus for admin only
  if (userRole === 'admin') {
    navItems = [...navItems, ...adminNavItems];
  }

  // Helper function to check if user has access to an item
  const hasAccess = (item: NavItem | SubNavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  };

  // Handle link clicks - close sidebar on mobile
  const handleItemClick = () => {
    if (isMobileView && closeSidebar) {
      closeSidebar();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header with logo */}
      <div className="flex items-center justify-between mb-4 py-2">
        <h1 className="text-xl font-bold text-blue-700 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">ClinicPanel</h1>
      </div>
      
      {/* Scrollable navigation */}
      <ScrollArea className="flex-1">
        <nav className="space-y-2">
          <div className="text-sm text-blue-700 mb-2 px-2 font-medium">
            Role: <span className="font-semibold bg-blue-100 px-2 py-0.5 rounded-full">{userRole}</span>
          </div>
          
          {navItems.map((item) => (
            hasAccess(item) && (
              <div key={item.label}>
                {item.subItems ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full flex items-center justify-between p-2 rounded-lg text-blue-700 hover:bg-blue-100 focus:outline-none"
                      >
                        <span className="flex items-center gap-3 font-medium text-sm">{item.icon} {item.label}</span>
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-white shadow-lg rounded-lg border border-blue-100">
                      <DropdownMenuLabel className="font-semibold text-blue-700 text-sm">{item.label}</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-blue-100" />
                      {item.subItems.map((subItem) => (
                        hasAccess(subItem) && (
                          <DropdownMenuItem key={subItem.label} asChild>
                            <Link 
                              href={subItem.href} 
                              className={`flex items-center p-2 text-blue-600 hover:bg-blue-50 font-medium text-sm ${pathname === subItem.href ? 'bg-blue-100 text-blue-700 rounded-md' : ''}`}
                              onClick={handleItemClick}
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
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg hover:bg-blue-100 text-blue-600 font-medium text-sm",
                      pathname === item.href ? 'bg-blue-100 text-blue-700' : ''
                    )}
                    onClick={handleItemClick}
                  >
                    {item.icon}
                    <span>{item.label}</span>
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