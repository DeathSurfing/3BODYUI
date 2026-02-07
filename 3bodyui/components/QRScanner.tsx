'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen && !scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-reader');
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && scannerRef.current) {
      startScanning();
    }

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
        setIsScanning(false);
      }
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      setError('');
      setIsScanning(true);

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          handleClose();
        },
        () => {
          // QR code not found - this is normal, don't show error
        }
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setError('Camera access denied or not available. Please check permissions.');
      setIsScanning(false);
    }
  };

  const handleClose = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b-[3px] border-[#333]">
        <div className="flex items-center gap-4">
          <div className="w-3 h-10 bg-[#C9A962]" />
          <div>
            <h2 className="font-display text-2xl font-bold">Scan QR Code</h2>
            <p className="text-[#666] text-sm">Position the QR code within the frame</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-12 h-12 border-[3px] border-[#333] flex items-center justify-center hover:border-[#C9A962] transition-colors"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {error ? (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 border-[3px] border-red-500 flex items-center justify-center">
              <AlertIcon className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={handleClose}
              className="px-8 py-4 bg-[#333] text-white font-display font-bold uppercase tracking-wider border-[3px] border-[#333] hover:border-[#C9A962] transition-colors"
            >
              Close Scanner
            </button>
          </div>
        ) : (
          <>
            {/* QR Scanner Container */}
            <div className="relative">
              {/* Corner Accents */}
              <div className="absolute -top-4 -left-4 w-8 h-8 border-t-[4px] border-l-[4px] border-[#C9A962]" />
              <div className="absolute -top-4 -right-4 w-8 h-8 border-t-[4px] border-r-[4px] border-[#C9A962]" />
              <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-[4px] border-l-[4px] border-[#C9A962]" />
              <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-[4px] border-r-[4px] border-[#C9A962]" />

              <div 
                id="qr-reader" 
                className="w-[300px] h-[300px] bg-[#111] border-[3px] border-[#333]"
              />
            </div>

            {/* Instructions */}
            <div className="mt-8 text-center">
              <p className="text-[#666] text-sm">
                Scan merchant QR code to initiate payment
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-[#C9A962] rounded-full animate-pulse" />
                <span className="text-[#C9A962] text-sm font-mono">Scanning...</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
