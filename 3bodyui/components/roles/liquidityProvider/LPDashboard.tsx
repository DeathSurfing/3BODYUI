'use client';

import React, { useState, useEffect } from 'react';
import { blockchainService } from '../../../services/blockchainService';
import { Transaction, PoolStats, TransactionStatus } from '../../../types';
import { MOCK_LP_ADDRESS } from '../../../constants';

export const LPDashboard: React.FC = () => {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
  const [depositAmount, setDepositAmount] = useState<string>('');

  const refresh = () => {
    setStats(blockchainService.getPoolStats());
    setPendingRequests(blockchainService.getTransactions().filter(t => t.status === TransactionStatus.AUTHORIZED));
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDeposit = () => {
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;
    blockchainService.addLiquidity(val);
    setDepositAmount('');
    refresh();
  };

  const handleFulfill = (id: string) => {
    blockchainService.fulfillRequest(id, MOCK_LP_ADDRESS);
    refresh();
  };

  return (
    <div className="max-w-7xl mx-auto py-8 md:py-12 px-4 space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-[3px] border-[#333] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#8B7355]" />
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Liquidity Portal</h1>
              <p className="text-[#B0B0B0] text-sm">
                Earn 0.01% on every transaction fulfilled by your collateral
              </p>
            </div>
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="flex items-center gap-6 p-4 bg-[#111] border-[3px] border-[#333]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666]">Available LP Balance</div>
            <div className="font-display text-xl font-bold text-white">15,402.50 <span className="text-xs font-normal text-[#666]">USDT</span></div>
          </div>
          <div className="h-10 w-[2px] bg-[#333]" />
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666]">Earnings (YTD)</div>
            <div className="font-display text-xl font-bold text-[#C9A962]">+$842.15</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Management Side */}
        <div className="space-y-6">
          {/* Pool Strength Card */}
          <div className="bg-[#111] border-[3px] border-[#333] p-6 md:p-8 relative">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-[#8B7355]" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-[#8B7355]" />
            
            <div className="space-y-8">
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666] mb-1">Current Pool Strength</h3>
                <div className="font-display text-3xl md:text-4xl font-bold text-white">
                  ${stats?.availableLiquidity.toLocaleString()}
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="h-2 w-full bg-[#222] border border-[#333]">
                    <div 
                      className="h-full bg-[#C9A962] transition-all duration-1000" 
                      style={{ width: `${(stats?.utilizationRate || 0) * 100}%` }} 
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-mono uppercase text-[#666]">
                    <span>Utilization</span>
                    <span className="text-[#C9A962]">{((stats?.utilizationRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Deposit Section */}
              <div className="space-y-4 pt-6 border-t border-[#333]">
                <div className="relative">
                  <input 
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Add USDT liquidity..."
                    className="w-full bg-black border-[3px] border-[#333] py-4 pl-4 pr-24 text-white placeholder-[#444] focus:outline-none focus:border-[#8B7355] transition-colors font-mono"
                  />
                  <button 
                    onClick={handleDeposit}
                    className="absolute right-2 top-2 bottom-2 px-4 bg-[#8B7355] text-white text-xs font-display font-bold uppercase tracking-wider border-[3px] border-[#8B7355] hover:bg-[#C9A962] hover:border-[#C9A962] transition-colors"
                  >
                    Deposit
                  </button>
                </div>
                <p className="text-[10px] text-[#666] font-mono">
                  Liquidity is locked for 24h after each transaction. Fees are auto-compounded.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111] border-[3px] border-[#333] p-4">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#666] block mb-1">Total Staked</span>
              <span className="font-display text-lg font-bold text-white">$1.2M</span>
            </div>
            <div className="bg-[#111] border-[3px] border-[#333] p-4">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#666] block mb-1">APY</span>
              <span className="font-display text-lg font-bold text-[#C9A962]">12.4%</span>
            </div>
          </div>
        </div>

        {/* Request Fulfilment */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-[#8B7355]" />
              Market Requests
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
                Listening for AUTHORIZED 402s
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 bg-[#111] border-[3px] border-[#333] border-dashed text-[#666]">
                <SearchIcon className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm font-medium">No open swap requests found in current block</p>
                <p className="text-[10px] font-mono mt-2 text-[#444]">Waiting for new transactions...</p>
              </div>
            )}
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-[#111] border-[3px] border-[#333] p-6 flex flex-col justify-between hover:border-[#8B7355] transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666] block mb-1">Request ID</span>
                    <span className="font-mono text-xs text-[#B0B0B0]">{req.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666] block mb-1">Yield</span>
                    <span className="text-xs font-bold text-[#C9A962] font-display">+${req.fee.toFixed(4)} USDT</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="font-display text-2xl font-bold text-white mb-1">${req.usdAmount} USD</div>
                  <div className="text-xs text-[#666] font-mono">Payee: {req.payeeAddress.slice(0, 14)}...</div>
                </div>

                <button 
                  onClick={() => handleFulfill(req.id)}
                  className="w-full py-3 bg-[#222] text-white font-display font-bold text-sm uppercase tracking-wider border-[3px] border-[#333] group-hover:bg-[#8B7355] group-hover:border-[#8B7355] transition-all"
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

// Icons
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
