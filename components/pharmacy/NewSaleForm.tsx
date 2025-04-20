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
import { createSale, generateReceipt, getUnpaidAppointments } from "@/lib/authActions";
import type { Patient, Medication } from "@/types/supabase";
import { Download, ArrowLeft } from "lucide-react";

interface UnpaidAppointment {
  id: string;
  date: string;
  time: string;
  services: {
    name: string;
    price: number;
  } | null;
  payment_status: 'unpaid' | 'paid' | 'refunded' | null;
}

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
}

export default function NewSaleForm({ initialPatients = [], initialMedications = [] }: NewSaleFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(initialPatients);
  const [filteredMedications, setFilteredMedications] = useState<Medication[]>(initialMedications);
  const [unpaidAppointments, setUnpaidAppointments] = useState<UnpaidAppointment[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'bank'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter patients based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = initialPatients.filter(patient =>
        patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(initialPatients);
    }
  }, [searchQuery, initialPatients]);

  // Filter medications based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = initialMedications.filter(medication =>
        medication.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medication.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMedications(filtered);
    } else {
      setFilteredMedications(initialMedications);
    }
  }, [searchQuery, initialMedications]);

  // Fetch unpaid appointments when patient is selected
  useEffect(() => {
    const fetchUnpaidAppointments = async () => {
      if (selectedPatient) {
        const appointments = await getUnpaidAppointments(selectedPatient.id);
        setUnpaidAppointments(appointments);
      }
    };

    fetchUnpaidAppointments();
  }, [selectedPatient]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery("");
    setStep(2);
  };

  const handleMedicationSelect = (medication: Medication) => {
    setSelectedMedication(medication);
    setSearchQuery("");
    setStep(3);
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
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item to the sale");
      return;
    }

    setIsSubmitting(true);
    try {
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      const sale = await createSale({
        patient_id: selectedPatient.id,
        items: items.map(item => ({
          medication_id: item.medication_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        payment_method: paymentMethod,
        payment_status: "paid",
        total_amount: totalAmount
      });

      if (sale) {
        // Generate and show receipt
        const receipt = await generateReceipt({ saleId: sale.id });
        setReceiptContent(receipt);
        setShowReceipt(true);
        toast.success("Sale completed successfully");
        // Redirect to sales management page after 2 seconds
        setTimeout(() => {
          router.push("/pharmacy/sales");
        }, 2000);
      } else {
        throw new Error("Failed to create sale");
      }
    } catch (error) {
      console.error("Error creating sale:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotals = () => {
    const pharmacyTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const appointmentsTotal = unpaidAppointments.reduce((sum, app) => sum + (app.services?.price || 0), 0);
    const grandTotal = pharmacyTotal + appointmentsTotal;

    return { pharmacyTotal, appointmentsTotal, grandTotal };
  };

  const { pharmacyTotal, appointmentsTotal, grandTotal } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2 md:p-4">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-7 w-7"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <h2 className="text-base font-semibold">New Sale</h2>
          </div>
          {selectedPatient && (
            <div className="mt-1 text-sm text-gray-600">
              Patient: {selectedPatient.full_name}
            </div>
          )}
        </div>

        <div className="p-2">
          {/* Step Indicator */}
          <div className="flex justify-center mb-2">
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step === stepNumber
                        ? 'bg-blue-500 text-white'
                        : step > stepNumber
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`w-12 h-1 ${
                        step > stepNumber ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Form Steps */}
            <div className="space-y-4">
              {/* Step Content */}
              <div className="space-y-4">
                {step === 1 && (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <Label>Search Patient</Label>
                      <Input
                        type="text"
                        placeholder="Search by name or ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`p-2 border rounded-lg mb-1 cursor-pointer hover:bg-gray-50 flex flex-col ${
                            selectedPatient?.id === patient.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="font-medium text-sm">{patient.full_name}</div>
                          <div className="text-xs text-gray-500">
                            {unpaidAppointments.length > 0 ? `${unpaidAppointments.length} unpaid appointment(s)` : 'No unpaid appointments'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <Label>Search Medication</Label>
                      <Input
                        type="text"
                        placeholder="Search by name or code"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                      {filteredMedications.map((medication) => (
                        <div
                          key={medication.id}
                          className={`p-2 border rounded-lg mb-1 cursor-pointer hover:bg-gray-50 flex flex-col ${
                            selectedMedication?.id === medication.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          onClick={() => handleMedicationSelect(medication)}
                        >
                          <div className="font-medium text-sm">{medication.name}</div>
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>Category: {medication.category}</span>
                            <span>Available: {medication.batches?.reduce((sum, batch) => sum + batch.quantity, 0) || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && selectedMedication && (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <Label>Select Batch</Label>
                      <Select
                        value={selectedBatchId}
                        onValueChange={(value) => setSelectedBatchId(value)}
                      >
                        <SelectTrigger className="w-full">
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

                    <div className="flex flex-col gap-1">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label>Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(value: 'cash' | 'mpesa' | 'bank') => setPaymentMethod(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="mpesa">M-Pesa</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1 || isSubmitting}
                  size="sm"
                >
                  Back
                </Button>
                {step === 3 ? (
                  <Button
                    onClick={handleAddItem}
                    disabled={!selectedMedication || !selectedBatchId || !quantity || isSubmitting}
                    size="sm"
                  >
                    Add Item
                  </Button>
                ) : (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 ? !selectedPatient : step === 2 ? !selectedMedication : false}
                    size="sm"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column - Current Sale Items */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Current Sale Items</h3>
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="p-2 border rounded-lg mb-1 flex flex-col">
                      <div className="font-medium text-sm">{item.medication.name}</div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>Batch: {item.batch.batch_number}</span>
                        <span>Qty: {item.quantity} x ${item.unit_price}</span>
                      </div>
                      <div className="text-xs font-medium text-right">Total: ${item.total_price}</div>
                    </div>
                  ))}
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs text-gray-600">Pharmacy Total: ${pharmacyTotal.toFixed(2)}</div>
                  {appointmentsTotal > 0 && (
                    <div className="text-xs text-gray-600">Appointments Total: ${appointmentsTotal.toFixed(2)}</div>
                  )}
                  <div className="text-sm font-semibold">Grand Total: ${grandTotal.toFixed(2)}</div>
                </div>
              </div>

              {/* Complete Sale Button */}
              {items.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full md:w-auto"
                    size="sm"
                  >
                    {isSubmitting ? "Processing..." : "Complete Sale"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Dialog */}
      {showReceipt && receiptContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-2 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold">Receipt</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([receiptContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `receipt-${Date.now()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReceipt(false);
                    router.push("/pharmacy/sales");
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-2">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {receiptContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 