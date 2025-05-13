'use client';

import './dashboard-client.css';

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
  PanelLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/lib/auth/AuthProvider';
import { LimitAwareButton } from '@/components/shared/LimitAwareButton';

export default function DashboardClient() {
  const { tenantContext } = useAuth();
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isSmallMediumMobile, setIsSmallMediumMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);
  
  const isAdminOrStaff = tenantContext?.role === 'admin' || tenantContext?.role === 'staff';
  const isAdmin = tenantContext?.role === 'admin';
  const isPharmacist = tenantContext?.role === 'pharmacist' || tenantContext?.role === 'admin';

  // Check screen size on component mount and resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsNarrowMobile(width <= 358);
      setIsSmallMediumMobile(width > 358 && width <= 409);
      setIsMediumMobile(width > 409 && width <= 480);
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (tenantContext?.role) {
      console.log('DashboardClient role:', tenantContext.role, 'isAdminOrStaff:', isAdminOrStaff);
    }
  }, [tenantContext?.role, isAdminOrStaff]);

  return (
    <main className={`min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 flex-1 overflow-y-auto dashboard-container ${isNarrowMobile ? 'xs-main-container' : ''}`}>
      <div className={`max-w-7xl mx-auto ${isNarrowMobile ? 'xs-main-container' : isSmallMediumMobile ? 'xsm-main-container' : ''}`}>
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 mb-3 md:mb-6 ${isNarrowMobile ? 'xs-top-header' : isSmallMediumMobile ? 'xsm-top-header' : ''}`}>
          <h1 className={`${isNarrowMobile ? 'xs-heading xs-truncate' : isSmallMediumMobile ? 'xsm-heading xsm-truncate' : isMediumMobile ? 'sm-heading' : 'text-xl sm:text-2xl md:text-3xl'} font-bold text-gray-900`}>
            Welcome to Clinic Dashboard
          </h1>
          <div className={`flex items-center gap-2 ${isNarrowMobile ? 'xs-button-container' : isSmallMediumMobile ? 'xsm-button-container' : ''} w-full md:w-auto`}>
            <Link href="/reports" className={`${isNarrowMobile || isSmallMediumMobile ? 'w-full' : ''} md:w-auto`}>
              <Button className={`bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 flex items-center gap-1 w-full md:w-auto ${isNarrowMobile ? 'xs-button' : isSmallMediumMobile ? 'xsm-button' : isMediumMobile ? 'sm-button' : ''}`}>
                <BarChart className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4'}`} />
                <span>View Reports</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Navigation Bar */}
        {isPharmacist && (
          <div className={`bg-gray-50 rounded-lg border border-gray-100 shadow-sm mb-3 md:mb-6 ${isNarrowMobile ? 'xs-padding xs-nav-bar' : isSmallMediumMobile ? 'xsm-padding xsm-nav-bar' : isMediumMobile ? 'sm-padding' : 'p-2'}`}>
            <div className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs'} text-gray-500 mb-1.5 font-medium`}>Quick Navigation</div>
            <div className={`dashboard-scroll-x ${isSmallMediumMobile ? 'xsm-scrollbar' : ''}`}>
              <Link href="/pharmacy/pharmacy-sales-management/new-sale">
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200 
                  ${isNarrowMobile ? 'xs-text xs-nav-button' : isSmallMediumMobile ? 'xsm-text xsm-nav-button' : isMediumMobile ? 'sm-text sm-nav-button' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'}`}
                >
                  <Plus className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
                  <span className={isNarrowMobile ? 'xs-truncate' : isSmallMediumMobile ? 'xsm-truncate' : ''}>New Sale</span> 
                  <ChevronRight className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />
                </Button>
              </Link>
              
              <Link href="/pharmacy/pharmacy-sales-management">
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-600 hover:bg-blue-200
                  ${isNarrowMobile ? 'xs-text xs-nav-button' : isSmallMediumMobile ? 'xsm-text xsm-nav-button' : isMediumMobile ? 'sm-text sm-nav-button' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'}`}
                >
                  <ShoppingCart className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
                  <span className={isNarrowMobile ? 'xs-truncate' : ''}>Sales</span> 
                  <ChevronRight className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />
                </Button>
              </Link>
              
              <Link href="/pharmacy/inventory">
                <Button
                  variant="outline"
                  size="sm" 
                  className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1 bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700 hover:bg-indigo-200
                  ${isNarrowMobile ? 'xs-text xs-nav-button' : isSmallMediumMobile ? 'xsm-text xsm-nav-button' : isMediumMobile ? 'sm-text sm-nav-button' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'}`}
                >
                  <Package className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
                  <span className={isNarrowMobile ? 'xs-truncate' : ''}>Inventory</span>
                  <ChevronRight className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Main Quick Actions Section - Improved mobile grid */}
        <section className={`grid ${isNarrowMobile ? 'dashboard-quick-actions' : isSmallMediumMobile ? 'dashboard-quick-actions' : isMediumMobile ? 'dashboard-quick-actions' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-3 md:gap-6 mb-4 md:mb-6`}>
          {/* Quick Link Card 1 - Book Appointment */}
          <Link href="/bookAppointment">
            <Card className={`group h-full cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-100 to-blue-50 hover:from-blue-200 hover:to-blue-100 border-blue-200 hover-scale ${isNarrowMobile ? 'xs-card' : isSmallMediumMobile ? 'xsm-card' : ''}`}>
              <CardContent className={`${isNarrowMobile ? 'xs-card-content' : isSmallMediumMobile ? 'xsm-card-content' : isMediumMobile ? 'sm-card-content' : 'p-4 md:p-6'} flex flex-col items-center justify-center text-center h-full space-y-3 md:space-y-4`}>
                <div className={`rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300
                ${isNarrowMobile ? 'xs-action-icon' : isSmallMediumMobile ? 'xsm-action-icon' : isMediumMobile ? 'sm-action-icon' : 'w-12 h-12 md:w-16 md:h-16'}`}>
                  <CalendarDays className={`${isNarrowMobile ? 'xs-action-icon-inner' : isSmallMediumMobile ? 'xsm-action-icon-inner' : isMediumMobile ? 'sm-action-icon-inner' : 'h-6 w-6 md:h-8 md:w-8'}`} />
                </div>
                <div className={isNarrowMobile ? 'xs-title-container' : isSmallMediumMobile ? 'xsm-title-container' : ''}>
                  <h3 className={`${isNarrowMobile ? 'xs-heading xs-truncate' : isSmallMediumMobile ? 'xsm-heading xsm-truncate' : isMediumMobile ? 'sm-heading' : 'text-lg md:text-xl'} font-bold text-blue-700 mb-1 md:mb-2`}>Book Appointment</h3>
                  <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text xsm-truncate' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-blue-600`}>
                    {isAdminOrStaff 
                      ? "Book for patients or add guest patients" 
                      : "Schedule a new appointment"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Quick Link Card 2 - Pharmacy Sales */}
          {isPharmacist && (
            <Link href="/pharmacy/pharmacy-sales-management">
              <Card className={`group h-full cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-emerald-100 to-emerald-50 hover:from-emerald-200 hover:to-emerald-100 border-emerald-200 hover-scale ${isNarrowMobile ? 'xs-card' : ''}`}>
                <CardContent className={`${isNarrowMobile ? 'xs-card-content' : isSmallMediumMobile ? 'xsm-card-content' : isMediumMobile ? 'sm-card-content' : 'p-4 md:p-6'} flex flex-col items-center justify-center text-center h-full space-y-3 md:space-y-4`}>
                  <div className={`rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300
                  ${isNarrowMobile ? 'xs-action-icon' : isSmallMediumMobile ? 'xsm-action-icon' : isMediumMobile ? 'sm-action-icon' : 'w-12 h-12 md:w-16 md:h-16'}`}>
                    <ShoppingCart className={`${isNarrowMobile ? 'xs-action-icon-inner' : isSmallMediumMobile ? 'xsm-action-icon-inner' : isMediumMobile ? 'sm-action-icon-inner' : 'h-6 w-6 md:h-8 md:w-8'}`} />
                  </div>
                <div className={isNarrowMobile ? 'xs-title-container' : ''}>
                    <h3 className={`${isNarrowMobile ? 'xs-heading xs-truncate' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-lg md:text-xl'} font-bold text-emerald-700 mb-1 md:mb-2`}>Pharmacy Sales</h3>
                    <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-emerald-600`}>Manage all pharmacy sales and analytics</p>
                </div>
              </CardContent>
            </Card>
            </Link>
          )}

          {/* Quick Link Card 3 - Add Medication */}
          {isPharmacist && (
            <Link href="/pharmacy/inventory/add">
              <Card className={`group h-full cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-purple-100 to-purple-50 hover:from-purple-200 hover:to-purple-100 border-purple-200 hover-scale ${isNarrowMobile ? 'xs-card' : ''}`}>
                <div className={`${isNarrowMobile ? 'xs-card-content' : isSmallMediumMobile ? 'xsm-card-content' : isMediumMobile ? 'sm-card-content' : 'p-4 md:p-6'} flex flex-col items-center justify-center text-center h-full space-y-3 md:space-y-4`}>
                  <div className={`rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300
                  ${isNarrowMobile ? 'xs-action-icon' : isSmallMediumMobile ? 'xsm-action-icon' : isMediumMobile ? 'sm-action-icon' : 'w-12 h-12 md:w-16 md:h-16'}`}>
                    <Plus className={`${isNarrowMobile ? 'xs-action-icon-inner' : isSmallMediumMobile ? 'xsm-action-icon-inner' : isMediumMobile ? 'sm-action-icon-inner' : 'h-6 w-6 md:h-8 md:w-8'}`} />
                  </div>
                  <div className={isNarrowMobile ? 'xs-title-container' : ''}>
                    <h3 className={`${isNarrowMobile ? 'xs-heading xs-truncate' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-lg md:text-xl'} font-bold text-purple-700 mb-1 md:mb-2`}>Add Medication</h3>
                    <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-purple-600`}>Add new medication to inventory</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          {/* Quick Link Card 4 - Add Patient */}
          {!isPharmacist && (
            <Link href="/signup">
              <Card className={`group h-full cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-amber-100 to-amber-50 hover:from-amber-200 hover:to-amber-100 border-amber-200 hover-scale ${isNarrowMobile ? 'xs-card' : ''}`}>
                <CardContent className={`${isNarrowMobile ? 'xs-card-content' : isSmallMediumMobile ? 'xsm-card-content' : isMediumMobile ? 'sm-card-content' : 'p-4 md:p-6'} flex flex-col items-center justify-center text-center h-full space-y-3 md:space-y-4`}>
                  <div className={`rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300
                  ${isNarrowMobile ? 'xs-action-icon' : isSmallMediumMobile ? 'xsm-action-icon' : isMediumMobile ? 'sm-action-icon' : 'w-12 h-12 md:w-16 md:h-16'}`}>
                    <Users className={`${isNarrowMobile ? 'xs-action-icon-inner' : isSmallMediumMobile ? 'xsm-action-icon-inner' : isMediumMobile ? 'sm-action-icon-inner' : 'h-6 w-6 md:h-8 md:w-8'}`} />
                  </div>
                  <div className={isNarrowMobile ? 'xs-title-container' : ''}>
                    <h3 className={`${isNarrowMobile ? 'xs-heading xs-truncate' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-lg md:text-xl'} font-bold text-amber-700 mb-1 md:mb-2`}>Add Patient</h3>
                    <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-amber-600`}>Register a new patient in the system</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </section>

        {/* Management Section - Only for admin and pharmacist roles */}
        {isPharmacist && (
          <section className={`mb-4 md:mb-6 bg-white rounded-lg shadow-md ${isNarrowMobile ? 'xs-padding xs-card' : isSmallMediumMobile ? 'xsm-padding xsm-card' : isMediumMobile ? 'sm-padding' : 'p-3 md:p-5'} dashboard-card`}>
            <h2 className={`${isNarrowMobile ? 'xs-heading xs-truncate' : isSmallMediumMobile ? 'xsm-heading xsm-truncate' : isMediumMobile ? 'sm-heading' : 'text-lg md:text-xl'} font-bold mb-3 md:mb-4 text-gray-800 flex items-center gap-2`}>
              <Package className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-blue-600`} />
              <span>Pharmacy Management</span>
            </h2>
            <div className={`grid ${isNarrowMobile ? 'dashboard-management-cards' : isSmallMediumMobile ? 'dashboard-management-cards' : isMediumMobile ? 'dashboard-management-cards' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-3 md:gap-4`}>
              <Link href="/pharmacy/inventory">
                <Card className={`h-full cursor-pointer hover:bg-blue-50 transition-colors border-blue-100 hover-scale ${isNarrowMobile ? 'xs-card' : isSmallMediumMobile ? 'xsm-card' : ''}`}>
                  <CardContent className={`${isNarrowMobile ? 'xs-card-content xs-inner-content' : isSmallMediumMobile ? 'xsm-card-content xsm-inner-content' : isMediumMobile ? 'sm-card-content' : 'p-3 md:p-4'} flex items-center gap-3`}>
                    <div className={`p-2 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 ${isNarrowMobile ? 'xs-icon-container' : isSmallMediumMobile ? 'xsm-icon-container' : ''}`}>
                      <Package className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-blue-600`} />
                    </div>
                    <div className={isNarrowMobile ? 'xs-title-container' : isSmallMediumMobile ? 'xsm-title-container' : ''}>
                      <h3 className={`font-semibold ${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text xsm-truncate' : isMediumMobile ? 'sm-text' : 'text-sm md:text-base'}`}>Inventory</h3>
                      <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text xsm-truncate' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-gray-500`}>Manage medication stock</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/pharmacy/stock-alerts">
                <Card className={`h-full cursor-pointer hover:bg-red-50 transition-colors border-red-100 hover-scale ${isNarrowMobile ? 'xs-card' : ''}`}>
                  <CardContent className={`${isNarrowMobile ? 'xs-card-content xs-inner-content' : isSmallMediumMobile ? 'xsm-card-content' : isMediumMobile ? 'sm-card-content' : 'p-3 md:p-4'} flex items-center gap-3`}>
                    <div className={`p-2 rounded-full bg-gradient-to-r from-red-100 to-red-200 ${isNarrowMobile ? 'xs-icon-container' : isSmallMediumMobile ? 'xsm-padding' : ''}`}>
                      <PanelLeft className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-red-600`} />
                    </div>
                    <div className={isNarrowMobile ? 'xs-title-container' : ''}>
                      <h3 className={`font-semibold ${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm md:text-base'}`}>Stock Alerts</h3>
                      <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-gray-500`}>View low stock medications</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/reports?tab=pharmacy">
                <Card className={`h-full cursor-pointer hover:bg-emerald-50 transition-colors border-emerald-100 hover-scale ${isNarrowMobile ? 'xs-card' : ''}`}>
                  <CardContent className={`${isNarrowMobile ? 'xs-card-content xs-inner-content' : isSmallMediumMobile ? 'xsm-card-content' : isMediumMobile ? 'sm-card-content' : 'p-3 md:p-4'} flex items-center gap-3`}>
                    <div className={`p-2 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-200 ${isNarrowMobile ? 'xs-icon-container' : isSmallMediumMobile ? 'xsm-padding' : ''}`}>
                      <LineChart className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-emerald-600`} />
                    </div>
                    <div className={isNarrowMobile ? 'xs-title-container' : ''}>
                      <h3 className={`font-semibold ${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm md:text-base'}`}>Sales Analytics</h3>
                      <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-gray-500`}>View sales reports</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/pharmacy/pharmacy-sales-management?tab=analytics">
                <Card className={`h-full cursor-pointer hover:bg-blue-50 transition-colors border-blue-100 hover-scale ${isNarrowMobile ? 'xs-card' : ''}`}>
                  <CardContent className={`${isNarrowMobile ? 'xs-card-content xs-inner-content' : isSmallMediumMobile ? 'xsm-card-content' : isMediumMobile ? 'sm-card-content' : 'p-3 md:p-4'} flex items-center gap-3`}>
                    <div className={`p-2 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 ${isNarrowMobile ? 'xs-icon-container' : isSmallMediumMobile ? 'xsm-padding' : ''}`}>
                      <BarChart className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-blue-600`} />
                    </div>
                    <div className={isNarrowMobile ? 'xs-title-container' : ''}>
                      <h3 className={`font-semibold ${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm md:text-base'}`}>Pharmacy Dashboard</h3>
                      <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-gray-500`}>Advanced sales metrics</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/pharmacy/pharmacy-sales-management/new-sale">
                <Card className={`h-full cursor-pointer hover:bg-emerald-50 transition-colors border-emerald-100 hover-scale ${isNarrowMobile ? 'xs-card' : ''}`}>
                  <CardContent className={`${isNarrowMobile ? 'xs-card-content xs-inner-content' : isSmallMediumMobile ? 'xsm-card-content' : isMediumMobile ? 'sm-card-content' : 'p-3 md:p-4'} flex items-center gap-3`}>
                    <div className={`p-2 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-200 ${isNarrowMobile ? 'xs-icon-container' : isSmallMediumMobile ? 'xsm-padding' : ''}`}>
                      <Plus className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-emerald-600`} />
                    </div>
                    <div className={isNarrowMobile ? 'xs-title-container' : ''}>
                      <h3 className={`font-semibold ${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm md:text-base'}`}>Create New Sale</h3>
                      <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-gray-500`}>Record a new pharmacy sale</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>
        )}

        {/* Administrator Section - Only for admin role */}
        {isAdmin && (
          <section className={`bg-white rounded-lg shadow-md ${isNarrowMobile ? 'xs-padding xs-card' : isSmallMediumMobile ? 'xsm-padding xsm-card' : isMediumMobile ? 'sm-padding' : 'p-3 md:p-5'} dashboard-card`}>
            <h2 className={`${isNarrowMobile ? 'xs-heading xs-truncate' : isSmallMediumMobile ? 'xsm-heading xsm-truncate' : isMediumMobile ? 'sm-heading' : 'text-lg md:text-xl'} font-bold mb-3 md:mb-4 text-gray-800 flex items-center gap-2`}>
              <ClipboardList className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-indigo-600`} />
              <span>Administration</span>
            </h2>
            <div className={`grid ${isNarrowMobile ? 'grid-cols-1' : isSmallMediumMobile ? 'grid-cols-2' : isMediumMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3 md:gap-4`}>
              <Link href="/settings/users">
                <Card className={`h-full cursor-pointer hover:bg-indigo-50 transition-colors border-indigo-100 hover-scale ${isNarrowMobile ? 'xs-card' : isSmallMediumMobile ? 'xsm-card' : ''}`}>
                  <CardContent className={`${isNarrowMobile ? 'xs-card-content xs-inner-content' : isSmallMediumMobile ? 'xsm-card-content xsm-inner-content' : isMediumMobile ? 'sm-card-content' : 'p-3 md:p-4'} flex items-center gap-3`}>
                    <div className={`p-2 rounded-full bg-gradient-to-r from-indigo-100 to-indigo-200 ${isNarrowMobile ? 'xs-icon-container' : isSmallMediumMobile ? 'xsm-icon-container' : ''}`}>
                      <Users className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-indigo-600`} />
                    </div>
                    <div className={isNarrowMobile ? 'xs-title-container' : isSmallMediumMobile ? 'xsm-title-container' : ''}>
                      <h3 className={`font-semibold ${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text xsm-truncate' : isMediumMobile ? 'sm-text' : 'text-sm md:text-base'}`}>Manage Users</h3>
                      <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text xsm-truncate' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-gray-500`}>Add or edit user accounts</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/reports">
                <Card className={`h-full cursor-pointer hover:bg-amber-50 transition-colors border-amber-100 hover-scale ${isNarrowMobile ? 'xs-card' : isSmallMediumMobile ? 'xsm-card' : ''}`}>
                  <CardContent className={`${isNarrowMobile ? 'xs-card-content xs-inner-content' : isSmallMediumMobile ? 'xsm-card-content xsm-inner-content' : isMediumMobile ? 'sm-card-content' : 'p-3 md:p-4'} flex items-center gap-3`}>
                    <div className={`p-2 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 ${isNarrowMobile ? 'xs-icon-container' : isSmallMediumMobile ? 'xsm-icon-container' : ''}`}>
                      <BarChart className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-4 w-4 md:h-5 md:w-5'} text-amber-600`} />
                    </div>
                    <div className={isNarrowMobile ? 'xs-title-container' : isSmallMediumMobile ? 'xsm-title-container' : ''}>
                      <h3 className={`font-semibold ${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text xsm-truncate' : isMediumMobile ? 'sm-text' : 'text-sm md:text-base'}`}>Analytics</h3>
                      <p className={`${isNarrowMobile ? 'xs-text xs-truncate' : isSmallMediumMobile ? 'xsm-text xsm-truncate' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-gray-500`}>View comprehensive reports</p>
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