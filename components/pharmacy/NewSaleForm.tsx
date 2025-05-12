"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSale } from "@/lib/newSale";
import { getOrCreateQuickSalePatient } from "@/lib/patients";
import type { Patient, Medication } from "@/types/supabase";
import { ArrowLeft } from "lucide-react";
import GuestPatientDialog from '@/components/GuestPatientDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { processCashPayment, processMpesaPayment } from "@/lib/cashier";
import ReceiptDialog from '@/components/shared/sales/ReceiptDialog';
import { LimitAwareButton } from '@/components/shared/LimitAwareButton';
import { useUsageLimits } from '@/app/lib/hooks/useUsageLimits';


interface SaleItem {
  medication_id: string;
  batch_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  medication: Medication;
  batch: {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    unit_price: number;
  };
}

interface NewSaleFormProps {
  initialPatients?: Patient[];
  initialMedications?: Medication[];
  AddGuestButton?: React.ComponentType<{
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    limitType?: string;
    children?: React.ReactNode;
  }>;
}

export default function NewSaleForm({ 
  initialPatients = [], 
  initialMedications = [],
  AddGuestButton = Button 
}: NewSaleFormProps) {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(initialPatients);
  const [filteredMedications, setFilteredMedications] = useState<Medication[]>(initialMedications);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickSale, setIsQuickSale] = useState(false);
  const [currentStep, setCurrentStep] = useState<'patient' | 'medication' | 'batch' | 'payment'>('patient');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'insurance'>('cash');
  const [error, setError] = useState<string | null>(null);
  const [showMpesaDialog, setShowMpesaDialog] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string | null>(null);
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const {loading: limitsLoading } = useUsageLimits();

  // Filter patients based on search query
  useEffect(() => {
    if (!initialPatients) {
      setFilteredPatients([]);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setFilteredPatients(initialPatients);
      return;
    }

    const filtered = initialPatients.filter(patient => {
      const nameMatch = patient.full_name?.toLowerCase().includes(query);
      const phoneMatch = patient.phone_number?.toLowerCase().includes(query);
      return nameMatch || phoneMatch;
    });

    setFilteredPatients(filtered);
  }, [searchQuery, initialPatients]);

  // Filter medications based on search query
  useEffect(() => {
    const filterMedications = () => {
    if (searchQuery.trim()) {
      const filtered = initialMedications.filter(medication =>
        medication.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medication.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
        return filtered;
      }
      return initialMedications;
    };

    const filtered = filterMedications();
    if (JSON.stringify(filtered) !== JSON.stringify(filteredMedications)) {
      setFilteredMedications(filtered);
    }
  }, [searchQuery, initialMedications]);

  // Update the effect to handle limit checking
  useEffect(() => {
    if (currentStep === 'payment') {
      setIsCheckingLimits(true);
      // Set isCheckingLimits to false after a short delay to allow the limits to be checked
      const timer = setTimeout(() => {
        setIsCheckingLimits(false);
      }, 500); // Small delay to ensure smooth transition
      return () => clearTimeout(timer);
    } else {
      setIsCheckingLimits(false);
    }
  }, [currentStep]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery("");
    setCurrentStep('medication');
  };

  const handleMedicationSelect = (medication: Medication) => {
    setSelectedMedication(medication);
    setSearchQuery("");
    setCurrentStep('batch');
  };

  const handleAddItem = () => {
    if (!selectedMedication || !selectedBatchId || quantity < 1) {
      toast.error("Please select a medication, batch, and quantity");
      return;
    }

    const batch = selectedMedication.batches?.find((b: { id: string }) => b.id === selectedBatchId);
    if (!batch) {
      toast.error("Selected batch not found");
      return;
    }

    if (batch.quantity < quantity) {
      toast.error(`Insufficient stock. Only ${batch.quantity} units available`);
      return;
    }

    const newItem: SaleItem = {
      medication_id: selectedMedication.id,
      batch_id: batch.id,
      quantity,
      unit_price: batch.unit_price,
      total_price: quantity * batch.unit_price,
      medication: selectedMedication,
      batch
    };

    setItems([...items, newItem]);
    setSelectedMedication(null);
    setSelectedBatchId("");
    setQuantity(1);
    setSearchQuery("");
    setCurrentStep('medication');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("Item removed from cart");
  };

  const handleGuestPatientCreated = async (patient: Patient) => {
    try {
      // Validate the patient data
      if (!patient || !patient.id || !patient.full_name) {
        throw new Error('Invalid patient data received');
      }

      // Ensure the patient is marked as a guest with correct type
      const guestPatient: Patient = {
        ...patient,
        patient_type: 'guest' as const
      };
      
     
      
      setSelectedPatient(guestPatient);
      setSearchQuery("");
      setCurrentStep('medication');
      toast.success(`New guest patient ${guestPatient.full_name} created and selected`);
    } catch (error) {
      console.error("Error processing guest patient:", error);
      toast.error("Error processing guest patient. Please try again.");
    }
  };

  const handleQuickSale = () => {
    setIsQuickSale(true);
    setCurrentStep('medication');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate totals
      const medicationTotal = items.reduce((sum, item) => sum + item.total_price, 0);
      const appointmentTotal = 0; // Quick sales don't include appointments
      const grandTotal = medicationTotal + appointmentTotal;

      let patientId = selectedPatient?.id;

      // For quick sales, get or create the quick sale patient
      if (isQuickSale) {
        const quickSaleResult = await getOrCreateQuickSalePatient();
        
        if (!quickSaleResult.success || !quickSaleResult.patient) {
          throw new Error('Failed to get or create quick sale patient');
        }

        patientId = quickSaleResult.patient.id;
      }

      // Prepare sale data
      const saleData = {
        patient_id: patientId,
        items: items.map(item => ({
          medication_id: item.medication_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        payment_method: paymentMethod,
        payment_status: 'unpaid', // Always start as unpaid
        total_amount: grandTotal
      };

      // Create the sale
      const result = await createSale(saleData);
      
      if (result.success) {
        setCurrentSaleId(result.data.id);
        
        if (isQuickSale) {
          // For quick sales, process payment immediately
          const formData = new FormData();
          formData.append('id', result.data.id);
          formData.append('type', 'sale');
          formData.append('amount', grandTotal.toString());

          if (paymentMethod === 'cash') {
            formData.append('receiptNumber', `CASH-${Date.now()}`);
            await processCashPayment(formData);
            
            // Generate receipt using the same format as cashier page
            const receipt = `
==========================================
           PHARMACY RECEIPT
==========================================
Date: ${new Date().toLocaleString()}
Receipt #: ${result.data.id}
Payment Method: ${paymentMethod.toUpperCase()}
Payment Status: PAID
Sale Type: Quick Sale
------------------------------------------
ITEMS:
${items.map((item, index) => `
${index + 1}. ${item.medication.name}
   Batch: ${item.batch.batch_number}
   Quantity: ${item.quantity} x ${item.unit_price.toFixed(2)}
   Subtotal: ${item.total_price.toFixed(2)}
`).join('')}
------------------------------------------
TOTAL AMOUNT: ${grandTotal.toFixed(2)}
==========================================
Thank you for your business!
==========================================
`;

            setReceiptContent(receipt);
            setShowReceipt(true);
            toast.success("Quick sale completed successfully");
          } else if (paymentMethod === 'mpesa') {
            // For M-PESA, we need to show a phone number input
            setShowMpesaDialog(true);
            return; // Don't complete the sale yet
          }
        } else {
          // For regular sales, just show success message
          toast.success("Sale submitted successfully. Payment can be processed at the cashier.");
        }

        // Reset form
        setItems([]);
        setSelectedPatient(null);
        setIsQuickSale(false);
        setCurrentStep('patient');
        setPaymentMethod('cash');
        setCurrentSaleId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMpesaPayment = async (phoneNumber: string) => {
    if (!currentSaleId) {
      setError('No active sale found');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('id', currentSaleId);
      formData.append('type', 'sale');
      formData.append('amount', items.reduce((sum, item) => sum + item.total_price, 0).toString());
      formData.append('phone', phoneNumber);

      const { success } = await processMpesaPayment(formData);
      
      if (success) {
        toast.success("M-PESA payment initiated. Please check your phone.");
        
        // Generate receipt using the same format as cashier page
        const receipt = `
==========================================
           PHARMACY RECEIPT
==========================================
Date: ${new Date().toLocaleString()}
Receipt #: ${currentSaleId}
Payment Method: MPESA
Payment Status: PENDING
------------------------------------------
ITEMS:
${items.map((item, index) => `
${index + 1}. ${item.medication.name}
   Batch: ${item.batch.batch_number}
   Quantity: ${item.quantity} x ${item.unit_price.toFixed(2)}
   Subtotal: ${item.total_price.toFixed(2)}
`).join('')}
------------------------------------------
TOTAL AMOUNT: ${items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
==========================================
Thank you for your business!
==========================================
`;

        // Create and download receipt file
        const blob = new Blob([receipt], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${currentSaleId}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Reset form
        setItems([]);
        setSelectedPatient(null);
        setIsQuickSale(false);
        setCurrentStep('patient');
        setPaymentMethod('cash');
        setShowMpesaDialog(false);
        setCurrentSaleId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const calculateTotals = () => {
    const pharmacyTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    return { pharmacyTotal };
  };

  const { pharmacyTotal } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2">
      <div className="w-full max-w-[1400px] mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-6 w-6"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <h2 className="text-sm font-semibold">New Sale</h2>
          </div>
          {selectedPatient && !isQuickSale && (
            <div className="mt-1 text-xs text-gray-600">
              Patient: {selectedPatient.full_name}
            </div>
          )}
          {isQuickSale && (
            <div className="mt-1 text-xs text-amber-600">
              Quick Sale (No Patient Details)
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Step Indicator */}
          <div className="flex justify-center mb-3">
            <div className="flex items-center space-x-1">
              {['patient', 'medication', 'batch', 'payment'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      currentStep === step
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : ['patient', 'medication', 'batch', 'payment'].indexOf(currentStep) > index
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div
                      className={`w-12 h-0.5 ${
                        ['patient', 'medication', 'batch', 'payment'].indexOf(currentStep) > index 
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
              {/* Step Content */}
              <div className="space-y-2">
                {currentStep === 'patient' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold">Select Patient</h2>
                      <div className="space-x-2">
                        <GuestPatientDialog
                          onPatientCreated={handleGuestPatientCreated}
                          triggerButtonText="Add Guest"
                          triggerButton={
                            <AddGuestButton
                              variant="outline"
                              size="default"
                              limitType="patients"
                            >
                              Add Guest
                            </AddGuestButton>
                          }
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleQuickSale}
                          >
                            Quick Sale
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Search Patient</Label>
                    <Input
                      type="text"
                      placeholder="Search by name or ID"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                    />
                    <div className="max-h-[150px] overflow-y-auto">
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`p-1 border rounded-lg mb-0.5 cursor-pointer hover:bg-blue-50 flex flex-col ${
                            selectedPatient?.id === patient.id ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' : ''
                          }`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="font-medium text-xs">{patient.full_name}</div>
                          <div className="text-[10px] text-gray-500">
                            {patient.patient_type === 'guest' && <span className="bg-amber-100 text-amber-800 px-1 rounded-sm mr-1">Guest</span>}
                            {patient.phone_number || 'No phone'}
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'medication' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold">
                        {isQuickSale ? 'Quick Sale - Select Medications' : 'Select Medications'}
                      </h2>
                    </div>

                  <div className="space-y-1">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-xs">Search Medication</Label>
                      <Input
                        type="text"
                        placeholder="Search by name or code"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                      />
                    </div>
                    <div className="max-h-[150px] overflow-y-auto">
                      {filteredMedications.map((medication) => (
                        <div
                          key={medication.id}
                          className={`p-1 border rounded-lg mb-0.5 cursor-pointer hover:bg-blue-50 flex flex-col ${
                            selectedMedication?.id === medication.id ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' : ''
                          }`}
                          onClick={() => handleMedicationSelect(medication)}
                        >
                          <div className="font-medium text-xs">{medication.name}</div>
                          <div className="text-[10px] text-gray-500 flex justify-between">
                            <span>Category: {medication.category}</span>
                            <span>Available: {medication.batches?.reduce((sum, batch) => sum + batch.quantity, 0) || 0}</span>
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCurrentStep('patient');
                          setSelectedMedication(null);
                          setSelectedBatchId("");
                          setQuantity(1);
                          setSearchQuery("");
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setCurrentStep('payment')}
                        >
                          Proceed to Payment
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'batch' && selectedMedication && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold">Select Batch and Quantity</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                        <div className="font-medium text-sm">{selectedMedication.name}</div>
                        <div className="text-xs text-gray-500">Category: {selectedMedication.category}</div>
                      </div>

                  <div className="space-y-1">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-xs">Select Batch</Label>
                      <Select
                        value={selectedBatchId}
                        onValueChange={(value) => setSelectedBatchId(value)}
                      >
                        <SelectTrigger className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                          <SelectValue placeholder="Select a batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedMedication.batches.map((batch: { id: string; batch_number: string; expiry_date: string; quantity: number }) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.batch_number} - Expires: {new Date(batch.expiry_date).toLocaleDateString()} - Qty: {batch.quantity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                      />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCurrentStep('patient');
                            setSelectedMedication(null);
                            setSelectedBatchId("");
                            setQuantity(1);
                            setSearchQuery("");
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddItem}
                            disabled={!selectedBatchId || !quantity}
                          >
                            Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'payment' && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Payment Details</h2>
                    
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span>Medication Total:</span>
                        <span>KSh {items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total Amount:</span>
                        <span>KSh {items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {isQuickSale && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'mpesa' | 'insurance')}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="cash">Cash</option>
                          <option value="mpesa">M-PESA</option>
                          <option value="insurance">Insurance</option>
                        </select>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCurrentStep('patient');
                          setSelectedMedication(null);
                          setSelectedBatchId("");
                          setQuantity(1);
                          setSearchQuery("");
                        }}
                      >
                        Back
                      </Button>
                      <LimitAwareButton
                        type="button"
                        onClick={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
                        disabled={isSubmitting || isCheckingLimits || limitsLoading}
                        limitType="transactions"
                        variant="default"
                        loading={isCheckingLimits || limitsLoading}
                      >
                        {isSubmitting ? 'Processing...' : isQuickSale ? 'Complete Sale' : 'Submit Sale'}
                      </LimitAwareButton>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Current Sale Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-xs">Current Sale Items</h3>
                <div className="max-h-[300px] overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="p-2 border rounded-lg mb-1 flex flex-col bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-xs">{item.medication.name}</div>
                          <div className="text-[10px] text-gray-500 flex justify-between">
                            <span>Batch: {item.batch.batch_number}</span>
                            <span>Qty: {item.quantity} x ${item.unit_price}</span>
                          </div>
                          <div className="text-[10px] font-medium text-right">Total: ${item.total_price}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-red-500"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {items.length === 0 && (
                    <div className="text-center text-[11px] text-gray-500 italic p-4 border rounded-lg border-dashed">
                      No items added to cart yet
                    </div>
                  )}
                </div>
                
                <div className="text-right space-y-1 p-2 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <div className="text-[11px] text-gray-600 flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">${pharmacyTotal.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-gray-200 my-1"></div>
                  <div className="text-xs font-medium flex justify-between text-blue-700">
                    <span>Total:</span>
                    <span>${pharmacyTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* M-PESA Payment Dialog */}
      <Dialog open={showMpesaDialog} onOpenChange={setShowMpesaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>M-PESA Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                className="w-full p-2 border rounded-md"
                placeholder="Enter M-PESA phone number"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMpesaDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleMpesaPayment(mpesaPhone)}
              disabled={!mpesaPhone}
            >
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <ReceiptDialog
        isOpen={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          setReceiptContent(null);
          // Reset form after closing receipt
          setItems([]);
          setSelectedPatient(null);
          setIsQuickSale(false);
          setCurrentStep('patient');
          setPaymentMethod('cash');
          setShowMpesaDialog(false);
          setCurrentSaleId(null);
        }}
        receiptContent={receiptContent}
        onDownload={(content) => {
          const blob = new Blob([content], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt-${currentSaleId}.txt`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }}
      />

      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}
    </div>
  );
} 