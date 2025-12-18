
import React, { useState, useCallback } from 'react';
import { ExchangeStep, NetworkLog, ExchangeParams, UserRole } from './types';
import { MerchantService } from './services/mockService';
import ProtocolVisualizer from './components/ProtocolVisualizer';
import WalletButton from './components/WalletButton';
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Wallet, 
  Layers, 
  ArrowDown, 
  Activity,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Server,
  Droplets,
  Coins
} from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  const [step, setStep] = useState<ExchangeStep>(ExchangeStep.IDLE);
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [formData, setFormData] = useState<ExchangeParams>({
    sourceCurrency: 'INR',
    destCurrency: 'USDC',
    amount: 1000,
    payeeAddress: ''
  });
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // Helper to add network logs
  const addLog = useCallback((log: Omit<NetworkLog, 'id' | 'timestamp'>) => {
    setLogs(prev => [{
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  }, []);

  const connectWallet = () => {
    const mockAddr = '0x1234...5678';
    setWalletAddress(mockAddr);
    setFormData(prev => ({ ...prev, payeeAddress: mockAddr }));
  };

  const handleExchange = async () => {
    if (!walletAddress) return alert("Please connect wallet first.");
    setStep(ExchangeStep.REQUESTING_EXCHANGE);
    
    addLog({
      role: 'PAYEE',
      type: 'REQUEST',
      method: 'POST',
      path: '/api/exchange',
      headers: { 'Content-Type': 'application/json' },
      body: formData
    });

    const response = await MerchantService.exchange(formData);
    
    addLog({
      role: 'MERCHANT',
      type: 'RESPONSE',
      status: response.status,
      headers: response.headers as any,
      body: response.body
    });

    if (response.status === 402) {
      setPaymentInstructions(response.headers);
      setStep(ExchangeStep.PAYMENT_REQUIRED);
    } else {
      setStep(ExchangeStep.ERROR);
    }
  };

  const payAndConfirm = async () => {
    setStep(ExchangeStep.PROCESSING_PAYMENT);
    await new Promise(r => setTimeout(r, 2000));
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 40);
    setStep(ExchangeStep.CONFIRMING_PAYMENT);

    addLog({
      role: 'PAYEE',
      type: 'REQUEST',
      method: 'POST',
      path: '/api/exchange/confirm',
      headers: { 'X-Proof-Of-Payment': mockTxHash },
      body: { txHash: mockTxHash, ...formData }
    });

    addLog({
      role: 'MERCHANT',
      type: 'REQUEST',
      method: 'POST',
      path: '/internal/seller/convert',
      headers: { 'X-Internal-Secret': '***' },
      body: formData
    });

    const confirmation = await MerchantService.confirm(mockTxHash, formData);

    addLog({
      role: 'MERCHANT',
      type: 'RESPONSE',
      status: confirmation.status,
      headers: { 'Content-Type': 'application/json' },
      body: confirmation.body
    });

    if (confirmation.status === 200) {
      setResult(confirmation.body.conversion);
      setStep(ExchangeStep.SUCCESS);
    } else {
      setStep(ExchangeStep.ERROR);
    }
  };

  const reset = () => {
    setStep(ExchangeStep.IDLE);
    setPaymentInstructions(null);
    setResult(null);
  };

  const LandingPage = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent_70%)]">
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
          <Zap className="w-3 h-3" />
          The 3-Body Payment Protocol
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white">
          Decentralized <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-emerald-500">Atomic</span> Exchange
        </h1>
        <p className="text-zinc-500 text-lg max-w-2xl mx-auto leading-relaxed">
          Select your entity role to participate in the X402 'Payment Required' settlement network. 
          A three-party agreement system for instant currency conversion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {/* Role: Payee */}
        <button 
          onClick={() => setRole(UserRole.PAYEE)}
          className="group relative bg-zinc-900 border border-white/5 rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:border-indigo-500/50 hover:bg-zinc-800/50"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-600/30 group-hover:bg-indigo-600 group-hover:text-white transition-all text-indigo-500">
            <Wallet className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">I want to Swap</h3>
          <p className="text-zinc-500 text-sm leading-relaxed mb-4">
            Act as the <span className="text-indigo-400 font-bold">Payee</span>. Initiate exchange requests and fulfill HTTP 402 payment requirements using your Web3 wallet.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            <Activity className="w-3 h-3" />
            Active Consumer
          </div>
        </button>

        {/* Role: Merchant */}
        <button 
          onClick={() => setRole(UserRole.MERCHANT)}
          className="group relative bg-zinc-900 border border-white/5 rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:border-amber-500/50 hover:bg-zinc-800/50"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-6 h-6 text-amber-500" />
          </div>
          <div className="w-14 h-14 bg-amber-600/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-600/30 group-hover:bg-amber-600 group-hover:text-white transition-all text-amber-500">
            <Server className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">I am an Exchange</h3>
          <p className="text-zinc-500 text-sm leading-relaxed mb-4">
            Act as the <span className="text-amber-400 font-bold">Merchant</span>. Coordinate settlement sessions, issue 402 headers, and verify cryptographical proofs of payment.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            Protocol Orchestrator
          </div>
        </button>

        {/* Role: Seller */}
        <button 
          onClick={() => setRole(UserRole.SELLER)}
          className="group relative bg-zinc-900 border border-white/5 rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:border-emerald-500/50 hover:bg-zinc-800/50"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="w-14 h-14 bg-emerald-600/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-600/30 group-hover:bg-emerald-600 group-hover:text-white transition-all text-emerald-500">
            <Droplets className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">I Provide Assets</h3>
          <p className="text-zinc-500 text-sm leading-relaxed mb-4">
            Act as the <span className="text-emerald-400 font-bold">Seller</span>. Manage liquidity pools, lock exchange rates, and fulfill asset conversions upon verified requests.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            <Coins className="w-3 h-3" />
            Liquidity Provider
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-100 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navigation Bar */}
        <nav className="h-16 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setRole(UserRole.NONE); reset(); }}>
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <Layers className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none mb-1">3-Body Payment</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  {role === UserRole.NONE ? 'Select Role' : `${role} Active`}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {role !== UserRole.NONE && (
              <button 
                onClick={() => { setRole(UserRole.NONE); reset(); }}
                className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors mr-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Exit {role}
              </button>
            )}
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className={`p-2 rounded-lg transition-colors border ${showLogs ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-transparent border-white/5 text-zinc-500'}`}
              title="Toggle Traffic Logs"
            >
              <Activity className="w-5 h-5" />
            </button>
            <WalletButton address={walletAddress} onConnect={connectWallet} />
          </div>
        </nav>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0a0a0b] to-[#050505]">
          {role === UserRole.NONE ? (
            <LandingPage />
          ) : role === UserRole.PAYEE ? (
            <div className="max-w-xl mx-auto py-16 px-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 rounded-3xl blur opacity-30"></div>
                <div className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="flex h-1">
                    <div className={`h-full transition-all duration-500 ${step !== ExchangeStep.IDLE ? 'w-1/3 bg-indigo-500' : 'w-0'}`}></div>
                    <div className={`h-full transition-all duration-500 ${step === ExchangeStep.PAYMENT_REQUIRED || step === ExchangeStep.SUCCESS ? 'w-1/3 bg-amber-500' : 'w-0'}`}></div>
                    <div className={`h-full transition-all duration-500 ${step === ExchangeStep.SUCCESS ? 'w-1/3 bg-emerald-500' : 'w-0'}`}></div>
                  </div>
                  <div className="p-8">
                    {step === ExchangeStep.IDLE && (
                      <div className="space-y-6">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold mb-2">Currency Exchange</h2>
                          <p className="text-sm text-zinc-500">Atomic settlement using the HTTP 402 Protocol</p>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">You Send</label>
                            <div className="flex items-center bg-zinc-800/50 rounded-2xl p-4 border border-white/5">
                              <input 
                                type="number" 
                                value={formData.amount} 
                                onChange={(e) => setFormData(p => ({...p, amount: Number(e.target.value)}))}
                                className="bg-transparent text-3xl font-semibold outline-none flex-1 w-full text-zinc-100"
                              />
                              <select className="bg-zinc-700 text-sm font-bold rounded-xl px-4 py-2 outline-none border border-white/10" value={formData.sourceCurrency} onChange={(e) => setFormData(p => ({...p, sourceCurrency: e.target.value}))}>
                                <option>INR</option>
                                <option>USD</option>
                                <option>EUR</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-center -my-6 relative z-10"><div className="bg-zinc-900 border border-white/10 p-3 rounded-full shadow-lg"><ArrowDown className="w-5 h-5 text-indigo-400" /></div></div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Receive (Estimated)</label>
                            <div className="flex items-center bg-zinc-800/50 rounded-2xl p-4 border border-white/5">
                              <div className="text-3xl font-semibold flex-1 text-zinc-300">{(formData.amount * (formData.sourceCurrency === 'INR' ? 0.012 : 1)).toFixed(2)}</div>
                              <select className="bg-zinc-700 text-sm font-bold rounded-xl px-4 py-2 outline-none border border-white/10" value={formData.destCurrency} onChange={(e) => setFormData(p => ({...p, destCurrency: e.target.value}))}>
                                <option>USDC</option>
                                <option>USDT</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <button onClick={handleExchange} disabled={!walletAddress} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3">
                          <ArrowRightLeft className="w-5 h-5" />
                          Swap Assets
                        </button>
                      </div>
                    )}
                    {step === ExchangeStep.PAYMENT_REQUIRED && (
                      <div className="space-y-8 py-4 text-center">
                        <h3 className="text-xl font-bold text-amber-500">HTTP 402 Required</h3>
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-left space-y-4">
                          <div className="flex items-center gap-3 text-amber-500"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-xs font-medium">Payment proof required to unlock resource.</p></div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-black/40 rounded-xl border border-white/5"><div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Requested</div><div className="text-sm font-bold text-zinc-200">{paymentInstructions['X-402-Amount']} {paymentInstructions['X-402-Currency']}</div></div>
                            <div className="p-3 bg-black/40 rounded-xl border border-white/5"><div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Network</div><div className="text-sm font-bold text-zinc-200 truncate">{paymentInstructions['X-402-Network']}</div></div>
                          </div>
                        </div>
                        <button onClick={payAndConfirm} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3">
                          <Wallet className="w-5 h-5" />
                          Confirm Payment
                        </button>
                      </div>
                    )}
                    {step === ExchangeStep.SUCCESS && (
                      <div className="text-center space-y-8 py-4">
                        <div className="relative inline-block p-6 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                        </div>
                        <div><h2 className="text-2xl font-bold text-emerald-500 mb-2">Assets Exchanged</h2><p className="text-zinc-500 text-sm">HTTP 402 Session fulfilled successfully.</p></div>
                        <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/5 text-left space-y-4">
                          <div className="flex justify-between items-end"><span className="text-sm text-zinc-400">Credited:</span><span className="text-xl font-bold text-zinc-100">{result?.receivedAmount.toFixed(4)} {formData.destCurrency}</span></div>
                          <div className="pt-2"><div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Protocol Ref</div><div className="mono text-[10px] text-zinc-400 bg-black/20 p-2 rounded border border-white/5 break-all">{result?.txId}</div></div>
                        </div>
                        <button onClick={reset} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-zinc-300 transition-all">Start Another Exchange</button>
                      </div>
                    )}
                    {(step === ExchangeStep.REQUESTING_EXCHANGE || step === ExchangeStep.CONFIRMING_PAYMENT || step === ExchangeStep.PROCESSING_PAYMENT) && (
                      <div className="flex flex-col items-center justify-center py-20 gap-6">
                        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                        <p className="font-bold text-xl tracking-tight">Processing Handshake...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : role === UserRole.MERCHANT ? (
            <div className="p-8 max-w-5xl mx-auto space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Merchant Dashboard</h2>
                  <p className="text-zinc-500">Monitor and orchestrate HTTP 402 settlement sessions.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                    <TrendingUp className="text-emerald-500 w-5 h-5" />
                    <div><div className="text-[10px] text-zinc-500 uppercase font-bold">Volume</div><div className="text-lg font-bold">12.4k USD</div></div>
                  </div>
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                    <ShieldCheck className="text-indigo-500 w-5 h-5" />
                    <div><div className="text-[10px] text-zinc-500 uppercase font-bold">Uptime</div><div className="text-lg font-bold">99.99%</div></div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Session ID</th>
                      <th className="px-6 py-4">Payee Address</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Fulfillment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[1, 2, 3].map(i => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 mono text-zinc-400">0xabc...{i}23</td>
                        <td className="px-6 py-4 mono text-zinc-400">0x71c...{i}4f</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[10px] font-bold uppercase">Awaiting X402</span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500">Pending...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 max-w-5xl mx-auto space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Liquidity Provider Panel</h2>
                  <p className="text-zinc-500">Manage asset pools and fulfill conversion requests from Merchants.</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
                  <Droplets className="text-emerald-500 w-6 h-6" />
                  <div><div className="text-[10px] text-zinc-500 uppercase font-bold">Total Liquidity</div><div className="text-lg font-bold">1,024,500 USDC</div></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Active Rate Locks</h3>
                  <div className="space-y-4">
                    {['INR/USDC', 'EUR/USDC'].map(pair => (
                      <div key={pair} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                        <span className="font-bold">{pair}</span>
                        <div className="text-right">
                          <div className="text-sm font-bold text-zinc-200">1.24% Spread</div>
                          <div className="text-[10px] text-zinc-500 uppercase">Updates in 4s</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Conversions</h3>
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="p-4 bg-white/5 rounded-2xl space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500">
                          <span>Ref: sell_tx_{i}92</span>
                          <span className="text-emerald-500">Completed</span>
                        </div>
                        <div className="text-sm font-bold">Converted 4,500 INR -> 54.02 USDC</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Protocol Visualizer Sidebar */}
      <div className={`transition-all duration-500 ease-in-out border-l border-white/10 flex shrink-0 ${showLogs ? 'w-full md:w-96' : 'w-0 border-l-0 overflow-hidden'}`}>
        <div className="w-full h-full"><ProtocolVisualizer logs={logs} /></div>
      </div>
    </div>
  );
};

export default App;
