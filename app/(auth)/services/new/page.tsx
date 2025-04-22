'use client';

import NewServiceForm from '@/components/services/NewServiceForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function NewServicePage() {
  const router = useRouter();
  
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">New Clinical Service Record</h1>
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewServiceForm 
            onSuccess={() => router.push('/services')}
            onCancel={() => router.push('/services')}
          />
        </CardContent>
      </Card>
    </div>
  );
} 