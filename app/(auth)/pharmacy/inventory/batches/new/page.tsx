'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addBatch, fetchInventory } from '@/lib/inventory';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function NewBatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [medicationDetails, setMedicationDetails] = useState<{
    name: string;
    category: string;
    dosage_form: string;
    strength: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    medication_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: 0,
    purchase_price: 0,
    unit_price: 0
  });

  useEffect(() => {
    const medicationId = searchParams.get('medication_id');
    if (medicationId) {
      setFormData(prev => ({ ...prev, medication_id: medicationId }));
      // Fetch medication details
      const fetchMedicationDetails = async () => {
        try {
          const medications = await fetchInventory();
          const medication = medications.find(m => m.id === medicationId);
          if (medication) {
            setMedicationDetails({
              name: medication.name,
              category: medication.category,
              dosage_form: medication.dosage_form,
              strength: medication.strength
            });
          }
        } catch (error) {
          console.error('Error fetching medication details:', error);
        }
      };
      fetchMedicationDetails();
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that purchase_price is less than unit_price
    if (formData.purchase_price >= formData.unit_price) {
      toast.error('Purchase price must be less than unit price');
      return;
    }

    setLoading(true);

    try {
      await addBatch(formData);
      toast.success('Batch added successfully');
      const returnUrl = searchParams.get('return_url') || '/pharmacy/inventory';
      router.push(returnUrl);
    } catch (error) {
      console.error('Error adding batch:', error);
      toast.error('Failed to add batch');
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
            <div>
              <CardTitle className="text-2xl font-bold">
                Add New Batch
              </CardTitle>
              {medicationDetails && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p className="font-medium">{medicationDetails.name}</p>
                  <p>{medicationDetails.strength} • {medicationDetails.dosage_form}</p>
                  <p className="text-xs">{medicationDetails.category}</p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_number">Batch Number</Label>
                <Input
                  id="batch_number"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  required
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase Price</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({
                    ...formData,
                    purchase_price: parseFloat(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_price">Selling Price</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.unit_price}
                  onChange={(e) => setFormData({
                    ...formData,
                    unit_price: parseFloat(e.target.value)
                  })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
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