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
  Row,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Search } from 'lucide-react';
import { Profile } from '@/types/supabase';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RoleChangeForm from "@/components/admin/RoleChangeForm";

interface UsersTableProps {
  profiles: Profile[];
}

export default function UsersTable({ profiles }: UsersTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      enableHiding: true,
    },
    {
      accessorKey: 'phone_number',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Phone Number <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => row.original.phone_number ?? 'N/A',
      enableHiding: true,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Profile <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.role === 'admin'
              ? 'default'
              : row.original.role === 'doctor'
              ? 'secondary'
              : row.original.role === 'pharmacist'
              ? 'outline'
              : 'default'
          }
          className={`text-[10px] ${
            row.original.role === 'admin'
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : row.original.role === 'doctor'
              ? 'bg-teal-100 text-teal-800 border-teal-200'
              : row.original.role === 'pharmacist'
              ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
              : row.original.role === 'staff'
              ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
              : 'bg-slate-100 text-slate-800 border-slate-200'
          }`}
        >
          {row.original.role}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-sm"
          onClick={() => {
            setSelectedUser(row.original);
            setIsDialogOpen(true);
          }}
        >
          Change Profile
        </Button>
      ),
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
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase();
      const rowValue = String(row.getValue(columnId)).toLowerCase();
      return rowValue.includes(searchValue);
    },
    filterFns: {
      global: (row: Row<Profile>, columnId: string, filterValue: string) => {
        const value = row.getValue(columnId);
        return String(value).toLowerCase().includes(filterValue.toLowerCase());
      },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2 md:p-4">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-2 md:p-4 border-b flex flex-col sm:flex-row gap-2 md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-9 text-sm border-gray-300 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`text-sm font-medium text-gray-700 py-3 whitespace-nowrap ${
                        header.column.getCanHide() ? 'hidden sm:table-cell' : ''
                      }`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-100">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      className={`py-3 text-sm whitespace-nowrap ${
                        cell.column.getCanHide() ? 'hidden sm:table-cell' : ''
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95%] sm:w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Change Profile for {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <RoleChangeForm 
              user={selectedUser}
              onSuccess={() => {
                window.location.reload();
                setSelectedUser(null);
                setIsDialogOpen(false);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}