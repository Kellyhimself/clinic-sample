// app/insightful/page.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, ClipboardList, DollarSign } from 'lucide-react';

export default async function DashboardPage() {
  return (
    <main className="p-4 sm:p-6 bg-gray-50 flex-1 overflow-y-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Clinic Dashboard</h1>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Appointments</p>
              <h2 className="text-lg sm:text-xl font-semibold">32</h2>
            </div>
            <CalendarDays className="text-blue-500 w-6 h-6" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Patients</p>
              <h2 className="text-lg sm:text-xl font-semibold">128</h2>
            </div>
            <Users className="text-green-500 w-6 h-6" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Tasks</p>
              <h2 className="text-lg sm:text-xl font-semibold">8</h2>
            </div>
            <ClipboardList className="text-yellow-500 w-6 h-6" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Revenue</p>
              <h2 className="text-lg sm:text-xl font-semibold">KES 145,000</h2>
            </div>
            <DollarSign className="text-purple-500 w-6 h-6" />
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <Button variant="default" className="w-full sm:w-auto">
            Add Patient
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            Schedule Appointment
          </Button>
          <Button variant="ghost" className="w-full sm:w-auto">
            View Reports
          </Button>
        </div>
      </section>
    </main>
  );
}