'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient, UsdtInrQuoteResponse } from '@/lib/api/client';
import { MOCK_WALLET_ADDRESS } from '@/constants';
import { QRScanner } from '../../QRScanner';

interface PriceData {
  usdtPriceInInr: number;
  usdtPriceInUsd: number;
  priceChange24h: number;
  lastUpdated: Date;
}

function normalizeQuote(quote: UsdtInrQuoteResponse): PriceData {
  const inrRate = quote.usdtPriceInInr ?? quote.rate ?? 83.15;
  return {
    usdtPriceInInr: inrRate,
    usdtPriceInUsd: quote.usdtPriceInUsd ?? 1,
    priceChange24h: quote.priceChange24h ?? 0,
    lastUpdated: quote.lastUpdated ? new Date(quote.lastUpdated) : new Date(),
  };
}

export const PayeeDashboard: React.FC = () => {
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  
  // Price data state
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Countdown timer state
  const [countdown, setCountdown] = useState(30);
  
  // QR Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');

  // Fetch wallet + quote data from API routes
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const [wallet, quote] = await Promise.all([
        apiClient.getWalletBalance(),
        apiClient.getUsdtInrQuote(1),
      ]);

      setUsdtBalance(wallet.usdt ?? 0);
      setPriceData(normalizeQuote(quote));
      setCountdown(30); // Reset countdown
    } catch {
      setError('Failed to fetch wallet/price data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    void fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const priceInterval = setInterval(() => {
      void fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(priceInterval);
  }, [fetchDashboardData]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle QR scan
  const handleScan = async (data: string) => {
    setScannedData(data);

    try {
      const parsed = JSON.parse(data) as {
        data?: {
          amount?: string;
          orderId?: string;
          merchantWallet?: string;
        };
      };

      const usdAmount = Number(parsed?.data?.amount);
      if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
        throw new Error('Invalid amount in QR');
      }

      const created = await apiClient.createTransaction({
        payeeAddress: MOCK_WALLET_ADDRESS,
        usdAmount,
        orderId: parsed?.data?.orderId,
        merchantWallet: parsed?.data?.merchantWallet,
        source: 'qr-scan',
      });

      alert(`Payment request created.\nID: ${created.id}\nStatus: ${created.status}`);
      await fetchDashboardData();
    } catch {
      alert('Invalid QR payload. Expected 3 Body payment QR JSON format.');
    }
  };

  // Calculate portfolio values
  const portfolioValueUSD = usdtBalance * (priceData?.usdtPriceInUsd || 1);
  const portfolioValueINR = usdtBalance * (priceData?.usdtPriceInInr || 83.15);

  // Format currency
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />

      {/* Header */}
      <header className="flex items-center gap-4 pb-6 border-b-[3px] border-[#333]">
        <div className="w-2 h-12 bg-[#C9A962]" />
        <div className="flex-1">
          <h1 className="font-display text-3xl md:text-4xl font-bold">Payee Wallet</h1>
          <p className="text-[#666] text-base md:text-lg mt-1">Scan QR codes to pay merchants</p>
        </div>
      </header>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="flex-1 py-5 bg-[#C9A962] text-black font-display font-bold text-lg uppercase tracking-wider border-[3px] border-[#C9A962] hover:bg-[#E8D5A3] hover:border-[#E8D5A3] transition-colors flex items-center justify-center gap-3"
        >
          <ScanIcon className="w-6 h-6" />
          Scan QR to Pay
        </button>

        <div className="flex items-center gap-4 px-6 py-4 bg-[#111] border-[3px] border-[#333]">
          <div className="text-center">
            <span className="text-[10px] font-mono uppercase text-[#444] block">Next Update</span>
            <span className="font-mono text-xl text-[#C9A962]">⏱️ {countdown}s</span>
          </div>
          <div className="w-[2px] h-10 bg-[#333]" />
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="p-3 border-[3px] border-[#333] hover:border-[#C9A962] disabled:opacity-50 transition-colors"
          >
            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Total Portfolio Value */}
      <div className="bg-[#111] border-[3px] border-[#333] p-8 relative">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#C9A962]" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#C9A962]" />
        
        <div className="text-center">
          <span className="text-sm font-mono uppercase tracking-[0.15em] text-[#666] block mb-4">
            Total Portfolio Value
          </span>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <span className="font-display text-5xl md:text-6xl font-bold text-white">
                {isLoading ? '...' : formatUSD(portfolioValueUSD)}
              </span>
              <span className="block text-sm font-mono text-[#666] mt-2">USD</span>
            </div>
            <div>
              <span className="font-display text-5xl md:text-6xl font-bold text-[#C9A962]">
                {isLoading ? '...' : formatINR(portfolioValueINR)}
              </span>
              <span className="block text-sm font-mono text-[#666] mt-2">INR</span>
            </div>
          </div>
        </div>
      </div>

      {/* USDT Balance Card */}
      <div className="bg-[#111] border-[3px] border-[#333] p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Balance Display */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#26A17B] flex items-center justify-center">
              <span className="font-display font-bold text-white text-2xl">₮</span>
            </div>
            <div>
              <span className="text-sm font-mono uppercase text-[#666] block">USDT Balance</span>
              <span className="font-display text-4xl font-bold">{usdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-sm font-mono text-[#26A17B] ml-2">USDT</span>
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="text-right">
              <span className="text-xs font-mono uppercase text-[#444] block">USD Rate</span>
              <span className="font-mono text-xl">
                ${priceData?.usdtPriceInUsd.toFixed(4) || '1.0000'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono uppercase text-[#444] block">INR Rate</span>
              <span className="font-mono text-xl text-[#C9A962]">
                ₹{priceData?.usdtPriceInInr.toFixed(2) || '83.15'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono uppercase text-[#444] block">24h Change</span>
              <span className={`font-mono text-xl ${
                (priceData?.priceChange24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {(priceData?.priceChange24h || 0) >= 0 ? '+' : ''}
                {(priceData?.priceChange24h || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-6 pt-6 border-t border-[#222] flex items-center justify-between">
          <span className="text-xs font-mono text-[#444]">
            Last updated: {priceData?.lastUpdated.toLocaleTimeString() || 'Never'}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-[#444]">Live Rates</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border-[3px] border-red-500/30 p-4 flex items-center gap-3">
          <AlertIcon className="w-5 h-5 text-red-500" />
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={fetchDashboardData}
            className="ml-auto text-xs font-mono uppercase text-red-400 hover:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {scannedData && (
        <div className="bg-[#111] border-[3px] border-[#333] p-4">
          <span className="text-xs font-mono uppercase text-[#666] block mb-2">Last Scanned Payload</span>
          <p className="font-mono text-xs text-[#888] break-all">{scannedData}</p>
        </div>
      )}
    </div>
  );
};

// Icons
const ScanIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V6a3 3 0 013-3h1.5m13.5 0h1.5a3 3 0 013 3v1.5m0 13.5V18a3 3 0 01-3 3h-1.5m-13.5 0H6a3 3 0 01-3-3v-1.5m9-9v6m-3-3h6" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
