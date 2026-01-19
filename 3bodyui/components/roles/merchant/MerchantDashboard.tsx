
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
    fee: t.fee * 100 // Visual scaling
  }));

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Protocol Monitor</h1>
          <p className="text-gray-500">Network health, fee accumulation, and flow oversight.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-black transition-all">
            Export Logs
          </button>
          <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-all">
            Config Params
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Volume" value={`$${txs.reduce((acc, t) => acc + t.usdAmount, 0).toLocaleString()}`} change="+12.5%" />
        <StatCard title="Fees Collected" value={`$${stats?.totalFeesEarned.toFixed(2) || '0.00'}`} change="+4.2%" />
        <StatCard title="Liquidity Depth" value={`$${(stats?.totalLiquidity || 0 / 1000000).toFixed(1)}M`} color="text-indigo-600" />
        <StatCard title="Active Users" value="2,482" change="+142 today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction Log */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold">Real-time Activity</h3>
            <span className="text-xs font-mono text-gray-400">Live Updates Enabled</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-3">TX ID</th>
                  <th className="px-6 py-3">Payee</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Fee</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {txs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{tx.id}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{tx.payeeAddress.slice(0, 10)}...</td>
                    <td className="px-6 py-4 font-bold text-sm">${tx.usdAmount}</td>
                    <td className="px-6 py-4 text-xs text-green-600">${tx.fee.toFixed(4)}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${tx.status === 'FULFILLED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {tx.status}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col">
          <h3 className="font-bold mb-6">Recent Volume</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="amount" fill="#000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 leading-relaxed">
            Overall volume is trending up by <strong>18.4%</strong> compared to the previous 24h window. Liquidity fulfillment is healthy.
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, change, color = "text-black" }: { title: string, value: string, change?: string, color?: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    {change && (
      <div className="mt-2 text-xs font-medium text-green-500">
        {change} <span className="text-gray-400 font-normal">vs last month</span>
      </div>
    )}
  </div>
);
