'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UsageLimitAlert } from '@/components/shared/UsageLimitAlert';
import { useUsageLimits } from '@/app/lib/hooks/useUsageLimits';
import { LimitAwareButton } from '@/components/shared/LimitAwareButton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { manageInventory } from '@/lib/inventory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Predefined options for dropdowns
const CATEGORIES = [
  'Antibiotics',
  'Analgesics',
  'Antacids',
  'Antihistamines',
  'Antihypertensives',
  'Antidiabetics',
  'Anticoagulants',
  'Antidepressants',
  'Antipsychotics',
  'Other'
];

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Liquid',
  'Injection',
  'Cream',
  'Ointment',
  'Inhaler',
  'Patch',
  'Drops',
  'Other'
];

interface InventoryFormProps {
  initialData?: {
    id?: string;
    name: string;
    category: string;
    manufacturer?: string;
    dosage_form: string;
    strength: string;
    barcode?: string;
    shelf_location?: string;
    supplier_id?: string;
    description?: string;
    unit_price?: number;
    purchase_price?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    batches?: Array<{
      id: string;
      quantity: number;
      expiry_date: string;
    }>;
  };
}

interface FormData {
  name: string;
  category: string;
  dosage_form: string;
  strength: string;
  description: string;
  unit_price: number;
  purchase_price: number;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  manufacturer?: string;
  barcode?: string;
  shelf_location?: string;
  supplier_id?: string;
}

