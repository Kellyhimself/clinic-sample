'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Medication {
  id: string;
  name: string;
  dosage_form: string;
  strength: string;
  unit_price: number;
  description: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  batches: {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    unit_price: number;
  }[];
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const response = await fetch('/api/pharmacy/medications');
      if (!response.ok) {
        throw new Error('Failed to fetch medications');
      }
      const data = await response.json();
      setMedications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Medications</h1>
        <Link href="/pharmacy/medications/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Medication
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Dosage Form</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medications.map((medication) => {
              const totalStock = medication.batches.reduce(
                (sum, batch) => sum + batch.quantity,
                0
              );
              
              return (
                <TableRow key={medication.id}>
                  <TableCell className="font-medium">{medication.name}</TableCell>
                  <TableCell>{medication.dosage_form}</TableCell>
                  <TableCell>{medication.strength}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{medication.category}</Badge>
                  </TableCell>
                  <TableCell>KSh {medication.unit_price.toFixed(2)}</TableCell>
                  <TableCell>{totalStock}</TableCell>
                  <TableCell>
                    <Badge variant={medication.is_active ? "default" : "destructive"}>
                      {medication.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(medication.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Link href={`/pharmacy/medications/${medication.id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 