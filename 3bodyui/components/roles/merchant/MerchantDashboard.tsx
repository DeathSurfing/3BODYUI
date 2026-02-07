'use client';

import React, { useState, useEffect } from 'react';
import { blockchainService } from '../../../services/blockchainService';
import { Transaction, PoolStats } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { QRCodeGenerator } from '../../QrCodeGenerator';

// Mock merchant wallet - in production this would come from connected wallet
const MERCHANT_WALLET = "0xMerchant...789ABC";

export const MerchantDashboard: React.FC = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);

  useEffect(() => {
    const fetchData = () => {
      setTxs(blockchainService.getTransactions());
      setStats(blockchainService.getPoolStats());
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartData = txs.slice(0, 7).reverse().map(t => ({
    name: t.id.split('-')[1],
    amount: t.usdAmount,
  }));

  const totalVolume = txs.reduce((acc, t) => acc + t.usdAmount, 0);
  const activeTxs = txs.filter(t => t.status === 'AUTHORIZED' || t.status === 'PENDING').length;

  return (
    <div className="space-y-10">
      {/* QR Code Generator Modal */}
      <QRCodeGenerator
        isOpen={isQRGeneratorOpen}
        onClose={() => setIsQRGeneratorOpen(false)}
        merchantWallet={MERCHANT_WALLET}
      />

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b-[3px] border-[#333]">
        <div className="flex items-center gap-4">
          <div className="w-2 h-12 bg-[#B87333]" />
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Protocol Monitor</h1>
            <p className="text-[#666] text-base md:text-lg mt-1">Network health and transaction flows</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setIsQRGeneratorOpen(true)}
            className="px-6 py-4 bg-[#C9A962] border-[3px] border-[#C9A962] text-black font-display font-bold text-sm uppercase tracking-wider hover:bg-[#E8D5A3] hover:border-[#E8D5A3] transition-colors flex items-center gap-2"
          >
            <QRIcon className="w-5 h-5" />
            Generate Payment QR
          </button>
          <button className="px-6 py-4 bg-[#111] border-[3px] border-[#333] text-sm font-mono uppercase tracking-wider hover:border-[#B87333] transition-colors">
            Export Logs
          </button>
          <button className="px-6 py-4 bg-[#B87333] border-[3px] border-[#B87333] text-white text-sm font-mono uppercase tracking-wider hover:bg-[#CD7F32] hover:border-[#CD7F32] transition-colors">
            Config Params
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatBox title="Total Volume" value={`$${totalVolume.toLocaleString()}`} change="+12.5%" />
        <StatBox title="Fees Collected" value={`$${stats?.totalFeesEarned.toFixed(2) || '0.00'}`} change="+4.2%" highlight />
        <StatBox title="Liquidity Depth" value={`$${((stats?.totalLiquidity || 0) / 1000000).toFixed(1)}M`} />
        <StatBox title="Active Users" value="2,482" change="+142 today" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Transaction Log */}
        <div className="xl:col-span-2 bg-[#111] border-[3px] border-[#333]">
          <div className="p-6 border-b-[3px] border-[#333] flex items-center justify-between">
            <h3 className="font-display text-xl font-bold flex items-center gap-3">
              <ActivityIcon className="w-6 h-6 text-[#B87333]" />
              Real-time Activity
            </h3>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-[#444]">Live ({activeTxs} active)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black">
                <tr className="border-b-2 border-[#222]">
                  <th className="px-6 py-5 text-xs font-mono uppercase text-[#444]">Transaction ID</th>
                  <th className="px-6 py-5 text-xs font-mono uppercase text-[#444]">Payee</th>
                  <th className="px-6 py-5 text-xs font-mono uppercase text-[#444]">Amount</th>
                  <th className="px-6 py-5 text-xs font-mono uppercase text-[#444]">Fee</th>
                  <th className="px-6 py-5 text-xs font-mono uppercase text-[#444]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#222]">
                {txs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-5 font-mono text-sm text-[#666]">{tx.id}</td>
                    <td className="px-6 py-5 font-mono text-sm text-[#444]">
                      {tx.payeeAddress.slice(0, 12)}...
                    </td>
                    <td className="px-6 py-5 font-display font-bold text-lg">${tx.usdAmount}</td>
                    <td className="px-6 py-5 font-mono text-sm text-[#C9A962]">${tx.fee.toFixed(4)}</td>
                    <td className="px-6 py-5">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="bg-[#111] border-[3px] border-[#333] p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display text-xl font-bold">Recent Volume</h3>
            <span className="text-sm font-mono text-[#444]">Last 7 Days</span>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis tick={{ fontSize: 12, fill: '#444' }} axisLine={{ stroke: '#333' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#444' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1a1a1a' }}
                  contentStyle={{ backgroundColor: '#111', border: '3px solid #333', borderRadius: 0 }}
                />
                <Bar dataKey="amount" fill="#B87333" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8 p-6 bg-black border-2 border-[#222]">
            <p className="text-base text-[#666]">
              Overall volume is trending up by <span className="text-[#C9A962] font-bold">18.4%</span> compared to the previous 24h window.
            </p>
          </div>
        </div>
      </div>

      {/* Network Health */}
      <div className="bg-[#111] border-[3px] border-[#333] p-6 md:p-8">
        <h3 className="font-display text-xl font-bold mb-8 flex items-center gap-3">
          <NetworkIcon className="w-6 h-6 text-[#B87333]" />
          Network Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <HealthMetric label="Uptime" value="99.98%" status="good" />
          <HealthMetric label="Avg Block Time" value="12s" status="good" />
          <HealthMetric label="Gas Price" value="12 Gwei" status="good" />
          <HealthMetric label="Pending TXs" value={activeTxs.toString()} status="warning" />
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ title: string; value: string; change?: string; highlight?: boolean }> = ({ 
  title, value, change, highlight 
}) => (
  <div className="bg-[#111] border-[3px] border-[#333] p-6">
    <span className="text-xs font-mono uppercase text-[#444] block mb-3">{title}</span>
    <div className={`font-display text-2xl font-bold ${highlight ? 'text-[#C9A962]' : 'text-white'}`}>
      {value}
    </div>
    {change && (
      <div className="mt-2 text-sm text-green-500 font-mono">{change}</div>
    )}
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    'FULFILLED': 'border-green-500/30 text-green-500',
    'PENDING': 'border-[#333] text-[#666]',
    'HTTP_402_REQUIRED': 'border-[#B87333]/30 text-[#B87333]',
    'AUTHORIZED': 'border-[#C9A962]/30 text-[#C9A962]',
    'FAILED': 'border-red-500/30 text-red-500',
  };

  return (
    <span className={`text-xs font-mono uppercase px-3 py-1.5 border ${styles[status] || styles['PENDING']}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

const HealthMetric: React.FC<{ label: string; value: string; status: 'good' | 'warning' | 'error' }> = ({ 
  label, value, status 
}) => {
  const colors = { good: 'bg-green-500', warning: 'bg-[#B87333]', error: 'bg-red-500' };
  
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${colors[status]} ${status === 'good' ? 'animate-pulse' : ''}`} />
      <div>
        <span className="text-sm font-mono uppercase text-[#444] block">{label}</span>
        <span className="font-mono text-lg text-white">{value}</span>
      </div>
    </div>
  );
};

const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const NetworkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
  </svg>
);

const QRIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
  </svg>
);
