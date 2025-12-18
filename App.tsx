
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
  ArrowLeft,
  Server,
  Droplets,
  Coins,
  Square
} from 'lucide-react';

const App: React.FC = () => {
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
    if (!walletAddress) return;
    setStep(ExchangeStep.REQUESTING_EXCHANGE);
    addLog({ role: 'PAYEE', type: 'REQUEST', method: 'POST', path: '/api/v1/exchange', headers: { 'Content-Type': 'application/json' }, body: formData });
    const response = await MerchantService.exchange(formData);
    addLog({ role: 'MERCHANT', type: 'RESPONSE', status: response.status, headers: response.headers as any, body: response.body });
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
    addLog({ role: 'PAYEE', type: 'REQUEST', method: 'POST', path: '/api/v1/confirm', headers: { 'X-POP': mockTxHash }, body: { txHash: mockTxHash } });
    addLog({ role: 'MERCHANT', type: 'REQUEST', method: 'POST', path: '/internal/settle', headers: { 'Auth': 'REDACTED' }, body: formData });
    const confirmation = await MerchantService.confirm(mockTxHash, formData);
    addLog({ role: 'MERCHANT', type: 'RESPONSE', status: confirmation.status, headers: { 'Content-Type': 'application/json' }, body: confirmation.body });
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
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black">
      <div className="w-full max-w-5xl">
        <div className="mb-24 border-l-4 border-white pl-8">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none mb-4">3-BODY<br/>PAYMENT</h1>
          <p className="text-xl mono uppercase tracking-widest text-white/50">Decentralized Settlement Protocol // X402</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 border border-white">
          <button onClick={() => setRole(UserRole.PAYEE)} className="group p-12 text-left hover:bg-white hover:text-black transition-all border-b md:border-b-0 md:border-r border-white">
            <div className="mb-8"><Wallet className="w-12 h-12" /></div>
            <h3 className="text-4xl font-black mb-4 uppercase tracking-tighter">SELL / BUY</h3>
            <p className="mono text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100">Protocol Role: Payee</p>
          </button>

          <button onClick={() => setRole(UserRole.MERCHANT)} className="group p-12 text-left hover:bg-white hover:text-black transition-all border-b md:border-b-0 md:border-r border-white">
            <div className="mb-8"><Server className="w-12 h-12" /></div>
            <h3 className="text-4xl font-black mb-4 uppercase tracking-tighter">EXCHANGE</h3>
            <p className="mono text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100">Protocol Role: Merchant</p>
          </button>

          <button onClick={() => setRole(UserRole.SELLER)} className="group p-12 text-left hover:bg-white hover:text-black transition-all">
            <div className="mb-8"><Droplets className="w-12 h-12" /></div>
            <h3 className="text-4xl font-black mb-4 uppercase tracking-tighter">LIQUIDITY</h3>
            <p className="mono text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100">Protocol Role: Seller</p>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden mono">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Nav */}
        <nav className="h-20 border-b border-white flex items-center justify-between px-10 shrink-0 z-20">
          <div className="flex items-center gap-6 cursor-pointer" onClick={() => { setRole(UserRole.NONE); reset(); }}>
            <Layers className="w-6 h-6" />
            <div className="hidden md:block">
              <div className="font-black text-lg tracking-tighter uppercase">X402.PROTOCOL</div>
              <div className="text-[9px] uppercase tracking-[0.4em] text-white/40">
                {role === UserRole.NONE ? 'System Idle' : `Session: ${role}`}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {role !== UserRole.NONE && (
              <button onClick={() => { setRole(UserRole.NONE); reset(); }} className="text-[10px] font-bold border border-white px-4 py-1 hover:bg-white hover:text-black transition-all">
                EXIT_ROLE
              </button>
            )}
            <button onClick={() => setShowLogs(!showLogs)} className={`text-xs p-1 ${showLogs ? 'bg-white text-black' : 'text-white'}`}>
              <Activity className="w-5 h-5" />
            </button>
            <WalletButton address={walletAddress} onConnect={connectWallet} />
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {role === UserRole.NONE ? (
            <LandingPage />
          ) : role === UserRole.PAYEE ? (
            <div className="max-w-xl mx-auto py-24 px-8">
              <div className="border-4 border-white p-10 bg-black shadow-[20px_20px_0px_0px_rgba(255,255,255,1)]">
                {step === ExchangeStep.IDLE && (
                  <div className="space-y-10">
                    <h2 className="text-5xl font-black uppercase tracking-tighter">Swap Assets</h2>
                    <div className="space-y-6">
                      <div className="border-2 border-white p-6">
                        <label className="text-[10px] font-bold uppercase mb-4 block">You Pay</label>
                        <div className="flex items-center">
                          <input type="number" value={formData.amount} onChange={(e) => setFormData(p => ({...p, amount: Number(e.target.value)}))} className="bg-black text-5xl font-black outline-none flex-1 w-full" />
                          <select className="bg-black text-xl font-bold border-l-2 border-white pl-4 outline-none uppercase" value={formData.sourceCurrency} onChange={(e) => setFormData(p => ({...p, sourceCurrency: e.target.value}))}>
                            <option>INR</option><option>USD</option><option>EUR</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-center"><ArrowDown className="w-8 h-8" /></div>
                      <div className="border-2 border-white p-6 opacity-60">
                        <label className="text-[10px] font-bold uppercase mb-4 block">Estimated Receive</label>
                        <div className="flex items-center">
                          <div className="text-5xl font-black flex-1">{(formData.amount * (formData.sourceCurrency === 'INR' ? 0.012 : 1)).toFixed(2)}</div>
                          <select className="bg-black text-xl font-bold border-l-2 border-white pl-4 outline-none uppercase" value={formData.destCurrency} onChange={(e) => setFormData(p => ({...p, destCurrency: e.target.value}))}>
                            <option>USDC</option><option>USDT</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button onClick={handleExchange} disabled={!walletAddress} className="w-full py-6 bg-white text-black font-black text-2xl uppercase hover:bg-black hover:text-white border-4 border-white transition-all disabled:opacity-20">
                      Execute Swap
                    </button>
                  </div>
                )}
                {step === ExchangeStep.PAYMENT_REQUIRED && (
                  <div className="space-y-8 py-4">
                    <div className="border-l-8 border-white pl-6">
                      <h3 className="text-4xl font-black uppercase tracking-tighter">402 Required</h3>
                      <p className="text-white/50 text-xs mt-2 uppercase tracking-widest">Protocol is waiting for settlement proof.</p>
                    </div>
                    <div className="border-2 border-white p-6 space-y-4 text-[11px] uppercase tracking-widest leading-loose">
                      <div className="flex justify-between border-b border-white/20 pb-2"><span>Amount</span> <span>{paymentInstructions['X-402-Amount']} {paymentInstructions['X-402-Currency']}</span></div>
                      <div className="flex justify-between border-b border-white/20 pb-2"><span>Network</span> <span>{paymentInstructions['X-402-Network']}</span></div>
                      <div className="pt-2"><span>Recipient Address</span><div className="mt-1 break-all bg-white text-black p-2 font-black">{paymentInstructions['X-402-Address']}</div></div>
                    </div>
                    <button onClick={payAndConfirm} className="w-full py-6 bg-white text-black font-black text-2xl uppercase border-4 border-white hover:bg-black hover:text-white transition-all">
                      Settle Payment
                    </button>
                  </div>
                )}
                {step === ExchangeStep.SUCCESS && (
                  <div className="text-center space-y-10 py-10">
                    <div className="flex justify-center"><div className="p-8 border-4 border-white"><CheckCircle2 className="w-24 h-24" /></div></div>
                    <h2 className="text-5xl font-black uppercase tracking-tighter">Completed</h2>
                    <div className="border-2 border-white p-8 text-left space-y-4">
                      <div className="flex justify-between items-end border-b border-white pb-4"><span className="text-[10px] uppercase">Credited</span><span className="text-4xl font-black">{result?.receivedAmount.toFixed(4)} {formData.destCurrency}</span></div>
                      <div className="pt-4"><span className="text-[10px] uppercase opacity-40">Verification Hash</span><div className="mt-2 text-[10px] break-all opacity-60 leading-relaxed">{result?.txId}</div></div>
                    </div>
                    <button onClick={reset} className="w-full py-6 border-4 border-white text-white font-black text-2xl uppercase hover:bg-white hover:text-black transition-all">New Exchange</button>
                  </div>
                )}
                {(step === ExchangeStep.REQUESTING_EXCHANGE || step === ExchangeStep.CONFIRMING_PAYMENT || step === ExchangeStep.PROCESSING_PAYMENT) && (
                  <div className="flex flex-col items-center justify-center py-32 gap-8">
                    <div className="w-20 h-20 border-8 border-white border-t-transparent animate-spin"></div>
                    <p className="font-black text-3xl uppercase tracking-tighter animate-pulse">Processing...</p>
                  </div>
                )}
              </div>
            </div>
          ) : role === UserRole.MERCHANT ? (
            <div className="p-16 max-w-6xl mx-auto space-y-16">
              <div className="flex justify-between items-baseline border-b-8 border-white pb-8">
                <h2 className="text-7xl font-black uppercase tracking-tighter">Exchange Node</h2>
                <div className="text-right uppercase">
                  <div className="text-sm opacity-50 tracking-[0.5em]">Status</div>
                  <div className="text-2xl font-black">Active / 200 OK</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="border-4 border-white p-10"><div className="text-[10px] uppercase tracking-widest opacity-40 mb-4">Node Volume</div><div className="text-6xl font-black tracking-tighter">12.4K <span className="text-xl">USD</span></div></div>
                <div className="border-4 border-white p-10"><div className="text-[10px] uppercase tracking-widest opacity-40 mb-4">Avg. Settlement</div><div className="text-6xl font-black tracking-tighter">4.2 <span className="text-xl">SEC</span></div></div>
              </div>
              <div className="border-4 border-white">
                <div className="p-6 border-b-4 border-white bg-white text-black font-black uppercase text-xs tracking-widest">Active Settlement Sessions</div>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y-2 divide-white">
                    {[1, 2, 3, 4].map(i => (
                      <tr key={i} className="hover:bg-white/10 transition-colors uppercase">
                        <td className="px-8 py-6 font-black">ID: 402-A{i}92</td>
                        <td className="px-8 py-6 opacity-40">ADDR: 0x71c...{i}4f</td>
                        <td className="px-8 py-6 font-black">[Waiting For POP]</td>
                        <td className="px-8 py-6 text-right"><span className="border border-white px-3 py-1">Details</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-16 max-w-6xl mx-auto space-y-16">
              <div className="flex justify-between items-baseline border-b-8 border-white pb-8">
                <h2 className="text-7xl font-black uppercase tracking-tighter">Seller Node</h2>
                <div className="text-right uppercase">
                  <div className="text-sm opacity-50 tracking-[0.5em]">Inventory</div>
                  <div className="text-2xl font-black">1,024,500 USDC</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="border-4 border-white p-12 space-y-8">
                  <h3 className="text-3xl font-black uppercase tracking-tighter">Price Oracle</h3>
                  <div className="space-y-4">
                    {['INR/USDC', 'EUR/USDC', 'GBP/USDC'].map(pair => (
                      <div key={pair} className="flex justify-between items-center p-6 border-2 border-white">
                        <span className="font-black text-xl">{pair}</span>
                        <div className="text-right font-black uppercase text-xs">1.24% SPREAD</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-4 border-white p-12 space-y-8">
                  <h3 className="text-3xl font-black uppercase tracking-tighter">Recent Swaps</h3>
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-6 border-2 border-white space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase"><span>REF: TXN-{i}00X</span><span>[COMPLETED]</span></div>
                        <div className="text-lg font-black uppercase">4,500 INR -> 54.02 USDC</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Protocol Visualizer - Responsive Sidebar */}
      <div className={`transition-all duration-300 border-l border-white flex shrink-0 ${showLogs ? 'w-full md:w-96' : 'w-0 border-l-0 overflow-hidden'}`}>
        <div className="w-full h-full"><ProtocolVisualizer logs={logs} /></div>
      </div>
    </div>
  );
};

export default App;
