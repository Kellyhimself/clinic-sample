// components/pharmacy/ClientStockDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabaseClient, syncSession } from '@/lib/supabase-client';
import { Medication } from '@/types/supabase';

export default function ClientStockDashboard({ initialMedications }: { initialMedications: Medication[] }) {
  const [medications, setMedications] = useState<Medication[]>(initialMedications);

  useEffect(() => {
    syncSession();

    const channelLowStock = supabaseClient
      .channel('medications_low_stock')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'medications',
          filter: 'quantity_in_stock=lte.reorder_level',
        },
        (payload) => {
          const updatedMedication = payload.new as Medication;
          alert(`Low stock alert: ${updatedMedication.name} has ${updatedMedication.quantity_in_stock} units`);
          setMedications((prev) =>
            prev.map((med) => (med.id === updatedMedication.id ? updatedMedication : med))
          );
        }
      )
      .subscribe();

    const channelExpiry = supabaseClient
      .channel('medications_expiry')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'medications',
          filter: 'expiry_date=not.is.null',
        },
        (payload) => {
          const updatedMedication = payload.new as Medication;
          if (updatedMedication.expiry_date) {
            const daysUntilExpiry = Math.ceil(
              (new Date(updatedMedication.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilExpiry <= 30) {
              alert(
                `Expiry alert: ${updatedMedication.name} (Batch ${updatedMedication.batch_no}) expires in ${daysUntilExpiry} days`
              );
            }
          }
          setMedications((prev) =>
            prev.map((med) => (med.id === updatedMedication.id ? updatedMedication : med))
          );
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channelLowStock);
      supabaseClient.removeChannel(channelExpiry);
    };
  }, []);

  const handleRestock = async (medicationId: string, quantity: number) => {
    const reason = prompt('Enter restock reason:');
    if (!reason) return;

    const response = await fetch('/api/pharmacy/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medication_id: medicationId, quantity, reason }),
    });

    if (response.ok) {
      const data = await fetch('/api/pharmacy/medications').then((res) => res.json());
      setMedications(data as Medication[]);
    } else {
      alert('Failed to restock');
    }
  };

  const handleDelete = async (medicationId: string) => {
    if (confirm('Delete this medication?')) {
      const response = await fetch(`/api/pharmacy/medications/${medicationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setMedications((prev) => prev.filter((med) => med.id !== medicationId));
      } else {
        alert('Failed to delete');
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Pharmacy Stock</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2">Name</th>
            <th className="border p-2">Batch No</th>
            <th className="border p-2">Category</th>
            <th className="border p-2">Stock</th>
            <th className="border p-2">Reorder Level</th>
            <th className="border p-2">Expiry Date</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {medications.map((med) => (
            <tr
              key={med.id}
              className={
                med.quantity_in_stock <= med.reorder_level
                  ? 'bg-red-100'
                  : med.expiry_date && new Date(med.expiry_date) < new Date()
                    ? 'bg-yellow-100'
                    : ''
              }
            >
              <td className="border p-2">{med.name}</td>
              <td className="border p-2">{med.batch_no || 'N/A'}</td>
              <td className="border p-2">{med.category || 'N/A'}</td>
              <td className="border p-2">{med.quantity_in_stock}</td>
              <td className="border p-2">{med.reorder_level}</td>
              <td className="border p-2">{med.expiry_date || 'N/A'}</td>
              <td className="border p-2">
                <button
                  onClick={() => handleRestock(med.id, 10)}
                  className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                >
                  Restock
                </button>
                <button
                  onClick={() => handleDelete(med.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}