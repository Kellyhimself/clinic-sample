// components/Sidebar.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Calendar, Users, Settings, ChevronDown } from 'lucide-react';

interface SubNavItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  subItems?: SubNavItem[];
}

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();

  const baseNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <Home size={18} /> },
    {
      label: 'Book Appointment',
      href: '/bookAppointment',
      icon: <Calendar size={18} />,
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      label: 'Settings',
      href: '/settings', // Changed from '/dashboard/settings'
      icon: <Settings size={18} />,
      subItems: [
        { label: 'Manage Users', href: '/settings/users' }, // Changed from '/dashboard/settings/users'
      ],
    },
  ];

  const staffAdminNavItems: NavItem[] = [
    {
      label: 'Appointments',
      href: '/appointments',
      icon: <Calendar size={18} />,
      subItems: [
        { label: 'View Appointments', href: '/appointments' },
      ],
    },
    { label: 'Patients', href: '/dashboard/patients', icon: <Users size={18} /> },
  ];

  const navItems: NavItem[] = [
    ...baseNavItems,
    ...(userRole === 'admin' ? adminNavItems : []),
    ...(userRole === 'admin' || userRole === 'staff' ? staffAdminNavItems : []),
    ...(userRole === 'admin' || userRole === 'staff'
      ? [
          {
            label: 'Other Features',
            href: '/dashboard/other-features',
            icon: <ChevronDown size={18} />,
            subItems: [
              { label: 'Feature 1', href: '/dashboard/other-features/feature1' },
              { label: 'Feature 2', href: '/dashboard/other-features/feature2' },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside className="h-screen w-64 bg-white border-r shadow-sm flex flex-col p-4">
      <h1 className="text-xl font-bold mb-6 text-center">ClinicPanel</h1>
      <ScrollArea className="flex-1">
        <nav className="space-y-2">
          <div className="text-sm text-gray-500 mb-2">Role: {userRole}</div>
          {navItems.map((item) => (
            <div key={item.label}>
              {item.subItems ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-2 rounded-md text-gray-700 hover:bg-gray-200 focus:outline-none"
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        {item.label}
                      </span>
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-white shadow-lg rounded-md">
                    <DropdownMenuLabel className="font-semibold text-gray-700">{item.label}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {item.subItems.map((subItem) => (
                      <DropdownMenuItem key={subItem.label} asChild>
                        <Link
                          href={subItem.href}
                          className={`flex items-center p-2 text-gray-700 hover:bg-gray-100 ${
                            pathname === subItem.href ? 'bg-gray-200' : ''
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 p-2 rounded-md text-gray-700 hover:bg-gray-200 ${
                    pathname === item.href ? 'bg-gray-100' : ''
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}