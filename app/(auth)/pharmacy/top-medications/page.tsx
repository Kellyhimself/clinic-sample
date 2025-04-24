'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package2, BarChart, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTopSellingMedications } from '@/lib/rpcActions';

export default function TopMedicationsPage() {
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getTopSellingMedications();
        setMedications(data);
      } catch (err) {
        console.error('Error fetching top medications:', err);
        setError('Failed to load top medications data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Top Selling Medications</h1>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => window.history.back()}
        >
          Back to Sales
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading medication data...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {medications.map((med, index) => (
            <Card key={med.medication_id} className={`overflow-hidden ${index < 3 ? 'border-2 border-indigo-200' : ''}`}>
              <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">
                    {index < 3 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-800 h-6 w-6 mr-2">
                        {index + 1}
                      </span>
                    )}
                    {med.medication_name}
                  </CardTitle>
                  {index < 3 && (
                    <span className="text-xs font-medium uppercase text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                      Top Seller
                    </span>
                  )}
                </div>
                <CardDescription>
                  ID: {med.medication_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-indigo-100 p-3">
                    {index === 0 ? (
                      <Package2 className="h-8 w-8 text-indigo-600" />
                    ) : index === 1 ? (
                      <BarChart className="h-8 w-8 text-indigo-600" />
                    ) : (
                      <Activity className="h-8 w-8 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{med.total_quantity}</p>
                    <p className="text-sm text-gray-500">Units sold</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {medications.length === 0 && !loading && (
            <div className="col-span-full text-center py-10 bg-gray-50 rounded-lg">
              <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No medication data available</h3>
              <p className="text-gray-500 mt-2">There are no sales records to analyze yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 