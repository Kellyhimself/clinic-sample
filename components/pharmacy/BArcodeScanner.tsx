// components/pharmacy/BarcodeScanner.tsx
'use client';

import { useState } from 'react';
import { QrReader } from 'react-qr-reader';

export default function BarcodeScanner({ onScan }: { onScan: (id: string) => void }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Scan Barcode</h2>
      <QrReader
        onResult={(result, error) => {
          if (result) {
            onScan(result.getText());
            setError(null);
          }
          if (error) {
            setError(error.message);
          }
        }}
        constraints={{ facingMode: 'environment' }}
        className="max-w-md mx-auto"
      />
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}