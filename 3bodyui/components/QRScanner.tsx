'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

type ScannerState = 'idle' | 'initializing' | 'scanning' | 'error' | 'closing';

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stateRef = useRef<ScannerState>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sync ref with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cleanup function
  const cleanupScanner = async (): Promise<void> => {
    return new Promise((resolve) => {
      if (!scannerRef.current) {
        resolve();
        return;
      }

      const currentState = stateRef.current;
      
      // If already closing or idle, just resolve
      if (currentState === 'closing' || currentState === 'idle') {
        resolve();
        return;
      }

      setState('closing');

      // Give a small delay to let any ongoing operations complete
      setTimeout(async () => {
        try {
          if (scannerRef.current) {
            await scannerRef.current.stop();
          }
        } catch (err) {
          // Ignore errors during cleanup
          console.log('Cleanup error (expected):', err);
        } finally {
          scannerRef.current = null;
          setState('idle');
          resolve();
        }
      }, 100);
    });
  };

  // Initialize scanner
  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      cleanupScanner();
      return;
    }

    // Reset state when opening
    setErrorMsg('');
    setState('idle');

    let isActive = true;

    const initScanner = async () => {
      // Wait for container to be ready
      if (!containerRef.current) {
        console.log('Container not ready, retrying...');
        setTimeout(initScanner, 50);
        return;
      }

      // Clean up any existing scanner first
      if (scannerRef.current) {
        await cleanupScanner();
      }

      if (!isActive) return;

      try {
        setState('initializing');

        // Create new scanner instance
        scannerRef.current = new Html5Qrcode('qr-reader');

        if (!isActive) {
          await cleanupScanner();
          return;
        }

        // Start scanning
        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Success callback
            if (isActive && stateRef.current === 'scanning') {
              onScan(decodedText);
              cleanupScanner().then(() => {
                onClose();
              });
            }
          },
          () => {
            // Error callback - QR not found, this is normal
          }
        );

        if (isActive) {
          setState('scanning');
        } else {
          await cleanupScanner();
        }
      } catch (err: any) {
        console.error('Scanner init error:', err);
        if (isActive) {
          setErrorMsg(err?.message || 'Camera access denied or not available');
          setState('error');
          scannerRef.current = null;
        }
      }
    };

    // Delay initialization to ensure modal is rendered
    const timer = setTimeout(initScanner, 200);

    return () => {
      isActive = false;
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen, onClose, onScan]);

  // Handle manual close
  const handleClose = async () => {
    await cleanupScanner();
    onClose();
  };

  if (!isOpen) return null;

  const isLoading = state === 'initializing' || state === 'closing';
  const hasError = state === 'error' || errorMsg;

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
          disabled={isLoading}
          className="w-12 h-12 border-[3px] border-[#333] flex items-center justify-center hover:border-[#C9A962] transition-colors disabled:opacity-50"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6" ref={containerRef}>
        {hasError ? (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 border-[3px] border-red-500 flex items-center justify-center">
              <AlertIcon className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-red-400 text-lg mb-4">{errorMsg || 'Failed to start camera'}</p>
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
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-[3px] border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#C9A962] text-sm font-mono">
                    {state === 'initializing' ? 'Initializing camera...' : 'Closing...'}
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-[#666] text-sm">
                    Scan merchant QR code to initiate payment
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-[#C9A962] rounded-full animate-pulse" />
                    <span className="text-[#C9A962] text-sm font-mono">Ready to scan</span>
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
