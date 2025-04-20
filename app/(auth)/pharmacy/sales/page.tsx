// app/pharmacy/sales/page.tsx
"use client";

import SalesManager from '@/components/pharmacy/SalesManager';

export default function SalesPage() {

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Sales Management</h1>
        
      </div>
      <SalesManager />
    </div>
  );
}