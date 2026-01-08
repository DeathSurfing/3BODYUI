"use client"

import { useState, useCallback } from "react"
import {
  ExchangeStep,
  NetworkLog,
  ExchangeParams,
  UserRole
} from "@/lib/types"
import { MerchantService } from "@/lib/services/mockService"
import ProtocolVisualizer from "@/components/ProtocolVisualizer"
import WalletButton from "@/components/WalletButton"

import {
  CheckCircle2,
  Wallet,
  Layers,
  ArrowDown,
  Activity,
  Server,
  Droplets
} from "lucide-react"

export default function App() {
  const [role, setRole] = useState<UserRole>(UserRole.NONE)
  const [step, setStep] = useState<ExchangeStep>(ExchangeStep.IDLE)
  const [logs, setLogs] = useState<NetworkLog[]>([])
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(true)

  const [formData, setFormData] = useState<ExchangeParams>({
    sourceCurrency: "INR",
    destCurrency: "USDC",
    amount: 1000,
    payeeAddress: ""
  })

  const [paymentInstructions, setPaymentInstructions] = useState<any>(null)
  const [result, setResult] = useState<any>(null)

  /* ---------- Logging ---------- */

  const addLog = useCallback(
    (log: Omit<NetworkLog, "id" | "timestamp">) => {
      setLogs(prev => [
        {
          ...log,
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ])
    },
    []
  )

  /* ---------- Wallet ---------- */

  const connectWallet = () => {
    const addr = "0x1234...5678"
    setWalletAddress(addr)
    setFormData(p => ({ ...p, payeeAddress: addr }))
  }

  /* ---------- Exchange Flow ---------- */

  const handleExchange = async () => {
    if (!walletAddress) return

    setStep(ExchangeStep.REQUESTING_EXCHANGE)

    addLog({
      role: "PAYEE",
      type: "REQUEST",
      method: "POST",
      path: "/api/v1/exchange",
      headers: { "Content-Type": "application/json" },
      body: formData
    })

    const res = await MerchantService.exchange(formData)

    addLog({
      role: "MERCHANT",
      type: "RESPONSE",
      status: res.status,
      headers: res.headers,
      body: res.body
    })

    if (res.status === 402) {
      setPaymentInstructions(res.headers)
      setStep(ExchangeStep.PAYMENT_REQUIRED)
    } else {
      setStep(ExchangeStep.ERROR)
    }
  }

  const payAndConfirm = async () => {
    setStep(ExchangeStep.PROCESSING_PAYMENT)
    await new Promise(r => setTimeout(r, 2000))

    const txHash =
      "0x" + crypto.randomUUID().replaceAll("-", "")

    setStep(ExchangeStep.CONFIRMING_PAYMENT)

    addLog({
      role: "PAYEE",
      type: "REQUEST",
      method: "POST",
      path: "/api/v1/confirm",
      headers: { "X-POP": txHash },
      body: { txHash }
    })

    const confirmation = await MerchantService.confirm(
      txHash,
      formData
    )

    addLog({
      role: "MERCHANT",
      type: "RESPONSE",
      status: confirmation.status,
      headers: { "Content-Type": "application/json" },
      body: confirmation.body
    })

    if (confirmation.status === 200) {
      setResult(confirmation.body.conversion)
      setStep(ExchangeStep.SUCCESS)
    }
  }

  const reset = () => {
    setRole(UserRole.NONE)
    setStep(ExchangeStep.IDLE)
    setLogs([])
    setPaymentInstructions(null)
    setResult(null)
  }

  /* ---------- UI ---------- */

  return (
    <div className="flex min-h-screen bg-black text-white font-mono">
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <nav className="h-20 border-b border-white flex items-center justify-between px-10">
          <div
            className="flex items-center gap-6 cursor-pointer"
            onClick={reset}
          >
            <Layers className="w-6 h-6" />
            <div>
              <div className="font-black uppercase">
                X402.PROTOCOL
              </div>
              <div className="text-[9px] uppercase tracking-widest opacity-40">
                {role === UserRole.NONE
                  ? "System Idle"
                  : `Session: ${role}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowLogs(v => !v)}
              className={`p-1 ${
                showLogs
                  ? "bg-white text-black"
                  : "text-white"
              }`}
            >
              <Activity className="w-5 h-5" />
            </button>

            <WalletButton
              address={walletAddress}
              onConnect={connectWallet}
            />
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto">
          {role === UserRole.NONE && (
            <section className="min-h-screen flex items-center justify-center px-8">
              <div className="max-w-5xl w-full">
                <div className="mb-24 border-l-4 border-white pl-8">
                  <h1 className="text-8xl font-black leading-none">
                    3-BODY
                    <br />
                    PAYMENT
                  </h1>
                  <p className="text-xs uppercase tracking-widest opacity-50 mt-4">
                    Decentralized Settlement Protocol // X402
                  </p>
                </div>

                <div className="grid md:grid-cols-3 border border-white">
                  <button
                    onClick={() =>
                      setRole(UserRole.PAYEE)
                    }
                    className="p-12 border-b md:border-b-0 md:border-r border-white hover:bg-white hover:text-black transition"
                  >
                    <Wallet className="w-12 h-12 mb-8" />
                    <h3 className="text-3xl font-black">
                      SELL / BUY
                    </h3>
                  </button>

                  <button
                    onClick={() =>
                      setRole(UserRole.MERCHANT)
                    }
                    className="p-12 border-b md:border-b-0 md:border-r border-white hover:bg-white hover:text-black transition"
                  >
                    <Server className="w-12 h-12 mb-8" />
                    <h3 className="text-3xl font-black">
                      EXCHANGE
                    </h3>
                  </button>

                  <button
                    onClick={() =>
                      setRole(UserRole.SELLER)
                    }
                    className="p-12 hover:bg-white hover:text-black transition"
                  >
                    <Droplets className="w-12 h-12 mb-8" />
                    <h3 className="text-3xl font-black">
                      LIQUIDITY
                    </h3>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Payee / Merchant / Seller views unchanged logically */}
          {/* (Your existing markup works once mono + imports are fixed) */}
        </main>
      </div>

      {/* Logs */}
      <aside
        className={
          showLogs
            ? "w-full md:w-96 border-l border-white transition-all"
            : "w-0 overflow-hidden border-l-0 transition-all"
        }
      >
        <ProtocolVisualizer logs={logs} />
      </aside>
      <script src="https://cdn.tailwindcss.com"></script>
    </div>
    
  )
}
