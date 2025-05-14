'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { fetchInventory, deleteBatch } from '@/lib/inventory';
import { toast } from 'sonner';
import { Search, MoreVertical, Plus, Trash2, Eye, Pill } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Import dedicated CSS file
import './inventoryManager.css';

interface Medication {
  id: string;
  name: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit_price: number;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  batches: {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    unit_price: number;
  }[];
}

export default function InventoryManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isSmallMediumMobile, setIsSmallMediumMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);

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

  const LOW_STOCK_THRESHOLD = 10; // You can adjust this value based on your needs

  useEffect(() => {
    const fetchData = async () => {
      console.log('=== InventoryManager fetchData START ===');
      try {
        console.log('Calling fetchInventory...');
        const data = await fetchInventory();
        console.log('fetchInventory result:', { 
          hasData: !!data,
          dataLength: data?.length || 0,
          sampleMedication: data?.[0] ? {
            id: data[0].id,
            name: data[0].name,
            batches: data[0].batches,
            totalStock: data[0].batches.reduce((sum, batch) => sum + batch.quantity, 0)
          } : null
        });
        setMedications(data);
        setError(null);
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Failed to fetch inventory');
      } finally {
        setLoading(false);
        console.log('=== InventoryManager fetchData END ===');
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (searchParams.get('refresh') === 'true') {
      const fetchData = async () => {
        try {
          const data = await fetchInventory();
          setMedications(data);
          setError(null);
        } catch (err) {
          setError('Failed to fetch inventory');
          console.error('Error fetching inventory:', err);
        }
      };

      fetchData();
      router.replace('/pharmacy/inventory');
    }
  }, [searchParams, router]);

  const handleAddBatch = (medicationId: string) => {
    router.push(`/pharmacy/inventory/batches/new?medication_id=${medicationId}&return_url=/pharmacy/inventory`);
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await deleteBatch(batchId);
      toast.success('Batch deleted successfully');
      // Refresh the inventory data
      const data = await fetchInventory();
      setMedications(data);
    } catch (error) {
      toast.error('Failed to delete batch');
      console.error('Error deleting batch:', error);
    }
  };

  const handleAddNewMedication = () => {
    router.push('/pharmacy/inventory/add');
  };

  const filteredMedications = medications.filter(medication => {
    const matchesSearch = 
      medication.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medication.dosage_form.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medication.strength.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || medication.category === categoryFilter;
    const matchesStock = stockFilter === 'all' || 
      (stockFilter === 'low' && medication.batches.reduce((sum, batch) => sum + batch.quantity, 0) <= LOW_STOCK_THRESHOLD) ||
      (stockFilter === 'out' && medication.batches.every(b => b.quantity === 0));

    return matchesSearch && matchesCategory && matchesStock;
  });

  const categories = Array.from(new Set(medications.map(m => m.category)));

  const getStatusBadge = (medication: Medication) => {
    if (medication.batches.some(batch => new Date(batch.expiry_date) < new Date())) {
      return (
        <Badge 
          variant="destructive" 
          className={`${isNarrowMobile ? 'xs-text inventory-badge-xs' : isSmallMediumMobile ? 'xsm-text inventory-badge-xsm' : isMediumMobile ? 'sm-text inventory-badge-sm' : ''} status-expired`}
        >
          {isNarrowMobile || isSmallMediumMobile ? 'Exp' : 'Expired'}
        </Badge>
      );
    } else if (medication.batches.some(batch => {
      const expiryDate = new Date(batch.expiry_date);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    })) {
      return (
        <Badge 
          variant="secondary" 
          className={`${isNarrowMobile ? 'xs-text inventory-badge-xs' : isSmallMediumMobile ? 'xsm-text inventory-badge-xsm' : isMediumMobile ? 'sm-text inventory-badge-sm' : ''} status-expiring`}
        >
          {isNarrowMobile || isSmallMediumMobile ? 'Exp Soon' : 'Expiring Soon'}
        </Badge>
      );
    } else if (medication.batches.reduce((sum, batch) => sum + batch.quantity, 0) <= LOW_STOCK_THRESHOLD) {
      return (
        <Badge 
          variant="secondary" 
          className={`${isNarrowMobile ? 'xs-text inventory-badge-xs' : isSmallMediumMobile ? 'xsm-text inventory-badge-xsm' : isMediumMobile ? 'sm-text inventory-badge-sm' : ''} status-low`}
        >
          {isNarrowMobile || isSmallMediumMobile ? 'Low' : 'Low Stock'}
        </Badge>
      );
    } else {
      return (
        <Badge 
          variant="default" 
          className={`${isNarrowMobile ? 'xs-text inventory-badge-xs' : isSmallMediumMobile ? 'xsm-text inventory-badge-xsm' : isMediumMobile ? 'sm-text inventory-badge-sm' : ''} status-good`}
        >
          {isNarrowMobile || isSmallMediumMobile ? 'In Stock' : 'Good Stock'}
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="inventory-container">
        <div className="inventory-card p-4">
          <p className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} text-gray-600`}>
            Loading inventory...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-container">
        <div className="inventory-card p-4">
          <p className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} text-red-600`}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Function to render mobile cards for narrow screens
  const renderMobileCards = () => {
    return filteredMedications.map((medication) => (
      <div key={medication.id} className="inventory-card p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="truncate-text" style={{ maxWidth: '70%' }}>
            <h3 className={`font-medium ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'} truncate-text`}>{medication.name}</h3>
            <p className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'} text-gray-500 mt-1 truncate-text`}>
              {medication.category} • {medication.dosage_form} {medication.strength}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={`${isNarrowMobile ? 'h-6 w-6' : isSmallMediumMobile ? 'h-6 w-6' : 'h-7 w-7'} p-0`}>
                <MoreVertical className={`${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={isNarrowMobile ? 'inventory-dropdown-xs' : isSmallMediumMobile ? 'inventory-dropdown-xsm' : ''}>
              <DropdownMenuItem 
                className={`cursor-pointer text-blue-600 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'}`}
                onClick={() => handleAddBatch(medication.id)}
              >
                <Plus className={`mr-1 ${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                Add Batch
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`cursor-pointer text-green-600 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'}`}
                onClick={() => router.push(`/pharmacy/inventory/${medication.id}/batches`)}
              >
                <Eye className={`mr-1 ${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                View Batches
              </DropdownMenuItem>
              {medication.batches.some(batch => new Date(batch.expiry_date) < new Date()) && (
                <DropdownMenuItem 
                  className={`cursor-pointer text-red-600 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'}`}
                  onClick={() => handleDeleteBatch(medication.batches.find(b => new Date(b.expiry_date) < new Date())?.id || '')}
                >
                  <Trash2 className={`mr-1 ${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                  Delete Expired
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <p className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'} text-gray-500`}>Price</p>
            <p className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'} font-medium`}>
              KSh {medication.unit_price.toFixed(2)}
            </p>
          </div>
          <div>
            <p className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'} text-gray-500`}>Stock</p>
            <p className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : 'sm-text'} font-medium`}>
              {medication.batches.reduce((sum, batch) => sum + batch.quantity, 0)} units
            </p>
          </div>
        </div>
        
        <div className="mt-2 flex justify-between items-center">
          {getStatusBadge(medication)}
          
          {medication.batches.some(batch => new Date(batch.expiry_date) < new Date()) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteBatch(medication.batches.find(b => new Date(b.expiry_date) < new Date())?.id || '')}
                className={`text-red-600 hover:text-red-700 ${isNarrowMobile ? 'xs-text inventory-button-xs' : isSmallMediumMobile ? 'xsm-text inventory-button-xsm' : 'sm-text inventory-button-sm'}`}
              >
                <Trash2 className={`mr-1 ${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                {isNarrowMobile ? 'Del' : isSmallMediumMobile ? 'Delete' : 'Delete'}
              </Button>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="inventory-container min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50">
      <Card className="shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2 sm:pb-4 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-t-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
            <div>
              <CardTitle className={`${isNarrowMobile ? 'xs-heading' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-xl md:text-2xl'} font-bold text-gray-800 leading-tight`}>
                Inventory Management
              </CardTitle>
              <CardDescription className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm sm:text-base'} text-gray-600`}>
                Manage your medication inventory, track stock levels, and monitor expiry dates
              </CardDescription>
            </div>
            <Button
              onClick={handleAddNewMedication}
              className={`w-full md:w-auto bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600 ${
                isNarrowMobile ? 'pharmacy-button-xs xs-new-sale-button' : 
                isSmallMediumMobile ? 'pharmacy-button-xsm xsm-button' : 
                isMediumMobile ? 'pharmacy-button-sm' : 'py-1 h-9'
              } flex items-center gap-2`}
            >
              <Pill className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'}`} />
              <span className={isNarrowMobile ? 'xs-truncate xs-content-wrap w-full max-w-[60px]' : isSmallMediumMobile ? 'xsm-truncate' : ''}>
                {isNarrowMobile ? 'Add' : isSmallMediumMobile ? 'Add Med' : 'Add Medication'}
              </span>
            </Button>
          </div>
        </CardHeader>
        <div className={`${isNarrowMobile ? 'xs-padding' : isSmallMediumMobile ? 'xsm-padding xsm-filter-container' : isMediumMobile ? 'sm-padding' : 'p-2 md:p-4'} border-b flex flex-col sm:flex-row gap-2 md:gap-4 bg-gradient-to-r from-gray-50 to-blue-50/50`}>
          <div className="relative flex-1">
            <Search className={`absolute left-2 top-2.5 ${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-gray-400`} />
            <Input
              placeholder={isNarrowMobile || isSmallMediumMobile ? "Search..." : "Search medications..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-8 ${isNarrowMobile ? 'h-7 xs-text' : isSmallMediumMobile ? 'h-7 xsm-text' : 'h-8 text-xs'} border-gray-300 focus:border-blue-500 bg-white/80 backdrop-blur-sm`}
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value)}
          >
            <SelectTrigger className={`w-full sm:w-[180px] ${isNarrowMobile ? 'h-7 xs-text' : isSmallMediumMobile ? 'h-7 xsm-text xsm-filter-dropdown' : 'h-8 text-xs'} border-gray-300 focus:border-blue-500 bg-white/80 backdrop-blur-sm`}>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category} className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={stockFilter}
            onValueChange={(value) => setStockFilter(value)}
          >
            <SelectTrigger className={`w-full sm:w-[180px] ${isNarrowMobile ? 'h-7 xs-text' : isSmallMediumMobile ? 'h-7 xsm-text xsm-filter-dropdown' : 'h-8 text-xs'} border-gray-300 focus:border-blue-500 bg-white/80 backdrop-blur-sm`}>
              <SelectValue placeholder="Filter by stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>All Stock</SelectItem>
              <SelectItem value="low" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>Low Stock</SelectItem>
              <SelectItem value="out" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Mobile cards for narrow and small-medium screens */}
        {(isNarrowMobile || isSmallMediumMobile) && (
          <div className="p-2 space-y-2 bg-gradient-to-br from-gray-50 to-blue-50/30">
            {filteredMedications.length === 0 ? (
              <p className={`${isNarrowMobile ? 'xs-text' : 'xsm-text'} text-center text-gray-500 py-4`}>No medications found</p>
            ) : (
              renderMobileCards()
            )}
          </div>
        )}
        
        {/* Table view for medium mobile and larger screens */}
        {!isNarrowMobile && !isSmallMediumMobile && (
          <div className="inventory-table-container bg-gradient-to-br from-gray-50 to-blue-50/30">
            <Table className={`${isMediumMobile ? 'inventory-table-mobile' : 'mobile-table mobile-table-compact'} bg-white/80 backdrop-blur-sm`}>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-blue-500/10 to-teal-500/10">
                  <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                    Name
                  </TableHead>
                  <TableHead className={`${isMediumMobile ? 'sm-text sm-hidden' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 hidden sm:table-cell mobile-table-cell`}>
                    Category
                  </TableHead>
                  <TableHead className={`${isMediumMobile ? 'sm-text sm-hidden' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 hidden sm:table-cell mobile-table-cell`}>
                    Dosage Form
                  </TableHead>
                  <TableHead className={`${isMediumMobile ? 'sm-text sm-hidden' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 hidden sm:table-cell mobile-table-cell`}>
                    Strength
                  </TableHead>
                  <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                    Stock
                  </TableHead>
                  <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                    Status
                  </TableHead>
                  <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell w-8`}>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className={`${isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} text-center text-gray-500 py-4`}>
                      No medications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedications.map((medication) => (
                    <TableRow key={medication.id} className="hover:bg-blue-50/50 transition-colors">
                      <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} text-gray-900 mobile-table-cell`}>
                        <div>
                          <div className="font-medium truncate-text" style={{ maxWidth: isMediumMobile ? '120px' : '150px' }}>{medication.name}</div>
                          {isMediumMobile && (
                            <div className={`sm-text text-gray-500 truncate-text`} style={{ maxWidth: '120px' }}>
                              {medication.category} • {medication.dosage_form} {medication.strength}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`${isMediumMobile ? 'sm-text sm-hidden' : 'mobile-text-xs text-xs md:text-sm'} text-gray-900 hidden sm:table-cell mobile-table-cell`}>
                        {medication.category}
                      </TableCell>
                      <TableCell className={`${isMediumMobile ? 'sm-text sm-hidden' : 'mobile-text-xs text-xs md:text-sm'} text-gray-900 hidden sm:table-cell mobile-table-cell`}>
                        {medication.dosage_form}
                      </TableCell>
                      <TableCell className={`${isMediumMobile ? 'sm-text sm-hidden' : 'mobile-text-xs text-xs md:text-sm'} text-gray-900 hidden sm:table-cell mobile-table-cell`}>
                        {medication.strength}
                      </TableCell>
                      <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-[10px] md:text-xs'} mobile-table-cell`}>
                        {medication.batches.reduce((sum, batch) => sum + batch.quantity, 0)}
                      </TableCell>
                      <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-[10px] md:text-xs'} mobile-table-cell`}>
                        {getStatusBadge(medication)}
                        
                        {isMediumMobile && medication.batches.some(batch => new Date(batch.expiry_date) < new Date()) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBatch(medication.batches.find(b => new Date(b.expiry_date) < new Date())?.id || '')}
                              className="text-red-600 hover:text-red-700 sm-text mt-1 h-7 px-2"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                        )}
                      </TableCell>
                      <TableCell className="mobile-table-cell p-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={`${isMediumMobile ? 'h-8 w-8' : 'h-7 w-7'} hover:bg-blue-50`}>
                              <MoreVertical className={`${isMediumMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white/90 backdrop-blur-sm">
                            <DropdownMenuItem 
                              className={`cursor-pointer text-blue-600 ${isMediumMobile ? 'sm-text' : ''} hover:bg-blue-50`}
                              onClick={() => handleAddBatch(medication.id)}
                            >
                              <Plus className={`mr-1 ${isMediumMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                              Add Batch
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className={`cursor-pointer text-green-600 ${isMediumMobile ? 'sm-text' : ''} hover:bg-green-50`}
                              onClick={() => router.push(`/pharmacy/inventory/${medication.id}/batches`)}
                            >
                              <Eye className={`mr-1 ${isMediumMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                              View Batches
                            </DropdownMenuItem>
                            {medication.batches.some(batch => new Date(batch.expiry_date) < new Date()) && (
                              <DropdownMenuItem 
                                className={`cursor-pointer text-red-600 ${isMediumMobile ? 'sm-text' : ''} hover:bg-red-50`}
                                onClick={() => handleDeleteBatch(medication.batches.find(b => new Date(b.expiry_date) < new Date())?.id || '')}
                              >
                                <Trash2 className={`mr-1 ${isMediumMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                                Delete Expired
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}