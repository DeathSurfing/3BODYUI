
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
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Liquidity Portal</h1>
          <p className="text-gray-500">Earn { (0.0001 * 100).toFixed(2) }% on every transaction fulfilled by your collateral.</p>
        </div>
        <div className="flex items-center gap-6 p-4 bg-white rounded-2xl border border-gray-100">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Available LP Balance</div>
            <div className="text-xl font-bold text-black font-mono">15,402.50 <span className="text-xs font-normal">USDT</span></div>
          </div>
          <div className="h-10 w-[1px] bg-gray-100" />
          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase">Earnings (YTD)</div>
            <div className="text-xl font-bold text-green-600 font-mono">+$842.15</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Management Side */}
        <div className="space-y-6">
          <div className="bg-black text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
             <div className="relative z-10 space-y-8">
                <div>
                  <h3 className="text-gray-400 text-sm font-medium mb-1">Current Pool Strength</h3>
                  <div className="text-4xl font-bold">${stats?.availableLiquidity.toLocaleString()}</div>
                  <div className="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-1000" 
                      style={{ width: `${(stats?.utilizationRate || 0) * 100}%` }} 
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-gray-500 uppercase font-bold">
                    <span>Utilization</span>
                    <span>{((stats?.utilizationRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="relative">
                    <input 
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Add USDT liquidity..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-4 pr-20 text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40 transition-all font-mono"
                    />
                    <button 
                      onClick={handleDeposit}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      DEPOSIT
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">Liquidity is locked for 24h after each transaction. Fees are auto-compounded.</p>
                </div>
             </div>
             {/* Decorative background circle */}
             <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Request Fulfilment */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Market Requests</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500 font-medium">Listening for AUTHORIZED 402s...</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-24 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <p className="text-sm font-medium">No open swap requests found in current block.</p>
              </div>
            )}
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between hover:border-black transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Request ID</span>
                    <span className="font-mono text-xs">{req.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Yield</span>
                    <span className="text-xs font-bold text-green-600">+${req.fee.toFixed(4)} USDT</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="text-2xl font-bold mb-1">${req.usdAmount} USD</div>
                  <div className="text-xs text-gray-400">Payee: {req.payeeAddress.slice(0, 14)}...</div>
                </div>

                <button 
                  onClick={() => handleFulfill(req.id)}
                  className="w-full py-3 bg-gray-50 text-gray-900 font-bold text-sm rounded-xl group-hover:bg-black group-hover:text-white transition-all shadow-sm"
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
