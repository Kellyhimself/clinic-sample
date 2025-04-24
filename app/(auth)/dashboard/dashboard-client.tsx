'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarDays, 
  Users, 
  ClipboardList, 
  ShoppingCart, 
  Package, 
  Plus, 
  BarChart, 
  LineChart,
  PanelLeft
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface DashboardClientProps {
  initialUserRole: string;
}

export default function DashboardClient({ initialUserRole }: DashboardClientProps) {
  const [userRole] = useState(initialUserRole);
  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';
  const isAdmin = userRole === 'admin';
  const isPharmacist = userRole === 'pharmacist' || userRole === 'admin';

  useEffect(() => {
    if (userRole) {
      console.log('DashboardClient userRole:', userRole, 'isAdminOrStaff:', isAdminOrStaff);
    }
  }, [userRole, isAdminOrStaff]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 sm:p-6 flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome to Clinic Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link href="/reports">
              <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                <span>View Reports</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Quick Actions Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Quick Link Card 1 */}
          <Link href="/bookAppointment">
            <Card className="group h-full cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-100 to-blue-50 hover:from-blue-200 hover:to-blue-100 border-blue-200">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                  <CalendarDays className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-700 mb-2">Book Appointment</h3>
                  <p className="text-blue-600 text-sm">
                    {isAdminOrStaff 
                      ? "Book for patients or add guest patients" 
                      : "Schedule a new appointment"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Quick Link Card 2 */}
          {isPharmacist && (
            <Link href="/pharmacy/sales/new">
              <Card className="group h-full cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-emerald-100 to-emerald-50 hover:from-emerald-200 hover:to-emerald-100 border-emerald-200">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                <div>
                    <h3 className="text-xl font-bold text-emerald-700 mb-2">New Sale</h3>
                    <p className="text-emerald-600 text-sm">Create a new pharmacy sale for a patient</p>
                </div>
              </CardContent>
            </Card>
            </Link>
          )}

          {/* Quick Link Card 3 */}
          {isPharmacist && (
            <Link href="/pharmacy/inventory/new">
              <Card className="group h-full cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-purple-100 to-purple-50 hover:from-purple-200 hover:to-purple-100 border-purple-200">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Plus className="h-8 w-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-purple-700 mb-2">Add Medication</h3>
                    <p className="text-purple-600 text-sm">Add new medication to inventory</p>
              </div>
            </CardContent>
          </Card>
            </Link>
          )}

          {/* Quick Link Card 4 - Conditionally show signup if no pharmacy role */}
          {!isPharmacist && (
            <Link href="/signup">
              <Card className="group h-full cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-amber-100 to-amber-50 hover:from-amber-200 hover:to-amber-100 border-amber-200">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-700 mb-2">Add Patient</h3>
                    <p className="text-amber-600 text-sm">Register a new patient in the system</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </section>

        {/* Management Section - Only for admin and pharmacist roles */}
        {isPharmacist && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span>Pharmacy Management</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/pharmacy/inventory">
                <Card className="h-full cursor-pointer hover:bg-blue-50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-blue-100 to-blue-200">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Inventory</h3>
                      <p className="text-sm text-gray-500">Manage medication stock</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/pharmacy/stock-alerts">
                <Card className="h-full cursor-pointer hover:bg-red-50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-red-100 to-red-200">
                      <PanelLeft className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Stock Alerts</h3>
                      <p className="text-sm text-gray-500">View low stock medications</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/reports?tab=pharmacy">
                <Card className="h-full cursor-pointer hover:bg-emerald-50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-200">
                      <LineChart className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Sales Analytics</h3>
                      <p className="text-sm text-gray-500">View sales reports</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>
        )}

        {/* Administrator Section - Only for admin role */}
        {isAdmin && (
          <section>
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              <span>Administration</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/settings/users">
                <Card className="h-full cursor-pointer hover:bg-indigo-50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-indigo-100 to-indigo-200">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Manage Users</h3>
                      <p className="text-sm text-gray-500">Add or edit user accounts</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/reports">
                <Card className="h-full cursor-pointer hover:bg-amber-50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-amber-100 to-amber-200">
                      <BarChart className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Analytics</h3>
                      <p className="text-sm text-gray-500">View comprehensive reports</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
        </div>
      </section>
        )}
      </div>
    </main>
  );
} 