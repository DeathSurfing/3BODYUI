import {
  X402Headers,
  ConversionResult,
  ExchangeParams
} from "@/lib/types"

// NOTE:
// This Set is fine for demo purposes.
// In real Next.js serverless / edge environments,
// this would not persist between invocations.
const verifiedTransactions = new Set<string>()

/**
 * Simulates Liquidity Provider / Bank
 */
export const SellerService = {
  async convert(
    merchantId: string,
    params: ExchangeParams
  ): Promise<ConversionResult> {
    await new Promise(r => setTimeout(r, 1500))

    const rates: Record<string, number> = {
      "INR-USDC": 0.012,
      "USD-USDC": 0.99,
      "EUR-USDC": 1.08,
      "GBP-USDC": 1.27
    }

    const pair = `${params.sourceCurrency}-${params.destCurrency}`
    const rate = rates[pair] ?? 1.0

    return {
      txId: `sell_tx_${Math.random().toString(36).slice(2, 11)}`,
      rate,
      receivedAmount: params.amount * rate
    }
  }
}

/**
 * Simulates Merchant / Exchange Backend
 * Implements X402-style payment-required flow
 */
export const MerchantService = {
  async exchange(
    params: ExchangeParams
  ): Promise<{
    status: number
    headers: Partial<X402Headers>
    body: any
  }> {
    await new Promise(r => setTimeout(r, 1000))

    return {
      status: 402,
      headers: {
        "X-402-Amount": params.amount.toString(),
        "X-402-Currency": params.sourceCurrency,
        "X-402-Address":
          "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "X-402-Network": "Polygon-Amoy",
        "X-402-Deadline": new Date(
          Date.now() + 5 * 60 * 1000
        ).toISOString()
      },
      body: {
        error: "Payment Required",
        message:
          "Please submit payment to the provided address to proceed with the exchange."
      }
    }
  },

  async confirm(
    txHash: string,
    params: ExchangeParams
  ): Promise<{
    status: number
    body: any
  }> {
    await new Promise(r => setTimeout(r, 1200))

    // 1️⃣ Verify transaction hash (mocked)
    if (!txHash.startsWith("0x") || txHash.length < 10) {
      return {
        status: 400,
        body: { error: "Invalid transaction hash" }
      }
    }

    // (Optional mock replay protection)
    if (verifiedTransactions.has(txHash)) {
      return {
        status: 409,
        body: { error: "Transaction already processed" }
      }
    }

    verifiedTransactions.add(txHash)

    // 2️⃣ Call Seller / Liquidity Provider
    const conversion = await SellerService.convert(
      "exchange_id_1",
      params
    )

    return {
      status: 200,
      body: {
        message: "Exchange Successful",
        conversion
      }
    }
  }
}
