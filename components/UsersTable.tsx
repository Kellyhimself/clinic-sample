// components/UsersTable.tsx
'use client';

import { useState } from 'react';
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import RoleUpdateDialog from '@/components/RoleUpdateDialog';
import { Profile } from '@/types/supabase';

interface UsersTableProps {
  profiles: Profile[];
}

export default function UsersTable({ profiles }: UsersTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');

  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: 'full_name',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Full Name <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => row.original.full_name,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Email <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: 'phone_number',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Phone Number <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => row.original.phone_number ?? 'N/A',
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Role <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => row.original.role,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => <RoleUpdateDialog user={row.original} />,
    },
  ];

  const table = useReactTable({
    data: profiles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'auto',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 md:p-6">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <Input
            placeholder="Search users..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs text-sm border-gray-300 focus:border-blue-500"
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-medium text-gray-700"
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
                      <TableCell key={cell.id} className="text-sm text-gray-900">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-sm text-gray-500 py-4">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}