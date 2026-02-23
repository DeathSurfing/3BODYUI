'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Transaction, PoolStats, TransactionStatus } from '../../../types';
import { MOCK_LP_ADDRESS } from '../../../constants';

function normalizeTransactions(payload: unknown): Transaction[] {
  if (Array.isArray(payload)) {
    return payload as Transaction[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { transactions?: unknown }).transactions)
  ) {
    return (payload as { transactions: Transaction[] }).transactions;
  }

  return [];
}

export const LPDashboard: React.FC = () => {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      setError('');

      const [exposure, txResponse] = await Promise.all([
        apiClient.getLiquidityExposure(),
        apiClient.listTransactions(),
      ]);

      const txs = normalizeTransactions(txResponse);
      setStats(exposure);
      setPendingRequests(
        txs.filter(
          (t) =>
            t.status === TransactionStatus.AUTHORIZED ||
            t.status === TransactionStatus.HTTP_402_REQUIRED
        )
      );
    } catch {
      setError('Failed to load liquidity provider data');
    }
  };

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDeposit = async () => {
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;

    setIsSubmitting(true);
    try {
      await apiClient.depositLiquidity({ amount: val });
      setDepositAmount('');
      await refresh();
    } catch {
      setError('Failed to submit deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFulfill = async (id: string) => {
    setIsSubmitting(true);
    try {
      await apiClient.executeTransaction({
        transactionId: id,
        lpAddress: MOCK_LP_ADDRESS,
      });
      await refresh();
    } catch {
      setError('Failed to fulfill transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b-[3px] border-[#333]">
        <div className="flex items-center gap-4">
          <div className="w-2 h-12 bg-[#8B7355]" />
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Liquidity Portal</h1>
            <p className="text-[#666] text-base md:text-lg mt-1">Earn 0.01% on every transaction fulfilled by your collateral</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 p-6 bg-[#111] border-[3px] border-[#333]">
          <div>
            <span className="text-sm font-mono uppercase text-[#444] block mb-1">Available Balance</span>
            <p className="font-display text-2xl font-bold">15,402 <span className="text-base text-[#666]">USDT</span></p>
          </div>
          <div className="w-[2px] h-12 bg-[#333]" />
          <div>
            <span className="text-sm font-mono uppercase text-[#444] block mb-1">Earnings (YTD)</span>
            <p className="font-display text-2xl font-bold text-[#C9A962]">+$842.15</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Pool Management */}
        <div className="space-y-8">
          <div className="bg-[#111] border-[3px] border-[#333] p-8 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#8B7355]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#8B7355]" />
            
            <div className="space-y-8">
              <div>
                <span className="text-sm font-mono uppercase text-[#444] block mb-2">Current Pool Strength</span>
                <p className="font-display text-4xl font-bold">${stats?.availableLiquidity.toLocaleString()}</p>
                
                <div className="mt-6">
                  <div className="h-3 bg-[#222] border-2 border-[#333]">
                    <div 
                      className="h-full bg-[#C9A962] transition-all duration-1000" 
                      style={{ width: `${(stats?.utilizationRate || 0) * 100}%` }} 
                    />
                  </div>
                  <div className="flex justify-between mt-3">
                    <span className="text-sm font-mono text-[#444]">Utilization</span>
                    <span className="text-sm font-mono text-[#C9A962]">{((stats?.utilizationRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t-2 border-[#222]">
                <div className="relative">
                  <input 
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Add USDT liquidity..."
                    className="w-full bg-black border-[3px] border-[#333] py-5 pl-5 pr-28 text-lg text-white placeholder-[#333] focus:outline-none focus:border-[#8B7355] font-mono"
                  />
                  <button 
                    onClick={handleDeposit}
                    disabled={isSubmitting}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-[#8B7355] text-white text-sm font-bold uppercase border-[3px] border-[#8B7355] hover:bg-[#C9A962] hover:border-[#C9A962] transition-colors disabled:opacity-60"
                  >
                    Deposit
                  </button>
                </div>
                <p className="text-sm text-[#444] font-mono mt-3">Liquidity is locked for 24h after each transaction</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#111] border-[3px] border-[#333] p-6">
              <span className="text-sm font-mono uppercase text-[#444] block mb-2">Total Staked</span>
              <span className="font-display text-2xl font-bold">$1.2M</span>
            </div>
            <div className="bg-[#111] border-[3px] border-[#333] p-6">
              <span className="text-sm font-mono uppercase text-[#444] block mb-2">APY</span>
              <span className="font-display text-2xl font-bold text-[#C9A962]">12.4%</span>
            </div>
          </div>
        </div>

        {/* Market Requests */}
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold flex items-center gap-3">
              <ActivityIcon className="w-6 h-6 text-[#8B7355]" />
              Market Requests
            </h2>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-[#444]">Listening for requests...</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {error && (
              <div className="col-span-2 bg-red-500/10 border-[3px] border-red-500/30 p-4 text-red-300 text-sm font-mono">
                {error}
              </div>
            )}

            {pendingRequests.length === 0 && (
              <div className="col-span-2 py-20 bg-[#111] border-[3px] border-[#333] border-dashed text-center">
                <SearchIcon className="w-16 h-16 mx-auto mb-6 text-[#333]" />
                <p className="text-xl text-[#666] mb-2">No open requests</p>
                <p className="text-base font-mono text-[#444]">Waiting for new transactions...</p>
              </div>
            )}
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-[#111] border-[3px] border-[#333] p-8 hover:border-[#8B7355] transition-colors">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="text-sm font-mono uppercase text-[#444] block mb-1">Request ID</span>
                    <span className="font-mono text-base text-[#666]">{req.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono uppercase text-[#444] block mb-1">Your Yield</span>
                    <span className="text-lg font-bold text-[#C9A962]">+${req.fee.toFixed(4)} USDT</span>
                  </div>
                </div>
                
                <div className="mb-8">
                  <p className="font-display text-3xl font-bold mb-2">${req.usdAmount} USD</p>
                  <p className="text-sm text-[#444] font-mono">Payee: {req.payeeAddress.slice(0, 16)}...</p>
                </div>

                <button 
                  onClick={() => handleFulfill(req.id)}
                  disabled={isSubmitting}
                  className="w-full py-5 bg-[#222] text-white font-display font-bold text-base uppercase tracking-wider border-[3px] border-[#333] hover:bg-[#8B7355] hover:border-[#8B7355] transition-all disabled:opacity-60"
                >
                  Fulfill Transaction
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);
