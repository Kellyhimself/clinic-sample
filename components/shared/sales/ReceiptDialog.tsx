'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receiptContent: string | null;
  onDownload?: (content: string) => void;
}

export default function ReceiptDialog({
  isOpen,
  onClose,
  receiptContent,
  onDownload,
}: ReceiptDialogProps) {
  if (!isOpen || !receiptContent) return null;

  return (
    <div className="fixed inset-0 bg-white md:bg-black/50 flex items-center justify-center p-0 md:p-4 z-50">
      <div className="bg-white w-full h-full md:max-w-2xl md:h-auto md:max-h-[90vh] md:rounded-lg overflow-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-base md:text-lg font-bold">Receipt</h2>
          <div className="flex gap-2">
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(receiptContent)}
                className="text-xs md:text-sm h-8 py-0"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs md:text-sm h-8 py-0"
            >
              Close
            </Button>
          </div>
        </div>
        <div className="p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs md:text-sm">
            {receiptContent}
          </pre>
        </div>
      </div>
    </div>
  );
} 