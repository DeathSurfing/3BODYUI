
import React, { useState, useCallback } from 'react';
import { ExchangeStep, NetworkLog, ExchangeParams } from './types';
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
  ChevronLeft
} from 'lucide-react';

const App: React.FC = () => {
  // Application State
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
    
    // Step 1: Payee sends request
    addLog({
      role: 'PAYEE',
      type: 'REQUEST',
      method: 'POST',
      path: '/api/exchange',
      headers: { 'Content-Type': 'application/json' },
      body: formData
    });

    const response = await MerchantService.exchange(formData);
    
    // Step 2: Merchant responds with 402
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
    
    // Simulate user signing transaction
    await new Promise(r => setTimeout(r, 2000));
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 40);
    
    setStep(ExchangeStep.CONFIRMING_PAYMENT);

    // Step 3: Payee submits proof
    addLog({
      role: 'PAYEE',
      type: 'REQUEST',
      method: 'POST',
      path: '/api/exchange/confirm',
      headers: { 'X-Proof-Of-Payment': mockTxHash },
      body: { txHash: mockTxHash, ...formData }
    });

    // Merchant calls Seller internally (visible in logs)
    addLog({
      role: 'MERCHANT',
      type: 'REQUEST',
      method: 'POST',
      path: '/internal/seller/convert',
      headers: { 'X-Internal-Secret': '***' },
      body: formData
    });

    const confirmation = await MerchantService.confirm(mockTxHash, formData);

    // Step 4: Merchant confirms
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

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-100 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navigation Bar */}
        <nav className="h-16 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <Layers className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none mb-1">X402 Exchange</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Protocol Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
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

        {/* Website Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-12 bg-gradient-to-b from-[#0a0a0b] to-[#050505]">
          <div className="max-w-xl mx-auto py-8">
            <div className="relative">
              {/* Card Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 rounded-3xl blur opacity-30"></div>
              
              <div className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
                {/* Protocol Progress Header */}
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
                          <div className="flex items-center bg-zinc-800/50 rounded-2xl p-4 border border-white/5 focus-within:border-indigo-500/50 transition-all">
                            <input 
                              type="number" 
                              value={formData.amount} 
                              onChange={(e) => setFormData(p => ({...p, amount: Number(e.target.value)}))}
                              className="bg-transparent text-3xl font-semibold outline-none flex-1 w-full text-zinc-100"
                            />
                            <select 
                              className="bg-zinc-700 text-sm font-bold rounded-xl px-4 py-2 outline-none border border-white/10 cursor-pointer hover:bg-zinc-600 transition-colors"
                              value={formData.sourceCurrency}
                              onChange={(e) => setFormData(p => ({...p, sourceCurrency: e.target.value}))}
                            >
                              <option>INR</option>
                              <option>USD</option>
                              <option>EUR</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-center -my-6 relative z-10">
                          <div className="bg-zinc-900 border border-white/10 p-3 rounded-full shadow-lg shadow-black">
                            <ArrowDown className="w-5 h-5 text-indigo-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">You Receive (Estimated)</label>
                          <div className="flex items-center bg-zinc-800/50 rounded-2xl p-4 border border-white/5">
                            <div className="text-3xl font-semibold flex-1 text-zinc-300">
                              {(formData.amount * (formData.sourceCurrency === 'INR' ? 0.012 : 1)).toFixed(2)}
                            </div>
                            <select 
                              className="bg-zinc-700 text-sm font-bold rounded-xl px-4 py-2 outline-none border border-white/10 cursor-pointer hover:bg-zinc-600 transition-colors"
                              value={formData.destCurrency}
                              onChange={(e) => setFormData(p => ({...p, destCurrency: e.target.value}))}
                            >
                              <option>USDC</option>
                              <option>USDT</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleExchange}
                        disabled={!walletAddress}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
                      >
                        <ArrowRightLeft className="w-5 h-5" />
                        Swap Assets
                      </button>
                      
                      {!walletAddress && (
                        <p className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-2">
                          <Activity className="w-3 h-3 text-rose-500" />
                          Connect wallet to authorize the HTTP session
                        </p>
                      )}
                    </div>
                  )}

                  {(step === ExchangeStep.REQUESTING_EXCHANGE || step === ExchangeStep.CONFIRMING_PAYMENT || step === ExchangeStep.PROCESSING_PAYMENT) && (
                    <div className="flex flex-col items-center justify-center py-20 gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
                        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="font-bold text-xl tracking-tight">
                          {step === ExchangeStep.PROCESSING_PAYMENT ? 'Signing Payload...' : 
                           step === ExchangeStep.REQUESTING_EXCHANGE ? 'Handshaking...' : 'Settling on Chain...'}
                        </p>
                        <p className="text-zinc-500 text-sm max-w-[200px] mx-auto leading-relaxed">
                          The browser is negotiating the X402 payment requirements.
                        </p>
                      </div>
                    </div>
                  )}

                  {step === ExchangeStep.PAYMENT_REQUIRED && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-amber-500">HTTP 402 Required</h3>
                        <p className="text-zinc-500 text-sm mt-1">Payment proof required to unlock resource</p>
                      </div>

                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3 text-amber-500">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <p className="text-xs font-medium leading-relaxed">
                            The server has locked this request. Please fulfill the payment to the Merchant's settlement address.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Requested</div>
                            <div className="text-sm font-bold text-zinc-200">{paymentInstructions['X-402-Amount']} {paymentInstructions['X-402-Currency']}</div>
                          </div>
                          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Network</div>
                            <div className="text-sm font-bold text-zinc-200 truncate">{paymentInstructions['X-402-Network']}</div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                          <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Pay To</div>
                          <div className="text-xs mono text-zinc-400 break-all">{paymentInstructions['X-402-Address']}</div>
                        </div>
                      </div>

                      <button 
                        onClick={payAndConfirm}
                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
                      >
                        <Wallet className="w-5 h-5" />
                        Confirm Payment
                      </button>
                    </div>
                  )}

                  {step === ExchangeStep.SUCCESS && (
                    <div className="text-center space-y-8 py-4">
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
                        <div className="relative p-6 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                        </div>
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold text-emerald-500 mb-2">Assets Exchanged</h2>
                        <p className="text-zinc-500 text-sm">HTTP 402 Session fulfilled successfully.</p>
                      </div>
                      
                      <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/5 text-left space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Exchange Result</span>
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold">Verified</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <span className="text-sm text-zinc-400">Credited:</span>
                            <span className="text-xl font-bold text-zinc-100">{result?.receivedAmount.toFixed(4)} {formData.destCurrency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-zinc-500">Settled Rate:</span>
                            <span className="text-xs font-medium text-zinc-300">1 {formData.sourceCurrency} = {result?.rate} {formData.destCurrency}</span>
                          </div>
                          <div className="pt-2">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Protocol Ref</div>
                            <div className="mono text-[10px] text-zinc-400 bg-black/20 p-2 rounded border border-white/5 break-all">
                              {result?.txId}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={reset}
                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-zinc-300 transition-all"
                      >
                        Start Another Exchange
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Protocol Visualizer - Responsive Sidebar */}
      <div 
        className={`transition-all duration-500 ease-in-out border-l border-white/10 flex shrink-0 ${
          showLogs ? 'w-full md:w-96' : 'w-0 border-l-0'
        }`}
      >
        <div className="w-full h-full overflow-hidden flex flex-col">
          <ProtocolVisualizer logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default App;
