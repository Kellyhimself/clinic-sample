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
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, X, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Appointment } from '@/lib/authActions';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface AppointmentsTableProps {
  appointments: Appointment[];
  userRole: string;
  confirmAppointment: (formData: FormData) => Promise<void>;
  cancelAppointment: (formData: FormData) => Promise<void>;
  processMpesaPayment: (formData: FormData) => Promise<{ success: boolean; checkoutRequestId: string }>;
  processCashPayment: (formData: FormData) => Promise<{ success: boolean; receipt?: string }>;
}

export default function AppointmentsTable({
  appointments: initialAppointments,
  userRole,
  confirmAppointment,
  cancelAppointment,
  processMpesaPayment,
  processCashPayment,
}: AppointmentsTableProps) {
  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';
  const [appointmentsState, setAppointmentsState] = useState<Appointment[]>(initialAppointments);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [filterType, setFilterType] = useState<'time' | 'patient' | 'service'>('time');
  const [filterValue, setFilterValue] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [paymentResult, setPaymentResult] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    console.log('Initial appointments:', initialAppointments);
    const channel = supabase
      .channel('appointments-channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, async (payload) => {
        const updatedAppointment = (await supabase
          .from('appointments')
          .select('*, services(name, price, duration), profiles(full_name)')
          .eq('id', payload.new.id)
          .single()).data as unknown as Appointment;
        setAppointmentsState((prev) => prev.map((appt) => (appt.id === updatedAppointment.id ? updatedAppointment : appt)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialAppointments]);

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
      filterFn: (row: Row<Appointment>, id: string, filterValue: unknown) =>
        String(row.getValue(id) ?? '').toLowerCase().includes(String(filterValue).toLowerCase()),
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
    {
      accessorKey: 'payment_status',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Payment <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) =>
        `${row.original.payment_status || 'N/A'} ${
          row.original.payment_method ? `(${row.original.payment_method})` : ''
        }`,
    },
  ];

  const actionColumn: ColumnDef<Appointment>[] = isAdminOrStaff
    ? [
        {
          id: 'actions',
          header: 'Actions',
          cell: ({ row }: { row: Row<Appointment> }) => (
            <div className="flex gap-2 flex-wrap">
              {row.original.status === 'pending' && (
                <>
                  <form action={confirmAppointment}>
                    <input type="hidden" name="id" value={row.original.id} />
                    <Button variant="outline" size="sm" type="submit" className="text-xs">
                      Confirm
                    </Button>
                  </form>
                  <form action={cancelAppointment}>
                    <input type="hidden" name="id" value={row.original.id} />
                    <Button variant="destructive" size="sm" type="submit" className="text-xs">
                      Cancel
                    </Button>
                  </form>
                </>
              )}
              {row.original.status === 'confirmed' && row.original.payment_status === 'unpaid' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedAppointment(row.original)}
                >
                  Pay Now
                </Button>
              )}
              {row.original.payment_status === 'paid' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={async () => {
                    const response = await fetch(`/api/receipt?appointmentId=${row.original.id}`);
                    const receipt = await response.text();
                    setReceiptContent(receipt);
                    setShowReceipt(true);
                  }}
                >
                  View Receipt
                </Button>
              )}
            </div>
          ),
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

  // Debug column registration
  useEffect(() => {
    console.log('Registered columns:', table.getAllColumns().map((col) => col.id));
  }, [table]);

  const handleFilterChange = (value: string) => {
    console.log('Filter input changed to:', value);
    setFilterValue(value);
    const columnId =
      filterType === 'time' ? 'time' : filterType === 'patient' ? 'profiles.full_name' : 'services.name';
    setColumnFilters(value ? [{ id: columnId, value }] : []);
  };

  const handlePayment = async (formData: FormData, method: 'mpesa' | 'cash') => {
    try {
      if (method === 'mpesa') {
        const result = await processMpesaPayment(formData);
        if (result.success) {
          setPaymentResult(`M-Pesa Payment Initiated. Checkout ID: ${result.checkoutRequestId}`);
          setTimeout(() => setSelectedAppointment(null), 2000);
        } else {
          setPaymentResult('M-Pesa Payment failed. Please try again.');
        }
      } else {
        const result = await processCashPayment(formData);
        if (result.success) {
          setPaymentResult(result.receipt || 'Cash Payment Recorded');
          setTimeout(() => setSelectedAppointment(null), 2000);
        } else {
          setPaymentResult('Cash Payment failed. Please try again.');
        }
      }
    } catch (error) {
      setPaymentResult(`Payment error: ${(error as Error).message}`);
    }
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 md:p-6">
          <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            {isAdminOrStaff && (
              <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
                <Select
                  value={filterType}
                  onValueChange={(value) => {
                    console.log('Filter type changed to:', value);
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
                    filterType === 'time' ? '10:00' : filterType === 'patient' ? 'staff3' : 'Dental'
                  })`}
                  value={filterValue}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="max-w-xs text-sm border-gray-300 focus:border-blue-500 p-2 rounded"
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
                            header.id === 'profiles.full_name' ||
                            header.id === 'payment_status'
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
                              cell.column.id === 'profiles.full_name' ||
                              cell.column.id === 'payment_status'
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
          <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-gray-900">Process Payment</DialogTitle>
                <Button variant="ghost" className="absolute right-4 top-4" onClick={() => setSelectedAppointment(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogHeader>
              {selectedAppointment && (
                <div className="space-y-4 p-4">
                  <p className="text-sm text-gray-600">
                    Service: {selectedAppointment.services?.name || 'Custom'} (KSh{' '}
                    {selectedAppointment.services?.price || 0})
                  </p>
                  <form action={(formData) => handlePayment(formData, 'mpesa')} className="space-y-2">
                    <input type="hidden" name="id" value={selectedAppointment.id} />
                    <input
                      type="hidden"
                      name="amount"
                      value={selectedAppointment.services?.price?.toString() || '0'}
                    />
                    <Input type="text" name="phone" placeholder="2547XXXXXXXX" required className="text-sm" />
                    <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm">
                      Pay with M-Pesa
                    </Button>
                  </form>
                  <form action={(formData) => handlePayment(formData, 'cash')} className="space-y-2">
                    <input type="hidden" name="id" value={selectedAppointment.id} />
                    <Input type="text" name="receiptNumber" placeholder="Receipt # (optional)" className="text-sm" />
                    <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white text-sm">
                      Mark as Cash Paid
                    </Button>
                  </form>
                  {paymentResult && <p className="text-sm text-center text-gray-700">{paymentResult}</p>}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-gray-900">Payment Receipt</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <pre className="text-sm text-gray-700 bg-gray-50 rounded p-4 whitespace-pre-wrap">
                  {receiptContent}
                </pre>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => receiptContent && downloadReceipt(receiptContent)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm"
                  >
                    Download Receipt
                  </Button>
                  <Button
                    onClick={() => setShowReceipt(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white text-sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
}