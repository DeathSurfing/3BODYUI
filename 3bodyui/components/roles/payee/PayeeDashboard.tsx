
import React, { useState, useEffect } from 'react';
import { blockchainService } from '../../../services/blockchainService';
import { Transaction, TransactionStatus } from '../../../types';
import { MOCK_WALLET_ADDRESS, EXCHANGE_RATE } from '../../../constants';

export const PayeeDashboard: React.FC = () => {
  const [usdAmount, setUsdAmount] = useState<string>('');
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    setHistory(blockchainService.getTransactions().filter(t => t.payeeAddress === MOCK_WALLET_ADDRESS || t.payeeAddress.includes('Alice')));
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
    // Removed auto-fulfillment: Now waiting for LP to manually fulfill
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Exchange Assets</h1>
        <p className="text-gray-500">Securely convert your USD balance to USDT via atomic smart contracts.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Action Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Payment Amount (USD)</label>
            <div className="relative">
              <input
                type="number"
                value={usdAmount}
                onChange={(e) => setUsdAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black transition-all text-xl font-mono"
                disabled={!!activeTx}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">$</span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-gray-400">Rate: 1 USD = {EXCHANGE_RATE} USDT</span>
              <span className="font-medium text-gray-900">
                You receive: {usdAmount ? (parseFloat(usdAmount) * EXCHANGE_RATE).toFixed(2) : '0.00'} USDT
              </span>
            </div>
          </div>

          {!activeTx ? (
            <button
              onClick={handleInitiate}
              className="w-full py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
            >
              Initiate Swap Request
            </button>
          ) : (
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${activeTx.status === TransactionStatus.AUTHORIZED ? 'bg-indigo-500 animate-pulse' : 'bg-orange-500'}`}>
                  {activeTx.status === TransactionStatus.AUTHORIZED ? '⏳' : '!'}
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${activeTx.status === TransactionStatus.AUTHORIZED ? 'text-indigo-900' : 'text-orange-900'}`}>
                    {activeTx.status === TransactionStatus.AUTHORIZED ? 'Waiting for Liquidity Provider' : 'HTTP 402: Payment Required'}
                  </h3>
                  <p className={`${activeTx.status === TransactionStatus.AUTHORIZED ? 'text-indigo-700' : 'text-orange-700'} text-xs`}>
                    Request ID: {activeTx.id}
                  </p>
                </div>
              </div>

              {activeTx.status === TransactionStatus.AUTHORIZED ? (
                <div className="text-xs text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  Payment authorized. Waiting for a Liquidity Provider to pick up this transaction block... (Do not close this window)
                </div>
              ) : (
                <button
                  onClick={handlePay402}
                  className="w-full py-3 rounded-lg font-bold text-sm transition-all bg-orange-500 text-white hover:bg-orange-600"
                >
                  Authorize Smart Contract Payment
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Tracker */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Transaction History</h2>
          <div className="space-y-3">
            {history.length === 0 && <div className="text-center py-8 text-gray-400 italic">No recent swaps found.</div>}
            {history.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:border-black transition-all">
                <div>
                  <div className="text-xs font-mono text-gray-400 mb-1">{tx.id}</div>
                  <div className="font-bold text-lg">${tx.usdAmount} USD</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={tx.status} />
                  <div className="text-[10px] text-gray-400 mt-1">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: TransactionStatus }) => {
  const styles = {
    [TransactionStatus.FULFILLED]: "bg-green-100 text-green-700",
    [TransactionStatus.PENDING]: "bg-blue-100 text-blue-700",
    [TransactionStatus.HTTP_402_REQUIRED]: "bg-orange-100 text-orange-700",
    [TransactionStatus.AUTHORIZED]: "bg-indigo-100 text-indigo-700",
    [TransactionStatus.FAILED]: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
