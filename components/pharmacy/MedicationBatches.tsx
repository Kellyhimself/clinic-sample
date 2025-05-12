'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteBatch } from '@/lib/inventory';
import { Medication } from '@/types/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useFeatures } from '@/app/lib/hooks/useFeatures';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { Package2 } from 'lucide-react';

interface MedicationBatchesProps {
  medication: Medication;
}

export default function MedicationBatches({ medication }: MedicationBatchesProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { isFeatureEnabled } = useFeatures();

  const handleDeleteBatch = async (batchId: string) => {
    setIsDeleting(batchId);
    try {
      await deleteBatch(batchId);
      toast.success('Batch deleted successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete batch');
      console.error('Error deleting batch:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  if (!isFeatureEnabled('medication_batches')) {
    return (
      <div className="container mx-auto py-6">
        <UpgradePrompt
          requiredPlan="pro"
          features={[
            "Batch management",
            "Expiry tracking",
            "Batch deletion",
            "Stock movement tracking"
          ]}
          variant="card"
          popoverPosition="top-right"
        >
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5 text-blue-600" />
                  {medication.name} - Batches
                </CardTitle>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled
                >
                  Add New Batch
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Preview rows */}
                  {[1, 2, 3].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>BATCH-{index + 1}</TableCell>
                      <TableCell>{format(new Date(), 'MMM d, yyyy')}</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>KSh 0.00</TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </UpgradePrompt>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5 text-blue-600" />
              {medication.name} - Batches
            </CardTitle>
            <Button
              onClick={() => router.push(`/pharmacy/inventory/batches/new?medication_id=${medication.id}&return_url=/pharmacy/inventory/${medication.id}/batches`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add New Batch
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medication.batches.map((batch) => {
                const isExpired = new Date(batch.expiry_date) < new Date();
                const expiryDate = new Date(batch.expiry_date);
                const today = new Date();
                const diffTime = expiryDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isExpiring = !isExpired && diffDays <= 30;

                return (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.batch_number}</TableCell>
                    <TableCell>{format(new Date(batch.expiry_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{batch.quantity}</TableCell>
                    <TableCell>KSh {batch.unit_price.toFixed(2)}</TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : isExpiring ? (
                        <Badge variant="secondary">Expiring in {diffDays} days</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isExpired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBatch(batch.id)}
                          className="text-red-600 hover:text-red-700"
                          disabled={isDeleting === batch.id}
                        >
                          {isDeleting === batch.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 