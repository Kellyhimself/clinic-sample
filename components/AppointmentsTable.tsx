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
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Appointment } from '@/types/supabase';

interface AppointmentsTableProps {
  appointments: Appointment[];
  userRole: string;
  confirmAppointment: (formData: FormData) => Promise<void>;
  cancelAppointment: (formData: FormData) => Promise<void>;
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

  useEffect(() => {
    console.log('Initial appointments received:', initialAppointments);
    setAppointmentsState(initialAppointments);
  }, [initialAppointments]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      try {
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
    },
    {
      accessorKey: 'profiles.full_name',
      id: 'profiles.full_name',
      header: 'Patient',
      enableHiding: !isAdminOrStaff,
      cell: ({ row }) => row.original.profiles?.full_name || 'N/A',
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
          header: 'Actions',
          cell: ({ row }: { row: Row<Appointment> }) => {
            const appointment = row.original;
            const isPending = appointment.status === 'pending';

            return (
              <div className="flex gap-2">
                {isPending && (
                  <>
                    <form action={confirmAppointment}>
                      <input type="hidden" name="id" value={appointment.id} />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        type="submit"
                        className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                      >
                        Confirm
                      </Button>
                    </form>
                    <form action={cancelAppointment}>
                      <input type="hidden" name="id" value={appointment.id} />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        type="submit"
                        className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                      >
                        Cancel
                      </Button>
                    </form>
                  </>
                )}
              </div>
            );
          },
        },
      ]
    : [];

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

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    const columnId =
      filterType === 'time' ? 'time' : filterType === 'patient' ? 'profiles.full_name' : 'services.name';
    setColumnFilters(value ? [{ id: columnId, value }] : []);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Appointments</CardTitle>
          </div>
        </CardHeader>
        <div className="p-4 md:p-6">
          <div className="max-w-full mx-auto bg-white rounded-lg overflow-hidden">
            {isAdminOrStaff && (
              <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
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
                  <SelectTrigger className="w-[180px] text-sm border-gray-300 focus:border-blue-500">
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
                  className="max-w-xs text-sm border-gray-300 focus:border-blue-500 p-2 rounded border"
                />
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-gray-50">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={`text-xs font-medium text-gray-700 ${
                            header.id === 'date' ||
                            header.id === 'profiles.full_name'
                              ? 'hidden sm:table-cell'
                              : ''
                          }`}
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
                      <TableRow key={row.id} className="hover:bg-gray-100">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={`text-sm text-gray-900 ${
                              cell.column.id === 'date' ||
                              cell.column.id === 'profiles.full_name'
                                ? 'hidden sm:table-cell'
                                : ''
                            }`}
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
          </div>
        </div>
      </Card>
    </div>
  );
}