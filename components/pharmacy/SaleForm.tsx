// components/pharmacy/SaleForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SaleFormData {
  medication_id: string;
  patient_id: string;
  prescription_id: string;
  quantity: number;
  unit_price: number;
  generateReceipt: boolean;
}

export default function SaleForm({
  medications,
  patients,
  prescriptions,
}: {
  medications: { id: string; name: string; unit_price: number; quantity_in_stock: number }[];
  patients: { id: string; full_name: string }[];
  prescriptions: { id: string; medication_name: string; patient_id: string; quantity: number }[];
}) {
  const router = useRouter();
  const [formData, setFormData] = useState<SaleFormData>({
    medication_id: '',
    patient_id: '',
    prescription_id: '',
    quantity: 0,
    unit_price: 0,
    generateReceipt: false,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.prescription_id) {
        if (!formData.medication_id || !formData.patient_id) {
          setError("Please select a medication and patient.");
          return;
        }
      }

    const sanitizedData = {
        ...formData,
        medication_id: formData.medication_id || null,
        patient_id: formData.patient_id || null,
        prescription_id: formData.prescription_id || null,
      };
      
    console.log('Submitting Sale:', sanitizedData);
    const response = await fetch('/api/pharmacy/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedData),
    });

    if (!response.ok) {
      const { error } = await response.json();
      setError(error || 'Failed to record sale');
      return;
    }

    const sale = await response.json();

    if (formData.generateReceipt) {
      const receiptResponse = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: null, sale_id: sale.id, appointment_cost: 0 }),
      });

      if (!receiptResponse.ok) {
        setError('Sale recorded, but receipt generation failed');
        return;
      }
    }

    alert('Sale recorded successfully');
    router.refresh(); // Refresh to update stock display elsewhere
  };

  const handleMedicationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const med = medications.find((m) => m.id === e.target.value);
    setFormData({
      ...formData,
      medication_id: e.target.value,
      unit_price: med ? med.unit_price : 0,
      quantity: med && med.quantity_in_stock > 0 ? 1 : 0,
    });
  };

  const handlePrescriptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presc = prescriptions.find((p) => p.id === e.target.value);
    if (presc) {
      const med = medications.find((m) => m.name === presc.medication_name);
      setFormData({
        ...formData,
        prescription_id: presc.id,
        patient_id: presc.patient_id,
        medication_id: med ? med.id : '',
        quantity: presc.quantity,
        unit_price: med ? med.unit_price : 0,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-md bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Record a Sale</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-4">
        <label className="block text-sm font-medium">Prescription (Optional)</label>
        <select
          value={formData.prescription_id}
          onChange={handlePrescriptionChange}
          className="w-full border p-2 rounded"
        >
          <option value="">Select Prescription</option>
          {prescriptions.map((presc) => (
            <option key={presc.id} value={presc.id}>
              {presc.medication_name} for {patients.find((p) => p.id === presc.patient_id)?.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">Medication</label>
        <select
          value={formData.medication_id}
          onChange={handleMedicationChange}
          className="w-full border p-2 rounded"
          required={!formData.prescription_id}
          disabled={!!formData.prescription_id}
        >
          <option value="">Select Medication</option>
          {medications.map((med) => (
            <option key={med.id} value={med.id}>
              {med.name} (Stock: {med.quantity_in_stock})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">Patient</label>
        <select
          value={formData.patient_id}
          onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
          className="w-full border p-2 rounded"
          required
          disabled={!!formData.prescription_id}
        >
          <option value="">Select Patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">Quantity</label>
        <input
          type="number"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
          className="w-full border p-2 rounded"
          required
          min="1"
          disabled={!!formData.prescription_id}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">Unit Price (KSh)</label>
        <input
          type="number"
          value={formData.unit_price}
          onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
          className="w-full border p-2 rounded"
          required
          min="0"
          step="0.01"
          disabled={!!formData.prescription_id}
        />
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.generateReceipt}
            onChange={(e) => setFormData({ ...formData, generateReceipt: e.target.checked })}
            className="mr-2"
          />
          Generate Receipt
        </label>
      </div>

      <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
        Record Sale
      </button>
    </form>
  );
}