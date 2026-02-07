'use client';

import React, { useState, useEffect } from 'react';
import { blockchainService } from '../../../services/blockchainService';
import { Transaction, PoolStats } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MerchantDashboard: React.FC = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PoolStats | null>(null);

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
    fee: t.fee * 100
  }));

  const totalVolume = txs.reduce((acc, t) => acc + t.usdAmount, 0);
  const activeTxs = txs.filter(t => t.status === 'AUTHORIZED' || t.status === 'PENDING').length;

  return (
    <div className="max-w-7xl mx-auto py-8 md:py-12 px-4 space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-[3px] border-[#333] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#B87333]" />
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Protocol Monitor</h1>
              <p className="text-[#B0B0B0] text-sm">
                Network health, fee accumulation, and flow oversight
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#141414] border-[3px] border-[#333] text-[10px] font-mono uppercase tracking-wider hover:border-[#B87333] transition-colors">
            Export Logs
          </button>
          <button className="px-4 py-2 bg-[#B87333] border-[3px] border-[#B87333] text-white text-[10px] font-mono uppercase tracking-wider hover:bg-[#CD7F32] hover:border-[#CD7F32] transition-colors">
            Config Params
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Volume" 
          value={`$${totalVolume.toLocaleString()}`} 
          change="+12.5%" 
          icon={ChartIcon}
        />
        <StatCard 
          title="Fees Collected" 
          value={`$${stats?.totalFeesEarned.toFixed(2) || '0.00'}`} 
          change="+4.2%"
          icon={CoinIcon}
          highlight
        />
        <StatCard 
          title="Liquidity Depth" 
          value={`$${((stats?.totalLiquidity || 0) / 1000000).toFixed(1)}M`}
          subValue="USD"
          icon={WalletIcon}
        />
        <StatCard 
          title="Active Users" 
          value="2,482" 
          change="+142 today"
          icon={UsersIcon}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Log - Takes 2 columns */}
        <div className="lg:col-span-2 bg-[#141414] border-[3px] border-[#333]">
          <div className="p-4 md:p-6 border-b-[3px] border-[#333] flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-[#B87333]" />
              Real-time Activity
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
                Live Updates
              </span>
              <span className="text-[10px] text-[#666] ml-2">({activeTxs} active)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0a0a0a]">
                <tr className="border-b border-[#333]">
                  <th className="px-4 md:px-6 py-4 text-[10px] font-mono uppercase tracking-wider text-[#666]">TX ID</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] font-mono uppercase tracking-wider text-[#666]">Payee</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] font-mono uppercase tracking-wider text-[#666]">Amount</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] font-mono uppercase tracking-wider text-[#666]">Fee</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] font-mono uppercase tracking-wider text-[#666]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {txs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 md:px-6 py-4 font-mono text-xs text-[#B0B0B0]">{tx.id}</td>
                    <td className="px-4 md:px-6 py-4 font-mono text-xs text-[#666]">
                      {tx.payeeAddress.slice(0, 10)}...
                    </td>
                    <td className="px-4 md:px-6 py-4 font-display font-bold">
                      ${tx.usdAmount}
                    </td>
                    <td className="px-4 md:px-6 py-4 font-mono text-xs text-[#C9A962]">
                      ${tx.fee.toFixed(4)}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volume Chart - Takes 1 column */}
        <div className="bg-[#141414] border-[3px] border-[#333] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-bold">Recent Volume</h3>
            <span className="text-[10px] font-mono text-[#666]">7 Days</span>
          </div>

          <div className="h-[250px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#666' }} 
                  axisLine={{ stroke: '#333' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#666' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#1a1a1a' }}
                  contentStyle={{ 
                    backgroundColor: '#141414', 
                    border: '3px solid #333',
                    borderRadius: 0,
                    color: '#fff'
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#B87333" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 p-4 bg-[#0a0a0a] border border-[#333]">
            <p className="text-xs text-[#B0B0B0] leading-relaxed">
              Overall volume is trending up by <span className="text-[#C9A962] font-bold">18.4%</span> compared to the previous 24h window. Liquidity fulfillment is healthy.
            </p>
          </div>
        </div>
      </div>

      {/* Network Status */}
      <div className="bg-[#141414] border-[3px] border-[#333] p-6">
        <h3 className="font-display text-lg font-bold mb-6 flex items-center gap-2">
          <NetworkIcon className="w-5 h-5 text-[#B87333]" />
          Network Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthMetric label="Uptime" value="99.98%" status="good" />
          <HealthMetric label="Avg Block Time" value="12s" status="good" />
          <HealthMetric label="Gas Price" value="12 Gwei" status="warning" />
          <HealthMetric label="Pending TXs" value={activeTxs.toString()} status="good" />
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  subValue?: string;
  icon: React.FC<{ className?: string }>;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, subValue, icon: Icon, highlight }) => (
  <div className="bg-[#141414] border-[3px] border-[#333] p-5 hover:border-[#444] transition-colors">
    <div className="flex items-start justify-between mb-3">
      <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#666]">
        {title}
      </span>
      <Icon className="w-4 h-4 text-[#666]" />
    </div>
    <div className={`font-display text-xl md:text-2xl font-bold ${highlight ? 'text-[#C9A962]' : 'text-white'}`}>
      {value}
    </div>
    {change && (
      <div className="mt-1 text-[10px] text-green-500 font-mono">
        {change} <span className="text-[#666]">vs last month</span>
      </div>
    )}
    {subValue && (
      <span className="text-[10px] text-[#666] font-mono">{subValue}</span>
    )}
  </div>
);

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    'FULFILLED': 'border-green-500/30 text-green-500 bg-green-500/10',
    'PENDING': 'border-[#333] text-[#B0B0B0] bg-[#1a1a1a]',
    'HTTP_402_REQUIRED': 'border-[#B87333]/30 text-[#B87333] bg-[#B87333]/10',
    'AUTHORIZED': 'border-[#C9A962]/30 text-[#C9A962] bg-[#C9A962]/10',
    'FAILED': 'border-red-500/30 text-red-500 bg-red-500/10',
  };

  return (
    <span className={`text-[9px] font-mono uppercase px-2 py-1 border ${styles[status] || styles['PENDING']}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// Health Metric Component
interface HealthMetricProps {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'error';
}

const HealthMetric: React.FC<HealthMetricProps> = ({ label, value, status }) => {
  const statusColors = {
    good: 'bg-green-500',
    warning: 'bg-[#B87333]',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]} ${status === 'good' ? 'animate-pulse' : ''}`} />
      <div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-[#666] block">{label}</span>
        <span className="font-mono text-sm text-white">{value}</span>
      </div>
    </div>
  );
};

// Icons
const ChartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const CoinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

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
