'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft, Package, X } from 'lucide-react';
import { fetchStockAlerts } from '@/lib/inventory';
import { Medication } from '@/types/supabase';

interface StockAlert {
  medication: Medication;
  type: 'low_stock' | 'expiring';
  message: string;
  severity: 'warning' | 'danger';
  batch: {
    batch_number: string;
    quantity: number;
    expiry_date: string;
  };
}

export default function StockAlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { lowStock, expiring } = await fetchStockAlerts();
        const newAlerts: StockAlert[] = [];

        // Process low stock alerts
        lowStock.forEach(({ medication, batch }) => {
          newAlerts.push({
            medication,
            type: 'low_stock',
            message: `Low stock alert: ${medication.name} (Batch ${batch.batch_number}) has only ${batch.quantity} units remaining`,
            severity: 'warning',
            batch
          });
        });

        // Process expiring stock alerts
        expiring.forEach(({ medication, batch }) => {
          newAlerts.push({
            medication,
            type: 'expiring',
            message: `Expiring stock: ${medication.name} (Batch ${batch.batch_number}) expires on ${new Date(batch.expiry_date).toLocaleDateString()}`,
            severity: 'danger',
            batch
          });
        });

        setAlerts(newAlerts);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        toast.error('Failed to load stock alerts');
        setIsLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const handleClearAlerts = async () => {
    try {
      // TODO: Implement clearStockAlerts function
      setAlerts([]);
      toast.success('Stock alerts cleared successfully');
    } catch (error) {
      console.error('Error clearing alerts:', error);
      toast.error('Failed to clear stock alerts');
    }
  };

  const handleRestock = (medicationId: string) => {
    router.push(`/pharmacy/restock?medication=${medicationId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Stock Alerts</h1>
          </div>
          {alerts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAlerts}
              className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All Alerts
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : alerts.length === 0 ? (
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Stock Alerts</h3>
              <p className="text-sm text-gray-500 mt-2">
                All inventory levels are within acceptable ranges.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <Card key={index} className="bg-white shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">
                      {alert.medication.name}
                    </CardTitle>
                    <Badge
                      variant={alert.severity === 'warning' ? 'warning' : 'destructive'}
                      className="ml-2"
                    >
                      {alert.type === 'low_stock' ? 'Low Stock' : 'Expiring Soon'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <AlertCircle
                      className={`h-5 w-5 mt-1 ${
                        alert.severity === 'warning' ? 'text-yellow-500' : 'text-red-500'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestock(alert.medication.id)}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                        >
                          Restock
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/pharmacy/inventory/${alert.medication.id}`)}
                          className="bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 