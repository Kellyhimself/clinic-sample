'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

// Services-specific reports component
export default function ServicesReportsSection() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Services Revenue Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-md">
            {/* Placeholder for services chart */}
            <div className="text-center">
              <Activity className="h-16 w-16 text-gray-300 mx-auto" />
              <p className="text-muted-foreground mt-2">Services trend chart will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {['General Consultation', 'Laboratory Tests', 'Vaccinations', 'Dental Services', 'Physiotherapy'].map((service, i) => (
                <li key={i} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                  <span>{service}</span>
                  <span className="text-muted-foreground text-sm">{428 - i * 55} visits</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {['General Practice', 'Laboratory', 'Radiology', 'Dental', 'Pediatrics'].map((dept, i) => (
                <li key={i} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                  <span>{dept}</span>
                  <span className="text-muted-foreground text-sm">KSh {(Math.floor(Math.random() * 80) + 100) * 1000}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 