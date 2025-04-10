// app/insightful/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, ClipboardList, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { fetchUserRole } from '@/lib/authActions'; // Adjust path as needed

// No props needed since we fetch userRole directly
export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserRole() {
      try {
        const role = await fetchUserRole();
        setUserRole(role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('patient'); // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadUserRole();
  }, []);

  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';

  const adminStats = {
    appointments: 32,
    patients: 128,
    tasks: 8,
    revenue: 'KES 145,000',
  };

  const patientStats = {
    upcomingAppointments: 3,
  };

  useEffect(() => {
    if (userRole) {
      console.log('DashboardPage userRole:', userRole, 'isAdminOrStaff:', isAdminOrStaff);
    }
  }, [userRole]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 sm:p-6 flex-1 overflow-y-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Clinic Dashboard</h1>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {isAdminOrStaff ? (
          <>
            <Card className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-gray-500">Appointments</p>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{adminStats.appointments}</h2>
                </div>
                <CalendarDays className="text-blue-500 w-6 h-6" />
              </CardContent>
            </Card>
            <Card className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-gray-500">Patients</p>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{adminStats.patients}</h2>
                </div>
                <Users className="text-green-500 w-6 h-6" />
              </CardContent>
            </Card>
            <Card className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-gray-500">Tasks</p>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{adminStats.tasks}</h2>
                </div>
                <ClipboardList className="text-yellow-500 w-6 h-6" />
              </CardContent>
            </Card>
            <Card className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{adminStats.revenue}</h2>
                </div>
                <DollarSign className="text-purple-500 w-6 h-6" />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow col-span-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Upcoming Appointments</p>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{patientStats.upcomingAppointments}</h2>
                </div>
                <CalendarDays className="text-blue-500 w-6 h-6" />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                You have {patientStats.upcomingAppointments} appointment(s) scheduled. Check your appointments page for details.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
      <section className="max-w-full mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          {isAdminOrStaff ? (
            <>
            <Link href="/signup">
              <Button variant="default" className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white">
                Add Patient
              </Button>
            </Link>
              <Button variant="outline" className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100">
                Schedule Appointment
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto text-gray-600 hover:bg-gray-100">
                View Reports
              </Button>
            </>
          ) : (
            <>
              <Link href="/appointments">
                <Button variant="default" className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white">
                  View Appointments
                </Button>
              </Link>
              <Button variant="outline" className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100">
                Contact Clinic
              </Button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}