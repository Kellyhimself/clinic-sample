// components/pharmacy/AddMedicationForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AddMedicationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    batch_no: '',
    category: '',
    supplier_id: '',
    description: '',
    unit_price: 0,
    quantity_in_stock: 0,
    expiry_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
    const response = await fetch('/api/pharmacy/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, is_active: true }),
    });

    if (response.ok) {
        toast.success('Medication added successfully');
      setFormData({
        name: '',
        batch_no: '',
        category: '',
        supplier_id: '',
        description: '',
        unit_price: 0,
        quantity_in_stock: 0,
        expiry_date: '',
      });
        
        // Redirect to inventory page after 2 seconds
        setTimeout(() => {
          router.push('/pharmacy/inventory');
        }, 2000);
    } else {
      const { error } = await response.json();
        throw new Error(error || 'Failed to add medication');
      }
    } catch (error) {
      console.error('Error adding medication:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 sm:p-6">
      <Card className="max-w-2xl mx-auto shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl font-bold">Add New Medication</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Medication Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Medication Name</Label>
                <Input
                  id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
          required
        />
      </div>

              {/* Batch Number */}
              <div className="space-y-2">
                <Label htmlFor="batch_no">Batch Number</Label>
                <Input
                  id="batch_no"
          type="text"
          value={formData.batch_no}
          onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
          type="text"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

              {/* Supplier ID */}
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Supplier ID</Label>
                <Input
                  id="supplier_id"
          type="text"
          value={formData.supplier_id}
          onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>

              {/* Unit Price */}
              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (KSh)</Label>
                <Input
                  id="unit_price"
          type="number"
          value={formData.unit_price}
          onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
          required
          min="0"
          step="0.01"
        />
      </div>

              {/* Quantity in Stock */}
              <div className="space-y-2">
                <Label htmlFor="quantity_in_stock">Quantity in Stock</Label>
                <Input
                  id="quantity_in_stock"
          type="number"
          value={formData.quantity_in_stock}
          onChange={(e) => setFormData({ ...formData, quantity_in_stock: Number(e.target.value) })}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
          required
          min="0"
        />
      </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
          type="date"
          value={formData.expiry_date}
          onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 min-h-[100px]"
        />
      </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              >
                {isSubmitting ? "Processing..." : "Add Medication"}
              </Button>
            </div>
    </form>
        </CardContent>
      </Card>
    </div>
  );
}