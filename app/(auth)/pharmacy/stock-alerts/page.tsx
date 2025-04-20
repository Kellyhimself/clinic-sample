'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInventory, fetchSuppliers } from '@/lib/authActions';
import { Plus, Download, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Medication {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  dosage_form: string;
  strength: string;
  barcode: string;
  shelf_location: string;
  unit_price: number;
  reorder_level: number;
  supplier_id: string;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  batches: {
    id: string;
    medication_id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    unit_price: number;
    created_at: string | null;
    updated_at: string | null;
  }[];
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function StockAlertsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'expiring'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'expiry'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const LOW_STOCK_THRESHOLD = 10; // You can adjust this value based on your needs

  useEffect(() => {
    const loadData = async () => {
      try {
        const [inventoryData, suppliersData] = await Promise.all([
          fetchInventory(),
          fetchSuppliers()
        ]);
        setSuppliers(suppliersData);
        setMedications(inventoryData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getFilteredAndSortedMedications = () => {
    const filtered = medications.filter(med => {
      const totalStock = med.batches.reduce((sum, batch) => sum + batch.quantity, 0);
      const hasExpiringBatches = med.batches.some(batch => {
        const expiryDate = new Date(batch.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30;
      });

      const matchesFilter = 
        filter === 'all' || 
        (filter === 'low-stock' && totalStock <= LOW_STOCK_THRESHOLD) ||
        (filter === 'expiring' && hasExpiringBatches);

      const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          med.category.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFilter && matchesSearch;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (sortBy === 'stock') {
        const aStock = a.batches.reduce((sum, batch) => sum + batch.quantity, 0);
        const bStock = b.batches.reduce((sum, batch) => sum + batch.quantity, 0);
        return sortOrder === 'asc' ? aStock - bStock : bStock - aStock;
      }
      
      if (sortBy === 'expiry') {
        const aEarliestExpiry = Math.min(...a.batches.map(batch => new Date(batch.expiry_date).getTime()));
        const bEarliestExpiry = Math.min(...b.batches.map(batch => new Date(batch.expiry_date).getTime()));
        return sortOrder === 'asc' ? aEarliestExpiry - bEarliestExpiry : bEarliestExpiry - aEarliestExpiry;
      }
      
      return 0;
    });

    return filtered;
  };

  const handleExport = () => {
    const data = getFilteredAndSortedMedications().map(med => {
      const totalStock = med.batches.reduce((sum, batch) => sum + batch.quantity, 0);
      const expiringBatches = med.batches.filter(batch => {
        const expiryDate = new Date(batch.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30;
      });
      const supplier = suppliers.find(s => s.id === med.supplier_id);

      return {
        'Medication Name': med.name,
        'Category': med.category,
        'Current Stock': totalStock,
        'Low Stock Threshold': LOW_STOCK_THRESHOLD,
        'Supplier': supplier?.name || 'N/A',
        'Supplier Contact': supplier ? `${supplier.contact_person} (${supplier.phone})` : 'N/A',
        'Expiring Batches': expiringBatches.map(batch => 
          `Batch ${batch.batch_number}: ${batch.quantity} units (Expires ${format(new Date(batch.expiry_date), 'MMM d, yyyy')})`
        ).join('; '),
        'Low Stock': totalStock <= LOW_STOCK_THRESHOLD ? 'Yes' : 'No'
      };
    });

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock-alerts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Alerts</h1>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push('/pharmacy/inventory/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Item
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search medications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filter} onValueChange={(value: 'all' | 'low-stock' | 'expiring') => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alerts</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: 'name' | 'stock' | 'expiry') => setSortBy(value)}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="stock">Stock Level</SelectItem>
            <SelectItem value="expiry">Expiry Date</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6">
        {getFilteredAndSortedMedications().map((medication) => {
          const totalStock = medication.batches.reduce((sum, batch) => sum + batch.quantity, 0);
          const expiringBatches = medication.batches.filter(batch => {
            const expiryDate = new Date(batch.expiry_date);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 30;
          });
          const supplier = suppliers.find(s => s.id === medication.supplier_id);

          return (
            <Card key={medication.id} className="bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {medication.name}
                </CardTitle>
                <div className="flex gap-2">
                  {totalStock <= LOW_STOCK_THRESHOLD && (
                    <Badge variant="destructive" className="text-[10px]">
                      Low Stock
                    </Badge>
                  )}
                  {expiringBatches.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      Expiring Soon
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] text-gray-500 mb-2">
                  {medication.category} • {medication.manufacturer}
                </div>
                <div className="text-[10px] text-gray-500 mb-2">
                  Current Stock: {totalStock} • Low Stock Threshold: {LOW_STOCK_THRESHOLD}
                </div>
                {supplier && (
                  <div className="text-[10px] text-gray-500 mb-2">
                    Supplier: {supplier.name} • Contact: {supplier.contact_person} ({supplier.phone})
                  </div>
                )}
                {expiringBatches.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium text-gray-900 mb-1">Expiring Batches:</p>
                    <div className="space-y-1">
                      {expiringBatches.map(batch => (
                        <div key={batch.id} className="text-[10px] text-gray-500">
                          Batch {batch.batch_number}: {batch.quantity} units • Expires {format(new Date(batch.expiry_date), 'MMM d, yyyy')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6"
                    onClick={() => router.push(`/pharmacy/inventory/${medication.id}/batches`)}
                  >
                    Manage Batches
                  </Button>
                  {supplier && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-6"
                      onClick={() => window.location.href = `mailto:${supplier.email}`}
                    >
                      Contact Supplier
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 