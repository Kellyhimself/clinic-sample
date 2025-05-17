'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Generic column definition that can be extended by specific implementations
export interface Column<T> {
  header: string;
  key: string;
  cell: (item: T) => React.ReactNode;
}

interface SalesTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function SalesTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = "No data found",
  className,
}: SalesTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 md:p-8">
        <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-xs md:text-sm text-gray-600">Loading data...</span>
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <Table className={className}>
        <TableHeader>
          <TableRow className="bg-gradient-to-br from-blue-50 to-teal-50 border-blue-200">
            {columns.map((column) => (
              <TableHead key={column.key} className="text-xs lg:text-sm mobile-text-xs mobile-table-cell text-gray-800">
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-4 text-gray-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={index} className="hover:bg-gray-50 border-gray-200">
                {columns.map((column) => (
                  <TableCell key={`${index}-${column.key}`} className="mobile-table-cell mobile-text-xs text-xs text-gray-600">
                    {column.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Helper function to create a status badge
export function StatusBadge({ status, variants }: { 
  status: string; 
  variants: Record<string, "default" | "secondary" | "destructive" | "outline"> 
}) {
  const variant = variants[status] || "default";
  
  return (
    <Badge variant={variant} className="text-xs mobile-text-xs">
      {status}
    </Badge>
  );
} 