// components/pharmacy/AddMedicationForm.tsx
'use client';

import { useState } from 'react';

export default function AddMedicationForm() {
  const [formData, setFormData] = useState({
    name: '',
    batch_no: '',
    category: '',
    supplier_id: '',
    description: '',
    unit_price: 0,
    quantity_in_stock: 0,
    reorder_level: 0,
    expiry_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/pharmacy/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, is_active: true }),
    });

    if (response.ok) {
      alert('Medication added');
      setFormData({
        name: '',
        batch_no: '',
        category: '',
        supplier_id: '',
        description: '',
        unit_price: 0,
        quantity_in_stock: 0,
        reorder_level: 0,
        expiry_date: '',
      });
    } else {
      const { error } = await response.json();
      alert(`Failed to add medication: ${error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-md bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Add Medication</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border p-2 rounded"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Batch No</label>
        <input
          type="text"
          value={formData.batch_no}
          onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
          className="w-full border p-2 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Category</label>
        <input
          type="text"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full border p-2 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Supplier ID</label>
        <input
          type="text"
          value={formData.supplier_id}
          onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
          className="w-full border p-2 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full border p-2 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Unit Price</label>
        <input
          type="number"
          value={formData.unit_price}
          onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
          className="w-full border p-2 rounded"
          required
          min="0"
          step="0.01"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Quantity in Stock</label>
        <input
          type="number"
          value={formData.quantity_in_stock}
          onChange={(e) => setFormData({ ...formData, quantity_in_stock: Number(e.target.value) })}
          className="w-full border p-2 rounded"
          required
          min="0"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Reorder Level</label>
        <input
          type="number"
          value={formData.reorder_level}
          onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
          className="w-full border p-2 rounded"
          required
          min="0"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Expiry Date</label>
        <input
          type="date"
          value={formData.expiry_date}
          onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
          className="w-full border p-2 rounded"
        />
      </div>
      <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
        Add Medication
      </button>
    </form>
  );
}