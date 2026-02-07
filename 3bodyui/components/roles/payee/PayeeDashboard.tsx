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
    <div className="max-w-6xl mx-auto py-8 md:py-12 px-4 space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="space-y-2 border-b-[3px] border-[#333] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-[#C9A962]" />
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Exchange Assets</h1>
            <p className="text-[#B0B0B0] text-sm">
              Convert USD to USDT via atomic smart contracts
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        {/* Action Panel - Takes 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Swap Card */}
          <div className="bg-[#141414] border-[3px] border-[#333] p-6 md:p-8 relative">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-[#C9A962]" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-[#C9A962]" />
            
            <div className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-3">
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#C9A962]">
                  Payment Amount (USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={!!activeTx}
                    className="w-full h-16 md:h-20 bg-[#0a0a0a] border-[3px] border-[#333] pl-14 pr-4 text-2xl md:text-3xl font-mono text-white placeholder-[#444] focus:outline-none focus:border-[#C9A962] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#C9A962] text-2xl md:text-3xl font-mono">$</span>
                </div>
              </div>

              {/* Exchange Info */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-[#333]">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666]">Exchange Rate</span>
                  <p className="font-mono text-[#B0B0B0]">1 USD = {EXCHANGE_RATE} USDT</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666] block">You Receive</span>
                  <p className="font-display text-xl md:text-2xl font-bold text-[#C9A962]">
                    {usdAmount ? (parseFloat(usdAmount) * EXCHANGE_RATE).toFixed(2) : '0.00'} USDT
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {!activeTx ? (
                <button
                  onClick={handleInitiate}
                  disabled={!usdAmount || parseFloat(usdAmount) <= 0}
                  className="w-full py-4 md:py-5 bg-[#C9A962] text-[#0a0a0a] font-display font-bold text-sm md:text-base uppercase tracking-wider border-[3px] border-[#C9A962] hover:bg-[#E8D5A3] hover:border-[#E8D5A3] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3"
                >
                  <SwapIcon className="w-5 h-5" />
                  Initiate Swap Request
                </button>
              ) : (
                <StatusCard transaction={activeTx} onAuthorize={handlePay402} />
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoCard 
              label="Current Balance" 
              value="$12,450.00" 
              subValue="USD" 
            />
            <InfoCard 
              label="USDT Holdings" 
              value="8,320.50" 
              subValue="USDT"
              highlight
            />
            <InfoCard 
              label="Today's Volume" 
              value="$2,840.00" 
              subValue="5 transactions" 
            />
          </div>
        </div>

        {/* Transaction History - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-[#141414] border-[3px] border-[#333] p-6 h-full">
            <div className="flex items-center justify-between mb-6 border-b border-[#333] pb-4">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-[#C9A962]" />
                Transaction History
              </h2>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
                Recent
              </span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {history.length === 0 ? (
                <div className="text-center py-12 text-[#666]">
                  <div className="w-12 h-12 mx-auto mb-3 border-2 border-[#333] rounded-full flex items-center justify-center">
                    <HistoryIcon className="w-5 h-5" />
                  </div>
                  <p className="text-sm">No recent swaps found</p>
                </div>
              ) : (
                history.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
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
    <div className={`border-[3px] p-5 space-y-4 ${
      isAuthorized 
        ? 'border-[#C9A962] bg-[#C9A962]/5' 
        : 'border-[#B87333] bg-[#B87333]/5'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 flex items-center justify-center border-[3px] ${
          isAuthorized ? 'border-[#C9A962] bg-[#C9A962]/20' : 'border-[#B87333] bg-[#B87333]/20'
        }`}>
          {isAuthorized ? (
            <ClockIcon className="w-6 h-6 text-[#C9A962]" />
          ) : (
            <AlertIcon className="w-6 h-6 text-[#B87333]" />
          )}
        </div>
        <div className="flex-1">
          <h3 className={`font-display font-bold ${isAuthorized ? 'text-[#C9A962]' : 'text-[#B87333]'}`}>
            {isAuthorized ? 'Waiting for Liquidity Provider' : 'HTTP 402: Payment Required'}
          </h3>
          <p className="font-mono text-xs text-[#666] mt-1">
            Request ID: {transaction.id}
          </p>
        </div>
      </div>

      {isAuthorized ? (
        <div className="text-xs text-[#C9A962] bg-[#C9A962]/10 p-3 border border-[#C9A962]/30">
          Payment authorized. Waiting for a Liquidity Provider to fulfill this transaction.
          <span className="block mt-1 text-[#666]">Do not close this window.</span>
        </div>
      ) : (
        <button
          onClick={onAuthorize}
          className="w-full py-3 bg-[#B87333] text-white font-display font-bold text-sm uppercase tracking-wider border-[3px] border-[#B87333] hover:bg-[#CD7F32] hover:border-[#CD7F32] transition-all duration-200"
        >
          Authorize Smart Contract Payment
        </button>
      )}
    </div>
  );
};

// Transaction Item Component
const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const statusColors = {
    [TransactionStatus.FULFILLED]: 'border-green-500/30 text-green-500 bg-green-500/10',
    [TransactionStatus.PENDING]: 'border-[#333] text-[#B0B0B0] bg-[#1a1a1a]',
    [TransactionStatus.HTTP_402_REQUIRED]: 'border-[#B87333]/30 text-[#B87333] bg-[#B87333]/10',
    [TransactionStatus.AUTHORIZED]: 'border-[#C9A962]/30 text-[#C9A962] bg-[#C9A962]/10',
    [TransactionStatus.FAILED]: 'border-red-500/30 text-red-500 bg-red-500/10',
  };

  return (
    <div className="bg-[#0a0a0a] border-[3px] border-[#222] p-4 hover:border-[#333] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-[#666]">{transaction.id}</span>
        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 border ${statusColors[transaction.status]}`}>
          {transaction.status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-bold">${transaction.usdAmount}</p>
          <p className="text-[10px] text-[#666] font-mono">
            {new Date(transaction.timestamp).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-[#C9A962]">+{transaction.usdtAmount} USDT</p>
          <p className="text-[10px] text-[#666]">Fee: ${transaction.fee.toFixed(4)}</p>
        </div>
      </div>
    </div>
  );
};

// Info Card Component
interface InfoCardProps {
  label: string;
  value: string;
  subValue: string;
  highlight?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value, subValue, highlight }) => (
  <div className="bg-[#141414] border-[3px] border-[#333] p-4">
    <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#666] block mb-1">
      {label}
    </span>
    <p className={`font-display text-lg md:text-xl font-bold ${highlight ? 'text-[#C9A962]' : 'text-white'}`}>
      {value}
    </p>
    <span className="text-[10px] text-[#666] font-mono">{subValue}</span>
  </div>
);

// Icons
const SwapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
