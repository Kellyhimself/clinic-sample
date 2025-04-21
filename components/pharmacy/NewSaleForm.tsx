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
import { createSale } from "@/lib/authActions";
import type { Patient, Medication } from "@/types/supabase";
import { ArrowLeft } from "lucide-react";

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

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("Item removed from cart");
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
        payment_status: "unpaid",
        total_amount: totalAmount
      });

      if (sale) {
        toast.success("Sale created successfully");
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
    return { pharmacyTotal };
  };

  const { pharmacyTotal } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
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
          {selectedPatient && (
            <div className="mt-1 text-xs text-gray-600">
              Patient: {selectedPatient.full_name}
            </div>
          )}
        </div>

        <div className="p-2">
          {/* Step Indicator */}
          <div className="flex justify-center mb-1">
            <div className="flex items-center space-x-1">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      step === stepNumber
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : step > stepNumber
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`w-8 h-0.5 ${
                        step > stepNumber ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Left Column - Form Steps */}
            <div className="space-y-2">
              {/* Step Content */}
              <div className="space-y-2">
                {step === 1 && (
                  <div className="space-y-1">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-xs">Search Patient</Label>
                      <Input
                        type="text"
                        placeholder="Search by name or ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                      />
                    </div>
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
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
                )}

                {step === 3 && selectedMedication && (
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
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1 || isSubmitting}
                  size="sm"
                  className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200"
                >
                  Back
                </Button>
                {step === 3 ? (
                  <Button
                    onClick={handleAddItem}
                    disabled={!selectedMedication || !selectedBatchId || !quantity || isSubmitting}
                    size="sm"
                    className="h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    Add Item
                  </Button>
                ) : (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 ? !selectedPatient : step === 2 ? !selectedMedication : false}
                    size="sm"
                    className="h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column - Current Sale Items */}
            <div className="space-y-2">
              <div className="space-y-1">
                <h3 className="font-medium text-xs">Current Sale Items</h3>
                <div className="max-h-[150px] overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="p-1 border rounded-lg mb-0.5 flex flex-col bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
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
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] text-gray-600">Pharmacy Total: ${pharmacyTotal.toFixed(2)}</div>
                </div>
              </div>

              {/* Complete Sale Button */}
              {items.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full md:w-auto h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
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
    </div>
  );
} 