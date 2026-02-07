'use client';

import React, { useState, useEffect } from 'react';
import { blockchainService } from '../../../services/blockchainService';
import { Transaction, TransactionStatus } from '../../../types';
import { MOCK_WALLET_ADDRESS, EXCHANGE_RATE } from '../../../constants';

export const PayeeDashboard: React.FC = () => {
  const [usdAmount, setUsdAmount] = useState<string>('');
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    setHistory(blockchainService.getTransactions().filter(t => 
      t.payeeAddress === MOCK_WALLET_ADDRESS || t.payeeAddress.includes('Alice')
    ));
  }, [activeTx]);

  const handleInitiate = () => {
    const amount = parseFloat(usdAmount);
    if (isNaN(amount) || amount <= 0) return;
    const tx = blockchainService.createRequest(MOCK_WALLET_ADDRESS, amount);
    setActiveTx(tx);
  };

  const handlePay402 = () => {
    if (!activeTx) return;
    blockchainService.authorizePayment(activeTx.id);
    setActiveTx({ ...activeTx, status: TransactionStatus.AUTHORIZED });
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex items-center gap-4 pb-6 border-b-[3px] border-[#333]">
        <div className="w-2 h-12 bg-[#C9A962]" />
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Exchange Assets</h1>
          <p className="text-[#666] text-base md:text-lg mt-1">Convert USD to USDT via atomic smart contracts</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Main Swap Card - Takes 3 columns */}
        <div className="xl:col-span-3 space-y-8">
          <div className="bg-[#111] border-[3px] border-[#333] p-8 md:p-10 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#C9A962]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#C9A962]" />
            
            <div className="space-y-8">
              {/* Amount Input */}
              <div className="space-y-4">
                <label className="block text-sm font-mono uppercase tracking-[0.15em] text-[#C9A962]">
                  Payment Amount (USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={!!activeTx}
                    className="w-full h-20 md:h-24 bg-black border-[3px] border-[#333] pl-16 pr-6 text-3xl md:text-4xl font-mono text-white placeholder-[#333] focus:outline-none focus:border-[#C9A962] transition-colors disabled:opacity-50"
                  />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#C9A962] text-3xl md:text-4xl font-mono">$</span>
                </div>
              </div>

              {/* Exchange Info */}
              <div className="flex items-center justify-between py-6 border-y-2 border-[#222]">
                <div>
                  <span className="text-xs font-mono uppercase text-[#444] block mb-1">Exchange Rate</span>
                  <p className="font-mono text-lg text-[#888]">1 USD = {EXCHANGE_RATE} USDT</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono uppercase text-[#444] block mb-1">You Receive</span>
                  <p className="font-display text-2xl md:text-3xl font-bold text-[#C9A962]">
                    {usdAmount ? (parseFloat(usdAmount) * EXCHANGE_RATE).toFixed(2) : '0.00'} USDT
                  </p>
                </div>
              </div>

              {/* Action */}
              {!activeTx ? (
                <button
                  onClick={handleInitiate}
                  disabled={!usdAmount || parseFloat(usdAmount) <= 0}
                  className="w-full py-5 md:py-6 bg-[#C9A962] text-black font-display font-bold text-base uppercase tracking-wider border-[3px] border-[#C9A962] hover:bg-[#E8D5A3] hover:border-[#E8D5A3] disabled:opacity-50 transition-colors flex items-center justify-center gap-3"
                >
                  <SwapIcon className="w-6 h-6" />
                  Initiate Swap Request
                </button>
              ) : (
                <StatusCard transaction={activeTx} onAuthorize={handlePay402} />
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-6">
            <StatBox label="Current Balance" value="$12,450.00" />
            <StatBox label="USDT Holdings" value="8,320.50" highlight />
            <StatBox label="Today's Volume" value="$2,840.00" />
          </div>
        </div>

        {/* Transaction History - Takes 2 columns */}
        <div className="xl:col-span-2">
          <div className="bg-[#111] border-[3px] border-[#333] p-6 md:p-8 h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#222]">
              <h2 className="font-display text-xl font-bold">Transaction History</h2>
              <span className="text-sm font-mono text-[#444]">{history.length} transactions</span>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {history.length === 0 ? (
                <div className="text-center py-16 text-[#444]">
                  <p className="text-base">No transactions yet</p>
                </div>
              ) : (
                history.map((tx) => (
                  <div key={tx.id} className="bg-black border-2 border-[#222] p-5 hover:border-[#333] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-[#444]">{tx.id}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-xl">${tx.usdAmount}</span>
                      <span className="font-mono text-base text-[#C9A962]">{tx.usdtAmount} USDT</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Card Component
interface StatusCardProps {
  transaction: Transaction;
  onAuthorize: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({ transaction, onAuthorize }) => {
  const isAuthorized = transaction.status === TransactionStatus.AUTHORIZED;

  return (
    <div className={`border-[3px] p-6 space-y-4 ${
      isAuthorized 
        ? 'border-[#C9A962] bg-[#C9A962]/5' 
        : 'border-[#B87333] bg-[#B87333]/5'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 flex items-center justify-center border-[3px] ${
          isAuthorized ? 'border-[#C9A962]' : 'border-[#B87333]'
        }`}>
          {isAuthorized ? (
            <ClockIcon className="w-7 h-7 text-[#C9A962]" />
          ) : (
            <AlertIcon className="w-7 h-7 text-[#B87333]" />
          )}
        </div>
        <div className="flex-1">
          <h3 className={`font-display font-bold text-lg ${isAuthorized ? 'text-[#C9A962]' : 'text-[#B87333]'}`}>
            {isAuthorized ? 'Waiting for Liquidity Provider' : 'HTTP 402: Payment Required'}
          </h3>
          <p className="font-mono text-xs text-[#444] mt-1">{transaction.id}</p>
        </div>
      </div>

      {isAuthorized ? (
        <p className="text-sm text-[#C9A962]">Waiting for liquidity provider to fulfill this transaction...</p>
      ) : (
        <button
          onClick={onAuthorize}
          className="w-full py-4 bg-[#B87333] text-white font-display font-bold text-sm uppercase tracking-wider border-[3px] border-[#B87333] hover:bg-[#CD7F32] transition-colors"
        >
          Authorize Smart Contract Payment
        </button>
      )}
    </div>
  );
};

// Stat Box
const StatBox: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ 
  label, value, highlight 
}) => (
  <div className="bg-[#111] border-[3px] border-[#333] p-6">
    <span className="text-xs font-mono uppercase text-[#444] block mb-2">{label}</span>
    <span className={`font-display text-xl md:text-2xl font-bold ${highlight ? 'text-[#C9A962]' : 'text-white'}`}>
      {value}
    </span>
  </div>
);

// Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    'FULFILLED': 'border-green-500/30 text-green-500',
    'PENDING': 'border-[#333] text-[#666]',
    'HTTP_402_REQUIRED': 'border-[#B87333]/30 text-[#B87333]',
    'AUTHORIZED': 'border-[#C9A962]/30 text-[#C9A962]',
    'FAILED': 'border-red-500/30 text-red-500',
  };

  return (
    <span className={`text-xs font-mono uppercase px-2 py-1 border ${colors[status] || colors['PENDING']}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// Icons
const SwapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
