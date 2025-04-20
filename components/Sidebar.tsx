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
  X,
  Menu
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchBasicMedications, fetchInventory, fetchUserRole } from '@/lib/authActions';
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

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasStockAlerts, setHasStockAlerts] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);

  // Only set up inventory checks for admin and pharmacist roles
  useEffect(() => {
    if (!['admin', 'pharmacist'].includes(userRole)) {
      return;
    }

    const checkStockAlerts = async () => {
      try {
        const role = await fetchUserRole();
        const data = role === 'admin' || role === 'pharmacist' 
          ? await fetchInventory()
          : await fetchBasicMedications();
        
        // Only show alerts for admin/pharmacist
        if (role === 'admin' || role === 'pharmacist') {
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
  }, [pathname]);

  const baseNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <Home size={18} /> },
    { label: 'Book Appointment', href: '/bookAppointment', icon: <Calendar size={18} /> },
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
          hasAlerts: hasStockAlerts
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
          label: 'Sales', 
          href: '/pharmacy/sales', 
          icon: <ShoppingCart size={18} />,
          roles: ['admin', 'pharmacist']
        },
        { 
          label: 'New Sale', 
          href: '/pharmacy/sales/new', 
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
      label: 'Appointments', 
      href: '/appointments', 
      icon: <Calendar size={18} />, 
      roles: ['admin', 'staff', 'doctor'],
      subItems: [
        { label: 'View Appointments', href: '/appointments', icon: <Calendar size={18} /> },
        { label: 'Schedule', href: '/appointments/schedule', icon: <Calendar size={18} /> }
      ] 
    },
    { 
      label: 'Patient List', 
      href: '/dashboard/patients', 
      icon: <Users size={18} />,
      roles: ['admin', 'staff', 'doctor']
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

  const navItems: NavItem[] = [
    ...baseNavItems,
    ...(userRole === 'admin' || userRole === 'staff' ? staffNavItems : []),
    ...(userRole === 'admin' || userRole === 'doctor' ? doctorNavItems : []),
    ...(userRole === 'admin' ? adminNavItems : []),
  ];

  // Helper function to check if user has access to an item
  const hasAccess = (item: NavItem | SubNavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  };

  const handleItemClick = () => {
    if (window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  };

  return (
    <aside className={cn(
      "h-screen bg-gradient-to-b from-blue-50 to-teal-50 border-r shadow-lg flex flex-col p-4 transition-all duration-300",
      isCollapsed ? "w-0 p-0 border-0" : "w-64"
    )}>
      <div className={cn(
        "flex items-center justify-between mb-6",
        isCollapsed ? "hidden" : ""
      )}>
        <h1 className="text-xl font-bold text-center text-blue-700">ClinicPanel</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="md:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className={cn("flex-1", isCollapsed ? "hidden" : "")}>
        <nav className="space-y-2">
          <div className="text-sm text-gray-600 mb-2 px-2">Role: <span className="font-medium">{userRole}</span></div>
          {navItems.map((item) => (
            hasAccess(item) && (
            <div key={item.label}>
              {item.subItems ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full flex items-center justify-between p-2 rounded-md text-gray-700 hover:bg-blue-100 focus:outline-none"
                        onClick={handleItemClick}
                      >
                        <span className="flex items-center gap-3 font-medium text-sm">{item.icon} {item.label}</span>
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-white shadow-lg rounded-md border border-gray-200">
                      <DropdownMenuLabel className="font-semibold text-gray-700 text-sm">{item.label}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {item.subItems.map((subItem) => (
                        hasAccess(subItem) && (
                      <DropdownMenuItem key={subItem.label} asChild>
                            <Link 
                              href={subItem.href} 
                              className={`flex items-center p-2 text-gray-700 hover:bg-blue-50 font-medium text-sm ${pathname === subItem.href ? 'bg-blue-100' : ''}`}
                              onClick={handleItemClick}
                            >
                          {subItem.icon && <span className="mr-2">{subItem.icon}</span>}
                          {subItem.label}
                              {subItem.hasAlerts && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="ml-auto">
                                        <span className="relative flex h-3 w-3">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                      </span>
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
                        )
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                  <Link 
                    href={item.href} 
                    className={`flex items-center gap-3 p-2 rounded-md text-gray-700 hover:bg-blue-100 font-medium text-sm ${pathname === item.href ? 'bg-blue-100' : ''}`}
                    onClick={handleItemClick}
                  >
                  {item.icon} <span>{item.label}</span>
                </Link>
              )}
            </div>
            )
          ))}
        </nav>
      </ScrollArea>
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="absolute top-4 left-4 md:hidden"
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}
    </aside>
  );
}