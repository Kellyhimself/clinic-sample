'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  manufacturer?: string;
  barcode?: string;
  shelf_location?: string;
  supplier_id?: string;
}

export default function InventoryForm({ initialData }: InventoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'basic' | 'details' | 'review'>('basic');
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    category: initialData?.category || '',
    dosage_form: initialData?.dosage_form || '',
    strength: initialData?.strength || '',
    description: initialData?.description || '',
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
      manufacturer: '',
      barcode: '',
      shelf_location: '',
      supplier_id: ''
    });
    setCurrentStep('basic');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
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
      toast.error('Failed to save medication');
      console.error('Error saving medication:', error);
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
              <span className="text-xs text-gray-500">* Required fields</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">
                  Medication Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  placeholder="Enter medication name"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">
                  Category <span className="text-red-500">*</span>
                </Label>
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
                <Label className="text-xs text-gray-700">
                  Dosage Form <span className="text-red-500">*</span>
                </Label>
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
              <span className="text-xs text-gray-500">Optional fields</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">
                  Strength <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="strength"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  placeholder="e.g., 500mg, 10ml"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">
                  Manufacturer <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  placeholder="Enter manufacturer name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">
                  Barcode <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  placeholder="Enter barcode number"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">
                  Shelf Location <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input
                  id="shelf_location"
                  value={formData.shelf_location}
                  onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  placeholder="Enter shelf location"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-700">
                  Supplier ID <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input
                  id="supplier_id"
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  placeholder="Enter supplier ID"
                />
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
                <h3 className="font-medium mb-2 text-gray-800">Required Information</h3>
                <div className="text-sm space-y-1 text-gray-600">
                  <p><span className="font-medium text-gray-800">Name:</span> {formData.name}</p>
                  <p><span className="font-medium text-gray-800">Category:</span> {formData.category}</p>
                  <p><span className="font-medium text-gray-800">Dosage Form:</span> {formData.dosage_form}</p>
                  <p><span className="font-medium text-gray-800">Strength:</span> {formData.strength}</p>
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <h3 className="font-medium text-gray-800">Optional Details</h3>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border-t">
                  <div className="text-sm space-y-1 text-gray-600">
                    <p><span className="font-medium text-gray-800">Manufacturer:</span> {formData.manufacturer || 'Not specified'}</p>
                    <p><span className="font-medium text-gray-800">Barcode:</span> {formData.barcode || 'Not specified'}</p>
                    <p><span className="font-medium text-gray-800">Shelf Location:</span> {formData.shelf_location || 'Not specified'}</p>
                    <p><span className="font-medium text-gray-800">Supplier ID:</span> {formData.supplier_id || 'Not specified'}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-1">
                <Label className="text-xs text-gray-700">
                  Description <span className="text-gray-400">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  placeholder="Enter any additional details about the medication"
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
              {['basic', 'details', 'review'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      currentStep === step
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : ['basic', 'details', 'review'].indexOf(currentStep) > index
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < 2 && (
                    <div
                      className={`w-12 h-0.5 ${
                        ['basic', 'details', 'review'].indexOf(currentStep) > index 
                          ? 'bg-gradient-to-r from-green-500 to-green-600' 
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="mt-4">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-6 flex justify-between">
            {currentStep !== 'basic' && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep === 'review' ? 'details' : 'basic')}
                className="bg-white"
              >
                Previous
              </Button>
            )}
            <div className="flex-1" />
            {currentStep !== 'review' ? (
              <Button
                onClick={() => setCurrentStep(currentStep === 'basic' ? 'details' : 'review')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              >
                {isSubmitting ? 'Saving...' : initialData ? 'Update Medication' : 'Add Medication'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}