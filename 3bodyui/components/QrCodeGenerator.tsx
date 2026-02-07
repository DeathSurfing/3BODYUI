'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  merchantWallet: string;
}

interface PaymentData {
  merchantWallet: string;
  amount: string;
  currency: string;
  description: string;
  timestamp: number;
  orderId: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  isOpen,
  onClose,
  merchantWallet,
}) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USDT');
  const [description, setDescription] = useState('');
  const [generatedQR, setGeneratedQR] = useState<string>('');
  const [showQR, setShowQR] = useState(false);

  const generateQRCode = () => {
    const paymentData: PaymentData = {
      merchantWallet,
      amount,
      currency,
      description: description || 'Payment to merchant',
      timestamp: Date.now(),
      orderId: `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    };

    // Create a structured JSON string for the QR code
    const qrData = JSON.stringify({
      type: '3body-payment',
      version: '1.0',
      data: paymentData,
    });

    setGeneratedQR(qrData);
    setShowQR(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedQR);
    alert('Payment data copied to clipboard!');
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setShowQR(false);
    setGeneratedQR('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b-[3px] border-[#333] bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <div className="w-3 h-10 bg-[#B87333]" />
          <div>
            <h2 className="font-display text-2xl font-bold">Generate Payment QR</h2>
            <p className="text-[#666] text-sm">Create QR code for customer payment</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-12 h-12 border-[3px] border-[#333] flex items-center justify-center hover:border-[#B87333] transition-colors"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <div className="bg-[#111] border-[3px] border-[#333] p-6">
              <h3 className="font-display text-lg font-bold mb-6">Payment Details</h3>

              {/* Merchant Wallet (Read-only) */}
              <div className="space-y-2 mb-6">
                <label className="text-sm font-mono uppercase text-[#666]">Merchant Wallet</label>
                <div className="bg-black border-[3px] border-[#333] p-3 font-mono text-sm text-[#888] break-all">
                  {merchantWallet}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2 mb-6">
                <label className="text-sm font-mono uppercase text-[#B87333]">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black border-[3px] border-[#333] p-4 pl-12 text-xl font-mono text-white placeholder-[#333] focus:outline-none focus:border-[#B87333]"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333] text-xl">$</span>
                </div>
              </div>

              {/* Currency Select */}
              <div className="space-y-2 mb-6">
                <label className="text-sm font-mono uppercase text-[#666]">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-black border-[3px] border-[#333] p-4 text-white font-mono focus:outline-none focus:border-[#B87333]"
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                  <option value="DAI">DAI</option>
                </select>
              </div>

              {/* Description Input */}
              <div className="space-y-2 mb-6">
                <label className="text-sm font-mono uppercase text-[#666]">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Payment for Order #1234"
                  className="w-full bg-black border-[3px] border-[#333] p-4 text-white placeholder-[#333] focus:outline-none focus:border-[#B87333]"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={generateQRCode}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-4 bg-[#B87333] text-white font-display font-bold text-base uppercase tracking-wider border-[3px] border-[#B87333] hover:bg-[#CD7F32] hover:border-[#CD7F32] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate QR Code
              </button>
            </div>
          </div>

          {/* QR Code Display Section */}
          <div className="space-y-6">
            {showQR ? (
              <div className="bg-white border-[3px] border-[#333] p-8 text-center">
                <div className="inline-block p-6 bg-white">
                  <QRCodeSVG
                    value={generatedQR}
                    size={280}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: '',
                      height: 0,
                      width: 0,
                      excavate: false,
                    }}
                  />
                </div>

                <div className="mt-6 space-y-4">
                  <div className="bg-[#111] border-[3px] border-[#333] p-4">
                    <p className="text-xs font-mono uppercase text-[#666] mb-1">Amount</p>
                    <p className="font-display text-2xl font-bold text-[#B87333]">
                      ${amount} {currency}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 py-3 bg-[#333] text-white font-display font-bold text-sm uppercase border-[3px] border-[#333] hover:border-[#B87333] transition-colors"
                    >
                      Copy Data
                    </button>
                    <button
                      onClick={resetForm}
                      className="flex-1 py-3 bg-[#111] text-white font-display font-bold text-sm uppercase border-[3px] border-[#333] hover:border-[#B87333] transition-colors"
                    >
                      New QR
                    </button>
                  </div>

                  <p className="text-xs text-[#666] font-mono">
                    Customer can scan this QR code to pay
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#111] border-[3px] border-[#333] border-dashed p-12 flex flex-col items-center justify-center h-full min-h-[400px]">
                <QRPlaceholderIcon className="w-24 h-24 text-[#333] mb-4" />
                <p className="text-[#666] text-lg">QR code will appear here</p>
                <p className="text-[#444] text-sm mt-2">Enter amount and click Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const QRPlaceholderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
  </svg>
);
