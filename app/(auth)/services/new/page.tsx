import { Metadata } from 'next';
import NewServiceForm from '@/components/services/NewServiceForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'New Clinical Service',
  description: 'Record a new clinical service or medical procedure',
};

export default function NewServicePage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">New Clinical Service Record</h1>
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewServiceForm 
            onSuccess={() => {}}
            onCancel={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  );
} 