// app/sales/newsale/page.tsx
import { fetchPatients, fetchMedications } from '@/lib/authActions';
import NewSaleForm from '@/components/pharmacy/NewSaleForm';

export default async function NewSalePage() {
  try {
    const patients = await fetchPatients();
    const medications = await fetchMedications();

    return (
      <div className="container mx-auto py-4">
        <NewSaleForm 
          initialPatients={patients}
          initialMedications={medications}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading new sale page:', error);
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error instanceof Error ? error.message : 'An error occurred while loading the page'}
        </div>
      </div>
    );
  }
}