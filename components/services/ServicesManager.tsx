'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Activity, Users, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Import shared components
import SalesMetricCard from '@/components/shared/sales/SalesMetricCard';
import SalesTable from '@/components/shared/sales/SalesTable';
import SalesListCard from '@/components/shared/sales/SalesListCard';
import SalesFilterBar, { TimeframeType, getDateRangeFromTimeframe } from '@/components/shared/sales/SalesFilterBar';
import { StatusBadge } from '@/components/shared/sales/SalesTable';

// Import proper fetch function for services
import { fetchAppointments } from '@/lib/authActions';
import NewServiceForm from './NewServiceForm';

// Define TypeScript interfaces for our data structures
interface ServiceItem {
  id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
  notes: string;
  category: string;
}

interface ServiceSale {
  id: string;
  created_at: string;
  payment_method: 'cash' | 'mpesa' | 'insurance' | 'bank';
  payment_status: 'pending' | 'paid' | 'refunded';
  notes: string;
  patient: {
    full_name: string;
    phone_number?: string;
  };
  items: ServiceItem[];
  doctor?: {
    name?: string;
    specialty?: string;
    full_name?: string; // Add this to support appointment data format
  };
}

interface ServiceAnalytics {
  totalRevenue: number;
  totalServices: number;
  paidServices: number;
  pendingServices: number;
  mostCommonService: string;
  averageServiceValue: number;
}

