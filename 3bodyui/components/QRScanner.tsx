'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Suppress non-critical scanner errors
  const suppressScannerErrors = (err: any) => {
    const errorStr = String(err);
    // These are expected errors during cleanup, not actual failures
    if (
      errorStr.includes('onabort') ||
      errorStr.includes('RenderedCameraImpl') ||
      errorStr.includes('transition') ||
      errorStr.includes('clear while scan is ongoing') ||
      errorStr.includes('not running')
    ) {
      console.log('Suppressed expected scanner error:', errorStr);
      return true;
    }
    return false;
  };

  // Cleanup function that FORCEFULLY stops the camera
  const stopCamera = useCallback(async () => {
    if (isStoppingRef.current) {
      console.log('Already stopping camera, waiting...');
      return;
    }
    
    isStoppingRef.current = true;
    console.log('Stopping camera...');
    
    if (scannerRef.current) {
      try {
        // Try to stop gracefully first
        await scannerRef.current.stop();
        console.log('Camera stopped successfully');
      } catch (err) {
        if (!suppressScannerErrors(err)) {
          console.log('Error stopping camera:', err);
        }
      }
      
      try {
        // Also try to clear the scanner
        await scannerRef.current.clear();
        console.log('Scanner cleared');
      } catch (err) {
        if (!suppressScannerErrors(err)) {
          console.log('Error clearing scanner:', err);
        }
      }
      
      // Null out the reference
      scannerRef.current = null;
    }
    
    // As a fallback, try to stop all tracks on all video elements
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          console.log('Stopping track:', track.kind);
          track.stop();
        });
        video.srcObject = null;
      }
    });

    isStoppingRef.current = false;
  }, []);

  // Handle close button
  const handleClose = useCallback(async () => {
    console.log('Close button clicked');
    setIsLoading(true);
    await stopCamera();
    setIsLoading(false);
    onClose();
  }, [stopCamera, onClose]);

  // Initialize scanner
  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      stopCamera();
      return;
    }

    let isMounted = true;
    setError('');
    setIsLoading(true);

    const initScanner = async () => {
      // Wait for DOM element
      const element = document.getElementById('qr-reader');
      if (!element) {
        console.log('Element not found, retrying...');
        setTimeout(initScanner, 100);
        return;
      }

      try {
        // Create scanner
        scannerRef.current = new Html5Qrcode('qr-reader');
        
        if (!isMounted) {
          await stopCamera();
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
            console.log('QR Code scanned:', decodedText);
            if (isMounted) {
              onScan(decodedText);
              handleClose();
            }
          },
          (err) => {
            // QR scan errors - suppress expected ones
            if (!suppressScannerErrors(err)) {
              console.log('QR scan error:', err);
            }
          }
        );

        if (isMounted) {
          setIsLoading(false);
        } else {
          await stopCamera();
        }
      } catch (err: any) {
        if (!suppressScannerErrors(err)) {
          console.error('Init error:', err);
        }
        if (isMounted) {
          // Only show user-friendly errors, not internal scanner errors
          if (!suppressScannerErrors(err)) {
            setError(err?.message || 'Camera access denied');
          }
          setIsLoading(false);
        }
        await stopCamera();
      }
    };

    // Small delay to ensure modal is rendered
    const timer = setTimeout(initScanner, 300);

    return () => {
      console.log('Cleanup effect running');
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, onScan, handleClose, stopCamera]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopCamera();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stopCamera]);

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
          disabled={isLoading}
          className="w-12 h-12 border-[3px] border-[#333] flex items-center justify-center hover:border-[#C9A962] transition-colors disabled:opacity-50"
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
                  <span className="text-[#C9A962] text-sm font-mono">Starting camera...</span>
                </div>
              ) : (
                <>
                  <p className="text-[#666] text-sm">
                    Scan merchant QR code to initiate payment
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-[#C9A962] rounded-full animate-pulse" />
                    <span className="text-[#C9A962] text-sm font-mono">Camera active</span>
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
