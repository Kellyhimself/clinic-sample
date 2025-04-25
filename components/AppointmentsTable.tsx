// components/AppointmentsTable.tsx

'use client';

import { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Row,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, ArrowLeft } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Check, X } from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Appointment } from '@/types/supabase';

// Import the CSS file for mobile responsiveness
import './appointmentsTable.css';

interface AppointmentsTableProps {
  appointments: Appointment[];
  userRole: string;
  confirmAppointment: (formData: FormData) => Promise<void>;
  cancelAppointment: (formData: FormData) => Promise<void>;
}

function PatientBadge({ patientId }: { patientId?: string }) {
  if (!patientId) return null;
  
  const isGuest = patientId.startsWith('guest_');
  
  return isGuest ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 ml-2">
      Guest
    </span>
  ) : null;
}

export default function AppointmentsTable({
  appointments: initialAppointments,
  userRole,
  confirmAppointment,
  cancelAppointment,
}: AppointmentsTableProps) {
  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';
  const [appointmentsState, setAppointmentsState] = useState<Appointment[]>(initialAppointments);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [filterType, setFilterType] = useState<'time' | 'patient' | 'service'>('time');
  const [filterValue, setFilterValue] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const router = useRouter();
  const supabase = createClientSupabaseClient();
  const [isMobile, setIsMobile] = useState(false);
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);

  // Check if mobile view with adjusted breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsNarrowMobile(width <= 358);
      setIsMediumMobile(width > 358 && width <= 480);
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    console.log('Initial appointments received:', initialAppointments);
    setAppointmentsState(initialAppointments);
  }, [initialAppointments]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      try {
        // Get authenticated user first using getUser() instead of getSession()
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('User not authenticated, cannot setup real-time subscription');
          return;
        }

        channel = supabase
          .channel('appointments-channel')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'appointments',
            },
            async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
              // Type guard to ensure payload.new exists and has the correct type
              if (!mounted || !payload.new || typeof payload.new !== 'object' || !('id' in payload.new)) {
                return;
              }

              // Get the ID from the payload
              const appointmentId = payload.new.id as string;

              try {
                // First fetch appointment info
                const { data: appointmentData, error: appointmentError } = await supabase
                .from('appointments')
                .select(`
                  *,
                    services (
                      name, 
                      price, 
                      duration
                    )
                  `)
                  .eq('id', appointmentId)
                .single();

                if (appointmentError) {
                  console.error('Error fetching appointment data:', appointmentError);
                return;
              }

                // Then fetch patient info separately
                const { data: patientData, error: patientError } = await supabase
                  .from('patients')
                  .select('full_name')
                  .eq('id', appointmentData.patient_id)
                  .single();

                if (patientError && patientError.code !== 'PGRST116') {
                  console.error('Error fetching patient data:', patientError);
                }

                // Then fetch doctor info if available
                const { data: doctorProfile, error: doctorError } = appointmentData.doctor_id 
                  ? await supabase
                      .from('profiles')
                      .select('full_name')
                      .eq('id', appointmentData.doctor_id)
                      .single()
                  : { data: null, error: null };

                if (doctorError && doctorError.code !== 'PGRST116') {
                  console.error('Error fetching doctor profile:', doctorError);
                }

                // Create a complete appointment object
                const updatedAppointment: Appointment = {
                  id: appointmentData.id,
                  date: appointmentData.date,
                  time: appointmentData.time,
                  status: (appointmentData.status || 'pending') as 'pending' | 'confirmed' | 'cancelled',
                  notes: appointmentData.notes || '',
                  services: appointmentData.services,
                  profiles: patientData ? { full_name: patientData.full_name } : null,
                  payment_status: appointmentData.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
                  payment_method: appointmentData.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
                  transaction_id: appointmentData.transaction_id,
                  doctor: doctorProfile ? { full_name: doctorProfile.full_name } : null
                };

                if (mounted) {
                console.log('Received real-time update:', updatedAppointment);
                setAppointmentsState(prev => {
                  const index = prev.findIndex(appt => appt.id === updatedAppointment.id);
                  if (index === -1) {
                      return [...prev, updatedAppointment];
                  }
                  const newAppointments = [...prev];
                    newAppointments[index] = updatedAppointment;
                  return newAppointments;
                });
                }
              } catch (error) {
                console.error('Error processing real-time update:', error);
              }
            }
          )
          .subscribe();

        return () => {
          if (channel) {
            channel.unsubscribe();
          }
        };
      } catch (error) {
        console.error('Error setting up subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [supabase]);

  const baseColumns: ColumnDef<Appointment>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Date <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: 'time',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Time <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      filterFn: (row: Row<Appointment>, id: string, filterValue: unknown) =>
        String(row.getValue(id) ?? '').toLowerCase().includes(String(filterValue).toLowerCase()),
    },
    {
      accessorKey: 'services.name',
      id: 'services.name',
      header: 'Service',
      cell: ({ row }) => row.original.services?.name || 'Custom',
      filterFn: (row: Row<Appointment>, id: string, filterValue: unknown) =>
        String(row.getValue(id) ?? 'Custom').toLowerCase().includes(String(filterValue).toLowerCase()),
      enableHiding: true,
      size: 150,
    },
    {
      accessorKey: 'profiles.full_name',
      id: 'profiles.full_name',
      header: 'Patient',
      enableHiding: true,
      cell: ({ row }) => (
        <div className="flex flex-col sm:flex-row sm:items-center">
          <span className="truncate max-w-[120px]">{row.original.profiles?.full_name || 'N/A'}</span>
          <PatientBadge patientId={row.original.patient_id} />
        </div>
      ),
      filterFn: (row: Row<Appointment>, id: string, filterValue: unknown) =>
        String(row.getValue(id) ?? 'N/A').toLowerCase().includes(String(filterValue).toLowerCase()),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Status <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === 'confirmed'
              ? 'default'
              : row.original.status === 'cancelled'
              ? 'destructive'
              : 'secondary'
          }
          className="whitespace-nowrap"
        >
          {row.original.status}
        </Badge>
      ),
    },
  ];

  const actionColumn: ColumnDef<Appointment>[] = isAdminOrStaff
    ? [
        {
          id: 'actions',
          header: '',
          size: 40,
          cell: ({ row }: { row: Row<Appointment> }) => {
            const appointment = row.original;
            const isPending = appointment.status === 'pending';

            if (!isPending) return null;

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <form action={confirmAppointment}>
                    <input type="hidden" name="id" value={appointment.id} />
                    <DropdownMenuItem asChild>
                      <button
                        type="submit"
                        className="flex w-full items-center cursor-pointer"
                      >
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                        <span>Confirm</span>
                      </button>
                    </DropdownMenuItem>
                  </form>
                  <form action={cancelAppointment}>
                    <input type="hidden" name="id" value={appointment.id} />
                    <DropdownMenuItem asChild>
                      <button
                        type="submit"
                        className="flex w-full items-center cursor-pointer"
                      >
                        <X className="mr-2 h-4 w-4 text-red-600" />
                        <span>Cancel</span>
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        },
      ]
    : [];

  // Create combined columns array
  const columns = [...baseColumns, ...actionColumn];

  const table = useReactTable({
    data: appointmentsState,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Effect to toggle column visibility when screen size changes
  useEffect(() => {
    if (isMobile) {
      // Hide service column on all mobile screens
      table.getColumn('services.name')?.toggleVisibility(false);
      
      // For medium mobile screens, decide visibility based on role
      if (isMediumMobile) {
        if (isAdminOrStaff) {
          // Show patient column for admin/staff on medium screens
          table.getColumn('profiles.full_name')?.toggleVisibility(true);
        } else {
          table.getColumn('profiles.full_name')?.toggleVisibility(false);
        }
      } else if (isNarrowMobile) {
        // On narrow screens, hide patient column for everyone
        table.getColumn('profiles.full_name')?.toggleVisibility(false);
      }
    } else {
      // On larger screens, show all columns
      table.getColumn('services.name')?.toggleVisibility(true);
      table.getColumn('profiles.full_name')?.toggleVisibility(true);
    }
  }, [isMobile, isNarrowMobile, isMediumMobile, table, isAdminOrStaff]);

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    const columnId =
      filterType === 'time' ? 'time' : filterType === 'patient' ? 'profiles.full_name' : 'services.name';
    setColumnFilters(value ? [{ id: columnId, value }] : []);
  };

  // Function to render card-style rows for mobile view
  const renderMobileCards = () => {
    return table.getRowModel().rows.map((row) => (
      <div key={row.id} className="mobile-card mb-4 p-3 border rounded-lg shadow-sm bg-white">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="font-medium">Date: </span>
            <span>{new Date(row.original.date).toLocaleDateString()}</span>
          </div>
          <Badge
            variant={
              row.original.status === 'confirmed'
                ? 'default'
                : row.original.status === 'cancelled'
                ? 'destructive'
                : 'secondary'
            }
            className="whitespace-nowrap"
          >
            {row.original.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-1">
          <div>
            <span className="font-medium">Time: </span>
            <span>{row.original.time}</span>
          </div>
          
          {isAdminOrStaff && (
            <div>
              <span className="font-medium">Patient: </span>
              <span className="truncate block">{row.original.profiles?.full_name || 'N/A'}</span>
              <PatientBadge patientId={row.original.patient_id} />
            </div>
          )}
          
          <div className="mt-1">
            <span className="font-medium">Service: </span>
            <span>{row.original.services?.name || 'Custom'}</span>
          </div>
        </div>
        
        {isAdminOrStaff && row.original.status === 'pending' && (
          <div className="mt-3 flex gap-2 justify-end">
            <form action={confirmAppointment} className="inline">
              <input type="hidden" name="id" value={row.original.id} />
              <Button 
                type="submit" 
                size="sm" 
                variant="outline" 
                className="h-8 px-2 flex items-center text-xs"
              >
                <Check className="mr-1 h-3 w-3 text-green-600" />
                Confirm
              </Button>
            </form>
            <form action={cancelAppointment} className="inline">
              <input type="hidden" name="id" value={row.original.id} />
              <Button 
                type="submit" 
                size="sm" 
                variant="outline" 
                className="h-8 px-2 flex items-center text-xs"
              >
                <X className="mr-1 h-3 w-3 text-red-600" />
                Cancel
              </Button>
            </form>
          </div>
        )}
      </div>
    ));
  };

  // Function for compact table rows for medium mobile screens
  const renderCompactTable = () => {
    return (
      <div className="compact-table-container p-1">
        <Table className="w-full border-collapse text-xs">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="py-1 px-2 font-medium text-gray-700 mobile-text-xs"
                  >
                    {header.column.id === 'date' ? 'Date' :
                     header.column.id === 'time' ? 'Time' :
                     header.column.id === 'profiles.full_name' ? 'Patient' :
                     header.column.id === 'status' ? 'Status' : 
                     flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  className="hover:bg-gray-100 border-b cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-1 px-2 mobile-text-xs"
                      data-label={cell.column.id === 'date' ? 'Date' : 
                                 cell.column.id === 'time' ? 'Time' : 
                                 cell.column.id === 'profiles.full_name' ? 'Patient' : 
                                 cell.column.id === 'status' ? 'Status' : ''}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-sm text-gray-500 py-2">
                  No appointments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4 appointments-container">
      <Card>
        <CardHeader className="p-2 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-7 w-7"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base sm:text-lg">Appointments</CardTitle>
          </div>
        </CardHeader>
        <div className="p-2 sm:p-4 md:p-6">
          <div className="w-full mx-auto bg-white rounded-lg overflow-hidden">
            {isAdminOrStaff && (
              <div className="p-2 sm:p-4 border-b flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Select
                  value={filterType}
                  onValueChange={(value) => {
                    setFilterType(value as 'time' | 'patient' | 'service');
                    setColumnFilters(
                      filterValue
                        ? [
                            {
                              id: value === 'time' ? 'time' : value === 'patient' ? 'profiles.full_name' : 'services.name',
                              value: filterValue,
                            },
                          ]
                        : []
                    );
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px] text-sm border-gray-300 focus:border-blue-500 h-8">
                    <SelectValue placeholder="Select filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="text"
                  placeholder={`Filter by ${filterType} (e.g., ${
                    filterType === 'time' ? '10:00' : filterType === 'patient' ? 'John Doe' : 'Dental'
                  })`}
                  value={filterValue}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full sm:max-w-xs text-sm border-gray-300 focus:border-blue-500 p-2 rounded border h-8"
                />
              </div>
            )}
            
            {/* Regular table view (not for narrow screens) */}
            <div className={`table-container ${!isNarrowMobile && !isMediumMobile ? 'block' : 'hidden'}`}>
              <Table className="w-full border-collapse">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-gray-50">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="text-xs font-medium text-gray-700 p-1 sm:p-2"
                          style={{ width: header.column.getSize() === 150 ? 'auto' : header.column.getSize() }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow 
                        key={row.id} 
                        className="hover:bg-gray-100 border-b cursor-pointer transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="text-xs sm:text-sm text-gray-900 p-1 sm:p-2 whitespace-nowrap"
                            data-label={cell.column.id === 'date' ? 'Date' : 
                                       cell.column.id === 'time' ? 'Time' : 
                                       cell.column.id === 'services.name' ? 'Service' : 
                                       cell.column.id === 'profiles.full_name' ? 'Patient' : 
                                       cell.column.id === 'status' ? 'Status' : ''}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center text-sm text-gray-500 py-4">
                        No appointments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Compact table for medium mobile screens (359px-480px) */}
            <div className={`compact-table-container ${isMediumMobile ? 'block' : 'hidden'}`}>
              {table.getRowModel().rows.length ? (
                renderCompactTable()
              ) : (
                <div className="text-center text-sm text-gray-500 py-4">
                  No appointments found.
                </div>
              )}
            </div>
            
            {/* Card layout for narrow mobile screens (≤358px) */}
            <div className={`mobile-cards-container ${isNarrowMobile ? 'block' : 'hidden'} px-2`}>
              {table.getRowModel().rows.length ? (
                renderMobileCards()
              ) : (
                <div className="text-center text-sm text-gray-500 py-4">
                  No appointments found.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}