'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { fetchInventory, deleteBatch } from '@/lib/authActions';
import { toast } from 'sonner';
import { Search, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

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
  const [stockFilter] = useState('all');

  const LOW_STOCK_THRESHOLD = 10; // You can adjust this value based on your needs

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchInventory();
        setMedications(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch inventory');
        console.error('Error fetching inventory:', err);
      } finally {
        setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2">
        <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg p-2">
          <p className="text-xs text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2">
        <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg p-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2 md:p-4 mobile-container">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-2 md:p-4 border-b flex flex-col sm:flex-row gap-2 md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs border-gray-300 focus:border-blue-500"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value)}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs border-gray-300 focus:border-blue-500">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mobile-scrollable">
          <Table className="mobile-table mobile-table-compact">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="mobile-text-xs text-xs md:text-sm font-medium text-gray-700 mobile-table-cell">Name</TableHead>
                <TableHead className="mobile-text-xs text-xs md:text-sm font-medium text-gray-700 hidden sm:table-cell mobile-table-cell">Category</TableHead>
                <TableHead className="mobile-text-xs text-xs md:text-sm font-medium text-gray-700 hidden sm:table-cell mobile-table-cell">Dosage Form</TableHead>
                <TableHead className="mobile-text-xs text-xs md:text-sm font-medium text-gray-700 hidden sm:table-cell mobile-table-cell">Strength</TableHead>
                <TableHead className="mobile-text-xs text-xs md:text-sm font-medium text-gray-700 mobile-table-cell">Unit Price</TableHead>
                <TableHead className="mobile-text-xs text-xs md:text-sm font-medium text-gray-700 mobile-table-cell">Stock</TableHead>
                <TableHead className="mobile-text-xs text-xs md:text-sm font-medium text-gray-700 mobile-table-cell">Status</TableHead>
                <TableHead className="mobile-text-xs text-xs md:text-sm font-medium text-gray-700 mobile-table-cell w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedications.map((medication) => (
                <TableRow key={medication.id} className="hover:bg-gray-100">
                  <TableCell className="mobile-text-xs text-xs md:text-sm text-gray-900 mobile-table-cell">
                    <div>
                      <div className="font-medium">{medication.name}</div>
                      <div className="mobile-text-xs text-[10px] md:text-xs text-gray-500 sm:hidden">
                        {medication.category} • {medication.dosage_form} {medication.strength}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="mobile-text-xs text-xs md:text-sm text-gray-900 hidden sm:table-cell mobile-table-cell">{medication.category}</TableCell>
                  <TableCell className="mobile-text-xs text-xs md:text-sm text-gray-900 hidden sm:table-cell mobile-table-cell">{medication.dosage_form}</TableCell>
                  <TableCell className="mobile-text-xs text-xs md:text-sm text-gray-900 hidden sm:table-cell mobile-table-cell">{medication.strength}</TableCell>
                  <TableCell className="mobile-text-xs text-xs md:text-sm text-gray-900 mobile-table-cell">
                    KSh {medication.unit_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="mobile-text-xs text-[10px] md:text-xs mobile-table-cell">
                    {medication.batches.reduce((sum, batch) => sum + batch.quantity, 0)}
                  </TableCell>
                  <TableCell className="mobile-text-xs text-[10px] md:text-xs mobile-table-cell">
                    {medication.batches.some(batch => new Date(batch.expiry_date) < new Date()) ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="mobile-text-xs text-[10px] md:text-xs bg-red-100 text-red-800 border-red-200">Expired</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBatch(medication.batches.find(b => new Date(b.expiry_date) < new Date())?.id || '')}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    ) : medication.batches.some(batch => {
                      const expiryDate = new Date(batch.expiry_date);
                      const today = new Date();
                      const diffTime = expiryDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays <= 30;
                    }) ? (
                      <Badge variant="secondary" className="mobile-text-xs text-[10px] md:text-xs bg-yellow-100 text-yellow-800 border-yellow-200">Expiring</Badge>
                    ) : medication.batches.reduce((sum, batch) => sum + batch.quantity, 0) <= LOW_STOCK_THRESHOLD ? (
                      <Badge variant="secondary" className="mobile-text-xs text-[10px] md:text-xs bg-orange-100 text-orange-800 border-orange-200">Low</Badge>
                    ) : (
                      <Badge variant="default" className="mobile-text-xs text-[10px] md:text-xs bg-green-100 text-green-800 border-green-200">Good</Badge>
                    )}
                  </TableCell>
                  <TableCell className="mobile-table-cell p-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="cursor-pointer text-blue-600" 
                          onClick={() => handleAddBatch(medication.id)}
                        >
                          Add Batch
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer text-green-600" 
                          onClick={() => router.push(`/pharmacy/inventory/${medication.id}/batches`)}
                        >
                          View Batches
                        </DropdownMenuItem>
                        {medication.batches.some(batch => new Date(batch.expiry_date) < new Date()) && (
                          <DropdownMenuItem 
                            className="cursor-pointer text-red-600" 
                            onClick={() => handleDeleteBatch(medication.batches.find(b => new Date(b.expiry_date) < new Date())?.id || '')}
                          >
                            Delete Expired
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
} 