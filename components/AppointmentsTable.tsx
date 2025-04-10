'use client';

import { useState, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, ColumnDef, Row, SortingState } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with public URL and anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Appointment = {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  services: { name: string; price: number; duration: number };
  profiles: { full_name: string };
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  payment_method?: 'mpesa' | 'cash' | 'bank';
  transaction_id?: string;
};

export default function AppointmentsTable({
  appointments: initialAppointments,
  userRole,
  confirmAppointment,
  cancelAppointment,
  processMpesaPayment,
  processCashPayment,
}: {
  appointments: Appointment[];
  userRole: string;
  confirmAppointment: (formData: FormData) => Promise<void>;
  cancelAppointment: (formData: FormData) => Promise<void>;
  processMpesaPayment: (formData: FormData) => Promise<{ success: boolean; checkoutRequestId: string }>;
  processCashPayment: (formData: FormData) => Promise<{ success: boolean; receipt?: string }>;
}) {
  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [timeFilter, setTimeFilter] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [mpesaStatus, setMpesaStatus] = useState<string | null>(null);

  // Real-time subscription to appointments table
  useEffect(() => {
    console.log('Setting up real-time subscription...');
    const channel = supabase
      .channel('appointments-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        async (payload) => {
          console.log('Received real-time update:', payload);
          const updatedRaw = payload.new;
          const { data, error } = await supabase
            .from('appointments')
            .select('*, services(name, price, duration), profiles(full_name)')
            .eq('id', updatedRaw.id)
            .single();
          if (error) {
            console.error('Fetch error:', error);
            return;
          }
          const updatedAppointment: Appointment = {
            ...data,
            services: data.services || { name: 'Custom', price: 0, duration: 0 },
            profiles: data.profiles || { full_name: 'Unknown' },
          };
          console.log('Transformed appointment:', updatedAppointment);
          setAppointments((prev) =>
            prev.map((appt) => (appt.id === updatedAppointment.id ? updatedAppointment : appt))
          );
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription failed');
        }
      });
  
    return () => {
      console.log('Cleaning up subscription...');
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredAppointments = timeFilter
    ? appointments.filter((appt) => appt.time.toLowerCase().includes(timeFilter.toLowerCase()))
    : appointments;

  const handleCashPayment = async (formData: FormData) => {
    const result = await processCashPayment(formData);
    if (result.success && result.receipt) setReceipt(result.receipt);
  };

  const downloadReceipt = (receiptText: string) => {
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: ColumnDef<Appointment>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Date <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{new Date(row.original.date).toLocaleDateString()}</span>,
    },
    {
      accessorKey: 'time',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Time <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'services.name',
      header: 'Service',
    },
    ...(isAdminOrStaff
      ? [
          {
            accessorKey: 'profiles.full_name',
            header: 'Patient',
          },
        ]
      : []),
    {
      accessorKey: 'status',
      header: 'Status',
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
    {
      accessorKey: 'payment_status',
      header: 'Payment Status',
      cell: ({ row }) => (
        <span>
          {row.original.payment_status || 'N/A'}{' '}
          {row.original.payment_method ? `(${row.original.payment_method})` : ''}
        </span>
      ),
    },
    ...(isAdminOrStaff
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }: { row: Row<Appointment> }) => {
              return (
                <div className="flex gap-2">
                  {row.original.status === 'pending' && (
                    <>
                      <form action={confirmAppointment}>
                        <input type="hidden" name="id" value={row.original.id} />
                        <Button variant="outline" size="sm" type="submit">
                          Confirm
                        </Button>
                      </form>
                      <form action={cancelAppointment}>
                        <input type="hidden" name="id" value={row.original.id} />
                        <Button variant="outline" size="sm" type="submit">
                          Cancel
                        </Button>
                      </form>
                    </>
                  )}
                  {row.original.status === 'confirmed' && row.original.payment_status === 'unpaid' && (
                    <div className="flex flex-col gap-2">
                      <form
                        action={async (formData: FormData) => {
                          try {
                            const result = await processMpesaPayment(formData);
                            setMpesaStatus(`M-Pesa payment initiated. Checkout ID: ${result.checkoutRequestId}`);
                            setTimeout(() => setMpesaStatus(null), 5000);
                          } catch (error) {
                            console.error('M-Pesa payment failed:', error);
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            setMpesaStatus(`Payment failed: ${errorMessage}`);
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input type="hidden" name="id" value={row.original.id} />
                        <input type="hidden" name="amount" value={row.original.services.price.toString()} />
                        <Input type="text" name="phone" placeholder="2547XXXXXXXX" required className="w-32" />
                        <Button variant="outline" size="sm" type="submit">
                          Pay with M-Pesa (KSh {row.original.services.price})
                        </Button>
                      </form>
                      <form action={handleCashPayment} className="flex gap-2">
                        <input type="hidden" name="id" value={row.original.id} />
                        <Input type="text" name="receiptNumber" placeholder="Receipt # (optional)" className="w-32" />
                        <Button variant="outline" size="sm" type="submit">
                          Mark as Cash Paid (KSh {row.original.services.price})
                        </Button>
                      </form>
                    </div>
                  )}
                  {row.original.payment_status === 'paid' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const response = await fetch(`/api/receipt?appointmentId=${row.original.id}`);
                        const receiptText = await response.text();
                        setReceipt(receiptText);
                      }}
                    >
                      View Receipt
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const table = useReactTable<Appointment>({
    data: filteredAppointments,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
      {isAdminOrStaff && (
        <div className="p-4">
          <Input
            placeholder="Filter by time (e.g., 10:00)"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">
                No appointments found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {(receipt || mpesaStatus) && (
        <div className="mt-4 p-4 border rounded-md">
          {receipt && <pre>{receipt}</pre>}
          {mpesaStatus && <p>{mpesaStatus}</p>}
          <div className="flex gap-2">
            {receipt && <Button onClick={() => downloadReceipt(receipt)}>Download Receipt</Button>}
            <Button
              variant="outline"
              onClick={() => {
                setReceipt(null);
                setMpesaStatus(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}