export default function ServicesManager() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('all');
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [analytics, setAnalytics] = useState<ServiceAnalytics>({
    totalRevenue: 0,
    totalServices: 0,
    paidServices: 0,
    pendingServices: 0,
    mostCommonService: '',
    averageServiceValue: 0
  });

  // Fetch services data when component mounts or filters change
  useEffect(() => {
    fetchServicesData();
  }, [selectedTimeframe, searchTerm]);

  async function fetchServicesData() {
    try {
      setLoading(true);
      
      // Fetch data from appointments instead of sales
      // 'admin' role ensures we get all appointments
      const appointmentData = await fetchAppointments('admin');
      
      console.log('Appointment data:', appointmentData);
      
      // Transform appointments to ServiceSale format
      const transformedData = appointmentData.map(appointment => ({
        id: appointment.id,
        created_at: `${appointment.date}T${appointment.time}`,
        payment_method: appointment.payment_method || 'cash',
        payment_status: appointment.payment_status || 'pending',
        notes: appointment.notes || '',
        patient: {
          full_name: appointment.patient?.full_name || 'Unknown Patient',
        },
        items: appointment.services ? [{
          id: appointment.id,
          service_name: appointment.services.name,
          quantity: 1,
          unit_price: appointment.services.price,
          discount: 0,
          total_price: appointment.services.price,
          notes: appointment.notes || '',
          category: 'Service'
        }] : [],
        doctor: appointment.doctor ? {
          full_name: appointment.doctor.full_name
        } : undefined
      })) as ServiceSale[];
      
      console.log('Transformed service data:', transformedData);
      
      // Apply date filtering based on timeframe
      const { startDate, endDate } = getDateRangeFromTimeframe(selectedTimeframe);
      let filteredData = transformedData;
      
      if (startDate && endDate) {
        filteredData = filteredData.filter(service => {
          const serviceDate = new Date(service.created_at).toISOString().split('T')[0];
          return serviceDate >= startDate && serviceDate <= endDate;
        });
      }
      
      // Apply search term filtering
      if (searchTerm) {
        filteredData = filteredData.filter(service => {
          const searchLower = searchTerm.toLowerCase();
          return (
            service.patient.full_name.toLowerCase().includes(searchLower) ||
            service.items.some(item => item.service_name.toLowerCase().includes(searchLower)) ||
            (service.doctor?.full_name?.toLowerCase().includes(searchLower)) ||
            service.payment_method.toLowerCase().includes(searchLower)
          );
        });
      }
      
      setServices(filteredData);
      calculateAnalytics(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching services');
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calculates analytics from services data
   */
  function calculateAnalytics(servicesData: ServiceSale[]) {
    if (!servicesData.length) {
      setAnalytics({
        totalRevenue: 0,
        totalServices: 0,
        paidServices: 0,
        pendingServices: 0,
        mostCommonService: 'None',
        averageServiceValue: 0
      });
      return;
    }

    // Calculate totals
    const totalRevenue = servicesData.reduce((sum, sale) => 
      sum + calculateTotal(sale), 0);
    
    const paidServices = servicesData.filter(sale => 
      sale.payment_status === 'paid').length;
    
    const pendingServices = servicesData.filter(sale => 
      sale.payment_status === 'pending').length;
    
    // Find most common service
    const serviceCounts: Record<string, number> = {};
    servicesData.forEach(sale => {
      sale.items.forEach(item => {
        if (!serviceCounts[item.service_name]) {
          serviceCounts[item.service_name] = 0;
        }
        serviceCounts[item.service_name] += 1;
      });
    });

    let mostCommonService = 'None';
    let maxCount = 0;
    
    Object.entries(serviceCounts).forEach(([service, count]) => {
      if (count > maxCount) {
        mostCommonService = service;
        maxCount = count;
      }
    });
    
    setAnalytics({
      totalRevenue,
      totalServices: servicesData.length,
      paidServices,
      pendingServices,
      mostCommonService,
      averageServiceValue: servicesData.length > 0 ? totalRevenue / servicesData.length : 0
    });
  }

  /**
   * Calculates the total amount for a service sale
   */
  function calculateTotal(sale: ServiceSale): number {
    return sale.items.reduce((total, item) => total + item.total_price, 0);
  }

  // Define columns for the services table
  const serviceColumns = [
    {
      header: 'Date',
      key: 'date',
      cell: (service: ServiceSale) => format(new Date(service.created_at), 'MMM dd, yyyy HH:mm')
    },
    {
      header: 'Patient',
      key: 'patient',
      cell: (service: ServiceSale) => (
        <div>
          <div className="font-medium">{service.patient.full_name}</div>
          {service.patient.phone_number && (
            <div className="text-sm text-gray-500">{service.patient.phone_number}</div>
          )}
        </div>
      )
    },
    {
      header: 'Services',
      key: 'services',
      cell: (service: ServiceSale) => (
        <div className="space-y-1">
          {service.items.map((item) => (
            <div key={item.id} className="text-sm">
              {item.service_name}
              {item.discount > 0 && (
                <span className="text-green-600 ml-1">
                  ({item.discount}% off)
                </span>
              )}
            </div>
          ))}
        </div>
      )
    },
    {
      header: 'Doctor',
      key: 'doctor',
      cell: (service: ServiceSale) => (
        service.doctor ? (
          <div className="text-sm">
            <div>{service.doctor.full_name || service.doctor.name}</div>
            {service.doctor.specialty && (
              <div className="text-gray-500">{service.doctor.specialty}</div>
            )}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    {
      header: 'Total',
      key: 'total',
      cell: (service: ServiceSale) => (
        <div className="font-medium">
          KSh {calculateTotal(service).toFixed(2)}
        </div>
      )
    },
    {
      header: 'Payment',
      key: 'payment',
      cell: (service: ServiceSale) => service.payment_method
    },
    {
      header: 'Status',
      key: 'status',
      cell: (service: ServiceSale) => (
        <StatusBadge 
          status={service.payment_status} 
          variants={{
            paid: 'default',
            pending: 'secondary',
            refunded: 'destructive'
          }} 
        />
      )
    },
  ];

  // Filter services by search term
  const filteredServices = services;

  return (
    <div className="space-y-3 p-2 md:space-y-6 md:p-4 lg:p-6 mobile-container manager-container !mx-0 !max-w-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">Clinical Services Management</h2>
        <Button 
          onClick={() => setShowNewServiceForm(true)}
          className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 py-1 h-9"
        >
          New Service Record
        </Button>
      </div>

      {/* Skip to content button for accessibility */}
      <a href="#services-content" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-indigo-100 text-indigo-800 rounded border">
        Skip to content
      </a>

      {/* Analysis & Navigation Links - Now positioned at the top with improved visual hierarchy */}
      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 shadow-sm">
        <div className="text-xs text-gray-500 mb-1.5 font-medium">Quick Navigation</div>
        <div className="manager-scroll-x">
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 text-[10px] md:text-sm bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700 hover:bg-indigo-200 h-6 md:h-8 px-2 md:px-3"
            onClick={() => router.push('/services/reports')}
          >
            <BarChart className="h-3 w-3 md:h-4 md:w-4" /> Service Reports <ChevronRight className="h-2 w-2 md:h-3 md:w-3 ml-1" />
          </Button>
          
          <Button
            variant="outline"
            size="sm" 
            className="flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 text-[10px] md:text-sm bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200 h-6 md:h-8 px-2 md:px-3"
            onClick={() => router.push('/services/doctors')}
          >
            <Users className="h-3 w-3 md:h-4 md:w-4" /> Doctors <ChevronRight className="h-2 w-2 md:h-3 md:w-3 ml-1" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 text-[10px] md:text-sm bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200 h-6 md:h-8 px-2 md:px-3"
            onClick={() => router.push('/services/top-services')}
          >
            <Activity className="h-3 w-3 md:h-4 md:w-4" /> Top Services <ChevronRight className="h-2 w-2 md:h-3 md:w-3 ml-1" />
          </Button>
        </div>
      </div>

      <div id="services-content" className="bg-white rounded-lg shadow-lg p-2 sm:p-3 md:p-4 lg:p-6 overflow-hidden manager-card">
        {/* SalesFilterBar now positioned before the metrics cards */}
        <h3 className="text-sm font-medium text-gray-700 mb-2 md:mb-3 hidden md:block">Filter Services Data</h3>
        <SalesFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          timeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          aria-label="Services filter controls"
        />

        {error && <p className="text-red-500 text-xs md:text-sm mt-2" role="alert">{error}</p>}

        {/* Quick Analytics Cards now positioned after the filter bar with visual separator */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2 md:mb-3">Services Summary</h3>
          <div className="manager-metrics">
            <SalesMetricCard
              title="Total Revenue"
              value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(analytics.totalRevenue)}
              icon={<DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />}
              subValue={`${analytics.totalServices} total services`}
              colorClass="from-blue-50 to-blue-100 border-blue-200 text-blue-600"
            />
            
            <SalesMetricCard
              title="Average Fee"
              value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(analytics.averageServiceValue)}
              icon={<Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />}
              colorClass="from-green-50 to-green-100 border-green-200 text-green-600"
            />
            
            <SalesMetricCard
              title="Most Common Service"
              value={analytics.mostCommonService}
              icon={<Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600" />}
              colorClass="from-purple-50 to-purple-100 border-purple-200 text-purple-600"
            />
            
            <SalesMetricCard
              title="Pending Payments"
              value={`${analytics.pendingServices}`}
              icon={<Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600" />}
              subValue={analytics.pendingServices > 0 ? ((analytics.pendingServices / analytics.totalServices) * 100).toFixed(1) + '% of total' : '0%'}
              colorClass="from-amber-50 to-amber-100 border-amber-200 text-amber-600"
            />
          </div>
        </div>

        {/* Services Data Section with heading for better structure */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2 md:mb-3">Service Records</h3>
          
          {/* Mobile list view with collapsible option for small screens */}
          <div className="md:hidden space-y-2">
            {filteredServices.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm" role="status">
                No services found
              </div>
            ) : (
              filteredServices.map((service) => (
                <SalesListCard<ServiceSale>
                  key={service.id}
                  item={service}
                  title={(item: ServiceSale) => item.patient.full_name}
                  subtitle={(item: ServiceSale) => format(new Date(item.created_at), 'MMM dd, yyyy')}
                  status={{
                    label: service.payment_status,
                    variant: service.payment_status === 'paid' ? 'default' : 
                            service.payment_status === 'pending' ? 'secondary' : 'destructive'
                  }}
                  lineItems={service.items.map(item => ({
                    name: item.service_name,
                    quantity: 1,
                    price: item.unit_price
                  }))}
                  totalAmount={calculateTotal(service)}
                />
              ))
            )}
          </div>
          
          {/* Desktop table view with better accessibility */}
          <div className="mobile-scrollable mt-4" role="region" aria-label="Services data table">
            <SalesTable
              data={filteredServices}
              columns={serviceColumns}
              isLoading={loading}
              emptyMessage="No services found"
              className="mobile-table"
            />
          </div>
        </div>
      </div>

      {/* New Service Form Dialog */}
      {showNewServiceForm && (
        <div className="fixed inset-0 z-50 bg-white md:bg-black/50 md:p-4 flex items-center justify-center">
          <div className="w-full h-full md:w-auto md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-lg bg-white md:shadow-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-base md:text-lg font-bold">New Service Record</h2>
              <Button 
                onClick={() => setShowNewServiceForm(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <NewServiceForm 
                onSuccess={() => {
                  setShowNewServiceForm(false);
                  fetchServicesData();
                  toast.success('Service record created successfully');
                }}
                onCancel={() => setShowNewServiceForm(false)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 