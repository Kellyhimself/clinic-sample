'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';

// Pharmacy-specific reports component
export default function PharmacyReportsSection() {
  // This would be connected to real data in a production environment
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Sales Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-md">
            {/* Placeholder for sales chart */}
            <div className="text-center">
              <BarChart className="h-16 w-16 text-gray-300 mx-auto" />
              <p className="text-muted-foreground mt-2">Sales trend chart will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {['Paracetamol', 'Amoxicillin', 'Metformin', 'Lisinopril', 'Atorvastatin'].map((med, i) => (
                <li key={i} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                  <span>{med}</span>
                  <span className="text-muted-foreground text-sm">{324 - i * 42} units</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {['Antibiotics', 'Painkillers', 'Cardiovascular', 'Diabetes', 'Vitamins'].map((cat, i) => (
                <li key={i} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                  <span>{cat}</span>
                  <span className="text-muted-foreground text-sm">KSh {(Math.floor(Math.random() * 50) + 30) * 1000}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 