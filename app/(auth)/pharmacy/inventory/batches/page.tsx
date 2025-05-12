'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchInventory, fetchSuppliers, addBatch } from '@/lib/inventory';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Medication, Supplier } from '@/types/supabase';

export default function BatchManagementPage() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedMedicationId, setSelectedMedicationId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [medicationsData, suppliersData] = await Promise.all([
        fetchInventory(),
        fetchSuppliers()
      ]);
      setMedications(medicationsData);
      setSuppliers(suppliersData || []);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error('Error fetching data:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicationId || !batchNumber || !expiryDate || !quantity || !unitPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await addBatch({
        medication_id: selectedMedicationId,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        quantity: parseInt(quantity),
        unit_price: parseFloat(unitPrice),
      });

      toast.success('Batch added successfully');
      // Reset form
      setSelectedMedicationId('');
      setSelectedSupplierId('');
      setBatchNumber('');
      setExpiryDate('');
      setQuantity('');
      setUnitPrice('');
      // Refresh data
      fetchData();
    } catch (error) {
      toast.error('Failed to add batch');
      console.error('Error adding batch:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Batch Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medication">Medication</Label>
                <Select
                  value={selectedMedicationId}
                  onValueChange={setSelectedMedicationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medication" />
                  </SelectTrigger>
                  <SelectContent>
                    {medications.map((med) => (
                      <SelectItem key={med.id} value={med.id}>
                        {med.name} ({med.dosage_form} {med.strength})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier (Optional)</Label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input
                  id="batchNumber"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Batch'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 