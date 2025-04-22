// components/pharmacy/BarcodeScanner.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onScan }: { onScan: (id: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scannerId = 'html5-qr-code-scanner';
    let container = document.getElementById(scannerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = scannerId;
      containerRef.current.appendChild(container);
    }

    scannerRef.current = new Html5Qrcode(scannerId);
    
    const startScanner = async () => {
      try {
        await scannerRef.current?.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText);
            setError(null);
          },
          (errorMessage) => {
            // Errors will be logged in console, but not shown to user
            // to avoid constant error flickering
            console.error(errorMessage);
          }
        );
      } catch (err) {
        setError((err as Error).message);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current
          .stop()
          .catch(error => console.error('Error stopping scanner:', error));
      }
    };
  }, [onScan]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Scan Barcode</h2>
      <div ref={containerRef} className="max-w-md mx-auto" />
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}