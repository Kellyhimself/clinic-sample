'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { manageInventory } from '@/lib/authActions';
import { toast } from 'sonner';

interface InventoryFormProps {
  initialData?: {
    id: string;
    name: string;
    category: string;
    manufacturer: string;
    dosage_form: string;
    strength: string;
    barcode: string;
    shelf_location: string;
    unit_price: number;
    supplier_id?: string;
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    batches: {
      id: string;
      batch_number: string;
      expiry_date: string;
      quantity: number;
      unit_price: number;
    }[];
  };
}

export default function InventoryForm({ initialData }: InventoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || '',
    manufacturer: initialData?.manufacturer || '',
    dosage_form: initialData?.dosage_form || '',
    strength: initialData?.strength || '',
    barcode: initialData?.barcode || '',
    shelf_location: initialData?.shelf_location || '',
    unit_price: initialData?.unit_price || 0,
    supplier_id: initialData?.supplier_id || '',
    description: initialData?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await manageInventory({
        ...formData,
        medication_id: initialData?.id,
      });

      toast.success(initialData ? 'Medication updated successfully' : 'Medication added successfully');
      router.push('/pharmacy/inventory');
    } catch (error) {
      toast.error('Failed to save medication');
      console.error('Error saving medication:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialData ? 'Edit Medication' : 'Add New Medication'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-gray-700">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-8 text-xs border-gray-300 focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs text-gray-700">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tablet">Tablets</SelectItem>
                  <SelectItem value="capsule">Capsules</SelectItem>
                  <SelectItem value="syrup">Syrups</SelectItem>
                  <SelectItem value="injection">Injections</SelectItem>
                  <SelectItem value="cream">Creams</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer" className="text-xs text-gray-700">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="h-8 text-xs border-gray-300 focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dosage_form" className="text-xs text-gray-700">Dosage Form</Label>
              <Input
                id="dosage_form"
                value={formData.dosage_form}
                onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                className="h-8 text-xs border-gray-300 focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strength" className="text-xs text-gray-700">Strength</Label>
              <Input
                id="strength"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                className="h-8 text-xs border-gray-300 focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode" className="text-xs text-gray-700">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="h-8 text-xs border-gray-300 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shelf_location" className="text-xs text-gray-700">Shelf Location</Label>
              <Input
                id="shelf_location"
                value={formData.shelf_location}
                onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                className="h-8 text-xs border-gray-300 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price" className="text-xs text-gray-700">Unit Price (KSh)</Label>
              <Input
                id="unit_price"
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                className="h-8 text-xs border-gray-300 focus:border-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_id" className="text-xs text-gray-700">Supplier ID</Label>
              <Input
                id="supplier_id"
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="h-8 text-xs border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs text-gray-700">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="h-16 text-xs border-gray-300 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-8 text-xs bg-blue-500 hover:bg-blue-600 text-white"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 