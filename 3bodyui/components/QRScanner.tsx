'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const webcamRef = useRef<Webcam>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleClose = useCallback(() => {
    stopScanning();
    onClose();
  }, [stopScanning, onClose]);

  const scanQRCode = useCallback(async () => {
    const webcam = webcamRef.current;
    if (!webcam || !webcam.video) return;

    const video = webcam.video;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    try {
      const result = await QrScanner.scanImage(video);
      if (result && result.data) {
        stopScanning();
        onScan(result.data);
        handleClose();
      }
    } catch {
      // No QR code found - this is normal, just continue scanning
    }
  }, [onScan, handleClose, stopScanning]);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    // Start scanning after a short delay to let camera initialize
    const timer = setTimeout(() => {
      setIsScanning(true);
      scanIntervalRef.current = setInterval(scanQRCode, 200);
    }, 1000);

    return () => {
      clearTimeout(timer);
      stopScanning();
    };
  }, [isOpen, scanQRCode, stopScanning]);

  const handleUserMediaError = useCallback(() => {
    setError('Camera access denied or not available. Please check permissions.');
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b-[3px] border-[#333] bg-[#0a0a0a]">
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black">
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
            {/* Camera Container */}
            <div className="relative">
              {/* Corner Accents */}
              <div className="absolute -top-4 -left-4 w-8 h-8 border-t-[4px] border-l-[4px] border-[#C9A962] z-10" />
              <div className="absolute -top-4 -right-4 w-8 h-8 border-t-[4px] border-r-[4px] border-[#C9A962] z-10" />
              <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-[4px] border-l-[4px] border-[#C9A962] z-10" />
              <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-[4px] border-r-[4px] border-[#C9A962] z-10" />

              <div className="w-[300px] h-[300px] bg-[#111] border-[3px] border-[#333] overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: 'environment',
                    width: 300,
                    height: 300,
                  }}
                  onUserMediaError={handleUserMediaError}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 text-center">
              {!isScanning ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-[3px] border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#C9A962] text-sm font-mono">Starting camera...</span>
                </div>
              ) : (
                <>
                  <p className="text-[#666] text-sm">
                    Scan merchant QR code to initiate payment
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-[#C9A962] rounded-full animate-pulse" />
                    <span className="text-[#C9A962] text-sm font-mono">Scanning...</span>
                  </div>
                </>
              )}
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
