// components/AppointmentsTable.tsx
'use client';

import { useState } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, ColumnDef, Row, SortingState } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown } from 'lucide-react';

type Appointment = {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  services: { name: string; price: number; duration: number };
  profiles: { full_name: string };
};

export default function AppointmentsTable({
  appointments,
  userRole,
  confirmAppointment,
  cancelAppointment,
}: {
  appointments: Appointment[];
  userRole: string;
  confirmAppointment: (formData: FormData) => Promise<void>;
  cancelAppointment: (formData: FormData) => Promise<void>;
}) {
  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]); // Default sort by date descending
  const [timeFilter, setTimeFilter] = useState(''); // State for time filter

  // Filter appointments by time (case-insensitive partial match)
  const filteredAppointments = timeFilter
    ? appointments.filter((appt) => appt.time.toLowerCase().includes(timeFilter.toLowerCase()))
    : appointments;

  const columns: ColumnDef<Appointment>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: Row<Appointment> }) => (
        <span>{new Date(row.original.date).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: 'time',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
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
      cell: ({ row }: { row: Row<Appointment> }) => (
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
    ...(isAdminOrStaff
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }: { row: Row<Appointment> }) => (
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
              </div>
            ),
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
    getSortedRowModel: getSortedRowModel(), // Enable sorting
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
    </div>
  );
}