export default function InventoryForm({ initialData }: InventoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { checkUsage, limits } = useUsageLimits();
  const [currentStep, setCurrentStep] = useState<'basic' | 'details' | 'pricing' | 'review'>('basic');
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    category: initialData?.category || '',
    dosage_form: initialData?.dosage_form || '',
    strength: initialData?.strength || '',
    description: initialData?.description || '',
    unit_price: initialData?.unit_price || 0,
    purchase_price: initialData?.purchase_price || 0,
    batch_number: '',
    expiry_date: '',
    quantity: 0,
    manufacturer: initialData?.manufacturer || '',
    barcode: initialData?.barcode || '',
    shelf_location: initialData?.shelf_location || '',
    supplier_id: initialData?.supplier_id || ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      dosage_form: '',
      strength: '',
      description: '',
      unit_price: 0,
      purchase_price: 0,
      batch_number: '',
      expiry_date: '',
      quantity: 0,
      manufacturer: '',
      barcode: '',
      shelf_location: '',
      supplier_id: ''
    });
    setCurrentStep('basic');
  };

  // Check inventory limit on component mount
  useEffect(() => {
    checkUsage('inventory');
  }, [checkUsage]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Check limit again before submitting
      const limit = await checkUsage('inventory');
      if (!limit.isWithinLimit) {
        toast.error('Inventory limit reached', {
          description: `You have reached your inventory limit of ${limit.limit} items. Please upgrade your plan to add more items.`
        });
        return;
      }

      await manageInventory({
        ...formData,
        medication_id: initialData?.id,
        unit_price: 0, // Default value for new items
        purchase_price: 0, // Default value for new items
      });

      toast.success(initialData ? 'Medication updated successfully' : 'Medication added successfully');
      
      if (initialData) {
        router.push('/pharmacy/inventory');
      } else {
        resetForm();
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Inventory limit reached')) {
        toast.error('Inventory limit reached', {
          description: error.message
        });
      } else {
        toast.error('Failed to save medication');
        console.error('Error saving medication:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Medication Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Dosage Form *</Label>
                <Select
                  value={formData.dosage_form}
                  onValueChange={(value) => setFormData({ ...formData, dosage_form: value })}
                >
                  <SelectTrigger className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <SelectValue placeholder="Select dosage form" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOSAGE_FORMS.map((form) => (
                      <SelectItem key={form} value={form}>
                        {form}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Additional Details</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Strength *</Label>
                <Input
                  id="strength"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                />
              </div>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Location & Supplier</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Shelf Location</Label>
                <Input
                  id="shelf_location"
                  value={formData.shelf_location}
                  onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Supplier ID</Label>
                <Input
                  id="supplier_id"
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Pricing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    name="purchase_price"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Review & Submit</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <h3 className="font-medium mb-2 text-gray-800">Basic Information</h3>
                <div className="text-sm space-y-1 text-gray-600">
                  <p><span className="font-medium text-gray-800">Name:</span> {formData.name}</p>
                  <p><span className="font-medium text-gray-800">Category:</span> {formData.category}</p>
                  <p><span className="font-medium text-gray-800">Dosage Form:</span> {formData.dosage_form}</p>
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <h3 className="font-medium text-gray-800">Additional Details</h3>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border-t">
                  <div className="text-sm space-y-1 text-gray-600">
                    <p><span className="font-medium text-gray-800">Strength:</span> {formData.strength}</p>
                    <p><span className="font-medium text-gray-800">Manufacturer:</span> {formData.manufacturer || 'N/A'}</p>
                    <p><span className="font-medium text-gray-800">Barcode:</span> {formData.barcode || 'N/A'}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <h3 className="font-medium text-gray-800">Location & Supplier</h3>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border-t">
                  <div className="text-sm space-y-1 text-gray-600">
                    <p><span className="font-medium text-gray-800">Shelf Location:</span> {formData.shelf_location || 'N/A'}</p>
                    <p><span className="font-medium text-gray-800">Supplier ID:</span> {formData.supplier_id || 'N/A'}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-1">
                <Label className="text-xs text-gray-700">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2">
      <div className="w-full max-w-[1400px] mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-6 w-6"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <h2 className="text-sm font-semibold text-gray-800">
              {initialData ? 'Edit Medication' : 'Add New Medication'}
            </h2>
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {initialData ? 'Update medication details' : 'Add a new medication to inventory'}
          </div>
        </div>

        <div className="p-4">
          {/* Step Indicator */}
          <div className="flex justify-center mb-3">
            <div className="flex items-center space-x-1">
              {['basic', 'details', 'pricing', 'review'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      currentStep === step
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : ['basic', 'details', 'pricing', 'review'].indexOf(currentStep) > index
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div
                      className={`w-12 h-0.5 ${
                        ['basic', 'details', 'pricing', 'review'].indexOf(currentStep) > index 
                          ? 'bg-gradient-to-r from-green-500 to-green-600' 
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left Column - Form Steps */}
            <div className="lg:col-span-3 space-y-4">
              {limits.inventory && !limits.inventory.isWithinLimit && (
                <UsageLimitAlert
                  limit={{
                    type: 'inventory',
                    current: limits.inventory.current,
                    limit: limits.inventory.limit,
                    isWithinLimit: limits.inventory.isWithinLimit
                  }}
                />
              )}
              {renderStepContent()}
            </div>

            {/* Right Column - Summary and Buttons */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-xs text-gray-800">Medication Summary</h3>
                <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Name:</span> {formData.name || 'Not set'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Category:</span> {formData.category || 'Not set'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Dosage Form:</span> {formData.dosage_form || 'Not set'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Strength:</span> {formData.strength || 'Not set'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col space-y-2">
                {currentStep !== 'basic' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep === 'review' ? 'pricing' : 
                      currentStep === 'pricing' ? 'details' : 'basic')}
                    className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </Button>
                )}
                {currentStep === 'review' ? (
                  <LimitAwareButton
                    type="submit"
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                    disabled={isSubmitting}
                    limitType="inventory"
                    loading={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : initialData ? 'Update Medication' : 'Add Medication'}
                  </LimitAwareButton>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(
                      currentStep === 'basic' ? 'details' :
                      currentStep === 'details' ? 'pricing' : 'review'
                    )}
                    disabled={
                      (currentStep === 'basic' && (!formData.name || !formData.category || !formData.dosage_form)) ||
                      (currentStep === 'details' && !formData.strength) ||
                      (currentStep === 'pricing' && (!formData.unit_price || !formData.purchase_price))
                    }
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 