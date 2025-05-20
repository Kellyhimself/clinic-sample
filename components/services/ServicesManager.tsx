'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Activity, Users, DollarSign, Clock, ChevronRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';
import { FeatureGuard } from '@/components/FeatureGuard';
import { UsageLimitAlert } from '@/components/shared/UsageLimitAlert';
import { usePreemptiveLimits } from '@/app/lib/hooks/usePreemptiveLimits';

// Import shared components
import SalesMetricCard from '@/components/shared/sales/SalesMetricCard';
import SalesTable from '@/components/shared/sales/SalesTable';
import SalesFilterBar, { TimeframeType, getDateRangeFromTimeframe } from '@/components/shared/sales/SalesFilterBar';

// Import proper fetch function for services
import { fetchAppointments } from '@/lib/authActions';
import NewServiceForm from './NewServiceForm';

// Import dedicated CSS file
import './servicesManager.css';

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
    full_name?: string;
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

interface ServicesManagerProps {
  tenantId: string;
}

export default function ServicesManager({ tenantId }: ServicesManagerProps) {
  const router = useRouter();
  const [services, setServices] = useState<ServiceSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('all');
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isSmallMediumMobile, setIsSmallMediumMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);
  const [analytics, setAnalytics] = useState<ServiceAnalytics>({
    totalRevenue: 0,
    totalServices: 0,
    paidServices: 0,
    pendingServices: 0,
    mostCommonService: '',
    averageServiceValue: 0
  });
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { limits, loading: limitsLoading, isLimitValid } = usePreemptiveLimits();

  const canAddService = isLimitValid('services');

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
      cell: (service: ServiceSale) => {
        const date = new Date(service.created_at);
        return (
          <span className="truncate-text">
            {format(date, isNarrowMobile || isSmallMediumMobile ? 'MM/dd' : isMediumMobile ? 'MMM dd' : 'MMM dd, yyyy HH:mm')}
          </span>
        );
      }
    },
    {
      header: 'Patient',
      key: 'patient',
      cell: (service: ServiceSale) => (
        <div className={`truncate-text ${isMediumMobile ? 'sm-patient-truncate' : ''}`} style={{ maxWidth: isNarrowMobile ? '70px' : isSmallMediumMobile ? '90px' : isMediumMobile ? '120px' : 'auto' }}>
          <div className={`font-medium ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''} truncate-text`}>
            {service.patient.full_name}
          </div>
          {service.patient.phone_number && !isNarrowMobile && !isSmallMediumMobile && (
            <div className={`${isMediumMobile ? 'text-xs' : 'text-sm'} text-gray-500 truncate-text`}>
              {service.patient.phone_number}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Services',
      key: 'services',
      cell: (service: ServiceSale) => (
        <div className="space-y-1 truncate-text" style={{ maxWidth: isNarrowMobile ? '70px' : isSmallMediumMobile ? '90px' : isMediumMobile ? '150px' : '150px' }}>
          {service.items.map((item) => (
            <div key={item.id} className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} truncate-text`}>
              {item.service_name}
              {item.discount > 0 && !isNarrowMobile && (
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
          <div className={`truncate-text ${isMediumMobile ? 'sm-doctor-truncate' : ''}`} style={{ maxWidth: isNarrowMobile ? '70px' : isSmallMediumMobile ? '90px' : isMediumMobile ? '120px' : '120px' }}>
            <div className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} truncate-text`}>
              {service.doctor.full_name || service.doctor.name}
            </div>
            {service.doctor.specialty && !isNarrowMobile && !isSmallMediumMobile && (
              <div className={`${isMediumMobile ? 'text-xs' : 'text-sm'} text-gray-500 truncate-text`}>
                {service.doctor.specialty}
              </div>
            )}
          </div>
        ) : (
          <span className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} text-gray-400`}>-</span>
        )
      )
    },
    {
      header: 'Total',
      key: 'total',
      cell: (service: ServiceSale) => (
        <div className={`font-medium ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''} truncate-text`}>
          {isNarrowMobile ? '' : 'KSh '}{calculateTotal(service).toFixed(isNarrowMobile ? 0 : 2)}
        </div>
      )
    },
    {
      header: 'Payment',
      key: 'payment',
      cell: (service: ServiceSale) => (
        <div className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''} truncate-text`}>
          {isNarrowMobile || isSmallMediumMobile ? 
            service.payment_method.substring(0, 1).toUpperCase() : 
            service.payment_method}
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      cell: (service: ServiceSale) => {
        // Create a custom status badge since we can't use className prop
        const statusClass = `${
          service.payment_status === 'paid' 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : service.payment_status === 'pending'
            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
            : 'bg-red-100 text-red-800 border-red-200'
        } inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
          isNarrowMobile ? 'services-badge-xs' : isSmallMediumMobile ? 'services-badge-xsm' : isMediumMobile ? 'services-badge-sm' : ''
        }`;
        
        return (
          <div className={statusClass}>
            {service.payment_status.charAt(0).toUpperCase() + service.payment_status.slice(1)}
          </div>
        );
      }
    },
  ];

  // Filter services by search term
  const filteredServices = services;

  const renderUpgradeBanner = () => {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">Upgrade to Pro or Enterprise</h3>
              <p className="text-sm text-indigo-700">Get access to advanced analytics, detailed reports, and more</p>
            </div>
          </div>
          <Button 
            onClick={() => router.push('/settings/billing')}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700"
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    );
  };

  const renderFeaturePreview = (content: React.ReactNode, featureId: string) => {
    const feature = getFeatureDetails(featureId);
    const isLocked = feature?.requiredPlan !== 'free';
    
    return (
      <div className={`relative ${isLocked ? 'group' : ''}`}>
        {content}
        {isLocked && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-center p-4">
              <Lock className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-indigo-900">Available on {feature?.requiredPlan} plan</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="services-container">
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 ${isNarrowMobile ? 'xs-margin' : isSmallMediumMobile ? 'xsm-margin' : isMediumMobile ? 'sm-margin' : ''}`}>
        <h2 className={`${isNarrowMobile ? 'xs-heading' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-xl md:text-2xl'} font-bold text-gray-800 leading-tight truncate-text`}>
          {isNarrowMobile || isSmallMediumMobile ? 'Services' : isMediumMobile ? 'Services' : 'Clinical Services Management'}
        </h2>
        <Button 
          onClick={() => setShowNewServiceForm(true)}
          className={`w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 ${
            isNarrowMobile ? 'h-7 xs-text py-0 px-2' : 
            isSmallMediumMobile ? 'h-8 xsm-text py-0.5 px-3 xsm-button' : 
            isMediumMobile ? 'sm-button' :
            'py-1 h-9'
          }`}
        >
          {isNarrowMobile || isSmallMediumMobile ? 'New Service' : isMediumMobile ? 'New Service' : 'New Service Record'}
        </Button>
      </div>

      {/* Skip to content button for accessibility */}
      <a href="#services-content" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-indigo-100 text-indigo-800 rounded border">
        Skip to content
      </a>

      {/* Analysis & Navigation Links */}
      <div className={`bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-200 rounded-lg shadow-sm mb-3 ${isNarrowMobile ? 'p-1.5' : isSmallMediumMobile ? 'p-2' : isMediumMobile ? 'p-2.5' : 'p-2'}`}>
        <div className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs'} text-gray-600 mb-1 font-medium ${isNarrowMobile || isSmallMediumMobile || isMediumMobile ? 'px-1' : ''}`}>
          {isNarrowMobile || isSmallMediumMobile ? 'Navigation' : isMediumMobile ? 'Navigation' : 'Quick Navigation'}
        </div>
        <div className="services-scroll-x">
          {renderFeaturePreview(
            <Button
              variant="outline"
              size="sm"
              className={`flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 ${isNarrowMobile ? 'xs-text xs-nav-button' : isSmallMediumMobile ? 'xsm-text xsm-nav-button' : isMediumMobile ? 'sm-text sm-nav-button' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'} bg-gradient-to-r from-blue-50 to-teal-50 border-blue-200 text-blue-600 hover:bg-blue-100`}
              onClick={() => router.push('/services/reports')}
            >
              <BarChart className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
              {isNarrowMobile || isSmallMediumMobile ? 'Reports' : isMediumMobile ? 'Reports' : 'Service Reports'}
              <ChevronRight className={`${isNarrowMobile ? 'h-2 w-2' : isSmallMediumMobile ? 'h-2.5 w-2.5' : isMediumMobile ? 'h-2.5 w-2.5' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />
            </Button>,
            'advanced_analytics'
          )}
          
          {renderFeaturePreview(
            <Button
              variant="outline"
              size="sm" 
              className={`flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 ${isNarrowMobile ? 'xs-text xs-nav-button' : isSmallMediumMobile ? 'xsm-text xsm-nav-button' : isMediumMobile ? 'sm-text sm-nav-button' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'} bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600 hover:bg-emerald-100`}
              onClick={() => router.push('/services/doctors')}
            >
              <Users className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
              Doctors 
              <ChevronRight className={`${isNarrowMobile ? 'h-2 w-2' : isSmallMediumMobile ? 'h-2.5 w-2.5' : isMediumMobile ? 'h-2.5 w-2.5' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />
            </Button>,
            'advanced_services'
          )}
          
          {renderFeaturePreview(
            <Button
              variant="outline"
              size="sm"
              className={`flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 ${isNarrowMobile ? 'xs-text xs-nav-button' : isSmallMediumMobile ? 'xsm-text xsm-nav-button' : isMediumMobile ? 'sm-text sm-nav-button' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'} bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 text-amber-600 hover:bg-amber-100`}
              onClick={() => router.push('/services/top-services')}
            >
              <Activity className={`${isNarrowMobile ? 'xs-nav-icon' : isSmallMediumMobile ? 'xsm-nav-icon' : isMediumMobile ? 'sm-nav-icon' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
              {isNarrowMobile || isSmallMediumMobile ? 'Top' : isMediumMobile ? 'Top' : 'Top Services'}
              <ChevronRight className={`${isNarrowMobile ? 'h-2 w-2' : isSmallMediumMobile ? 'h-2.5 w-2.5' : isMediumMobile ? 'h-2.5 w-2.5' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />
            </Button>,
            'advanced_analytics'
          )}
        </div>
      </div>

      <div id="services-content" className="services-card bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-200">
        {/* Add usage limit alert */}
        {isLimitValid('services') && !dismissedAlerts.has('services') && (
          <UsageLimitAlert
            featureId="services"
            tenantId={tenantId}
            currentUsage={limits('services')?.current || 0}
            limit={limits('services')?.limit || 0}
            type={limits('services')?.type || 'warning'}
            onDismiss={() => setDismissedAlerts(prev => new Set([...prev, 'services']))}
          />
        )}

        {/* SalesFilterBar now positioned before the metrics cards */}
        <h3 className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} font-medium text-gray-700 mb-2 md:mb-3 ${isNarrowMobile || isSmallMediumMobile || isMediumMobile ? 'px-2 pt-2' : ''} hidden md:block`}>Filter Services Data</h3>
        
        <div className={`${isNarrowMobile ? 'xs-filter-container xs-padding' : isSmallMediumMobile ? 'xsm-filter-container xsm-padding' : isMediumMobile ? 'sm-filter-container sm-padding' : 'p-2 sm:p-3 md:p-4'}`}>
          <SalesFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            timeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
            aria-label="Services filter controls"
            customClasses={{
              searchInput: isMediumMobile ? 'sm-search-box' : '',
              timeframeSelect: isMediumMobile ? 'sm-timeframe-select' : '',
              button: isMediumMobile ? 'sm-filter-button' : '',
              filterItem: isMediumMobile ? 'sm-filter-item' : ''
            }}
          />
        </div>

        {error && <p className={`text-red-500 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} mt-2 px-3`} role="alert">{error}</p>}

        {/* Quick Analytics Cards */}
        <div className={`mt-4 pt-2 border-t border-gray-100 ${isNarrowMobile ? 'xs-padding' : isSmallMediumMobile ? 'xsm-padding' : isMediumMobile ? 'sm-padding' : 'px-3 py-2'}`}>
          <h3 className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} font-medium text-gray-700 mb-2 md:mb-3`}>
            {isNarrowMobile || isSmallMediumMobile ? 'Summary' : isMediumMobile ? 'Summary' : 'Services Summary'}
          </h3>
          <div className="services-metrics">
            <SalesMetricCard
              title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Revenue" : "Total Revenue"}
              value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(analytics.totalRevenue)}
              icon={<DollarSign className={`${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : isMediumMobile ? 'h-4 w-4' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-emerald-600`} />}
              subValue={`${analytics.totalServices} total services`}
              colorClass="from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600"
            />
            
            {renderFeaturePreview(
              <SalesMetricCard
                title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Avg Fee" : "Average Fee"}
                value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(analytics.averageServiceValue)}
                icon={<Activity className={`${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : isMediumMobile ? 'h-4 w-4' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-blue-600`} />}
                colorClass="from-blue-50 to-blue-100 border-blue-200 text-blue-600"
              />,
              'advanced_analytics'
            )}
            
            {renderFeaturePreview(
              <SalesMetricCard
                title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Popular" : "Most Common Service"}
                value={analytics.mostCommonService}
                icon={<Activity className={`${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : isMediumMobile ? 'h-4 w-4' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-indigo-600`} />}
                colorClass="from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600"
              />,
              'advanced_analytics'
            )}
            
            {renderFeaturePreview(
              <SalesMetricCard
                title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Pending" : "Pending Payments"}
                value={`${analytics.pendingServices}`}
                icon={<Clock className={`${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : isMediumMobile ? 'h-4 w-4' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-amber-600`} />}
                subValue={analytics.pendingServices > 0 ? ((analytics.pendingServices / analytics.totalServices) * 100).toFixed(1) + '% of total' : '0%'}
                colorClass="from-amber-50 to-amber-100 border-amber-200 text-amber-600"
              />,
              'enterprise_analytics'
            )}
          </div>
        </div>

        {/* Services Data Section with heading for better structure */}
        <div className={`mt-4 pt-2 border-t border-gray-100 ${isNarrowMobile ? 'xs-padding' : isSmallMediumMobile ? 'xsm-padding' : isMediumMobile ? 'sm-padding' : 'px-3 py-2'}`}>
          <h3 className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} font-medium text-gray-700 mb-2 md:mb-3`}>
            {isNarrowMobile || isSmallMediumMobile ? 'Records' : isMediumMobile ? 'Records' : 'Service Records'}
          </h3>
          
          {/* Mobile list view with collapsible option for small screens */}
          <div className="md:hidden space-y-2">
            {filteredServices.length === 0 ? (
              <div className={`text-center py-4 text-gray-500 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`} role="status">
                No services found
              </div>
            ) : (
              filteredServices.map((service) => (
                <div 
                  key={service.id}
                  className={`service-card ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className={`font-medium ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} truncate-text`} 
                        style={{maxWidth: isNarrowMobile ? '150px' : isSmallMediumMobile ? '180px' : isMediumMobile ? '220px' : '200px'}}>
                        {service.patient.full_name}
                      </div>
                      <div className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs'} text-gray-500`}>
                        {format(new Date(service.created_at), isNarrowMobile ? 'MM/dd' : isSmallMediumMobile ? 'MM/dd/yy' : isMediumMobile ? 'MMM dd, yyyy' : 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div>
                      <div className={`${
                        service.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : service.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      } inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        isNarrowMobile ? 'services-badge-xs' : isSmallMediumMobile ? 'services-badge-xsm' : isMediumMobile ? 'services-badge-sm' : ''
                      }`}>
                        {service.payment_status.charAt(0).toUpperCase() + service.payment_status.slice(1)}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    {service.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center mb-1">
                        <span className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} truncate-text`} 
                          style={{maxWidth: isNarrowMobile ? '70%' : isSmallMediumMobile ? '75%' : isMediumMobile ? '80%' : '80%'}}>
                          {item.service_name}
                        </span>
                        <span className="font-medium">
                          {isNarrowMobile ? '' : isSmallMediumMobile ? '' : isMediumMobile ? 'KSh ' : 'KSh '}{item.unit_price}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                    <span className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`}>
                      {isNarrowMobile ? 'Dr: ' : isSmallMediumMobile ? 'Dr: ' : isMediumMobile ? 'Doctor: ' : 'Doctor: '}
                      <span className="font-medium truncate-text" 
                        style={{
                          maxWidth: isNarrowMobile ? '60px' : isSmallMediumMobile ? '90px' : isMediumMobile ? '120px' : '100px', 
                          display: 'inline-block', 
                          verticalAlign: 'bottom'
                        }}>
                        {service.doctor?.full_name || 'N/A'}
                      </span>
                    </span>
                    <span className={`font-bold ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`}>
                      {isNarrowMobile ? '' : isSmallMediumMobile ? 'KSh ' : isMediumMobile ? 'Total: KSh ' : 'Total: KSh '}{calculateTotal(service).toFixed(isNarrowMobile ? 0 : 2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Desktop table view with better accessibility */}
          <div className="services-table-container hidden md:block" role="region" aria-label="Services data table">
            <SalesTable
              data={filteredServices}
              columns={serviceColumns}
              isLoading={loading}
              emptyMessage="No services found"
              className="services-table services-table-compact"
            />
          </div>
        </div>
      </div>

      {/* New Service Form Dialog */}
      {showNewServiceForm && (
        <div className="fixed inset-0 z-50 bg-white md:bg-black/50 md:p-4 flex items-center justify-center">
          <div className={`w-full h-full md:w-auto md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-lg bg-white md:shadow-xl flex flex-col overflow-hidden ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''}`}>
            <div className="px-4 py-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className={`${isNarrowMobile ? 'xs-heading' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-base md:text-lg'} font-bold`}>
                {isNarrowMobile || isSmallMediumMobile ? 'New Service' : isMediumMobile ? 'New Service' : 'New Service Record'}
              </h2>
              <Button 
                onClick={() => setShowNewServiceForm(false)}
                variant="ghost"
                size="sm"
                className={`${isNarrowMobile ? 'h-6 w-6' : isSmallMediumMobile ? 'h-7 w-7' : isMediumMobile ? 'h-8 w-8' : 'h-8 w-8'} p-0 rounded-full`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : isMediumMobile ? 'h-4 w-4' : 'h-4 w-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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