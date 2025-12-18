
import { NetworkLog, X402Headers, ConversionResult, ExchangeParams } from '../types';

// Mock DB for tx verification
const verifiedTransactions = new Set<string>();

export const SellerService = {
  // Simulates the Liquidity Provider / Bank
  async convert(merchantId: string, params: ExchangeParams): Promise<ConversionResult> {
    await new Promise(r => setTimeout(r, 1500));
    
    // Simulate rate logic
    const rates: Record<string, number> = {
      'INR-USDC': 0.012,
      'USD-USDC': 0.99,
      'EUR-USDC': 1.08,
      'GBP-USDC': 1.27
    };
    
    const key = `${params.sourceCurrency}-${params.destCurrency}`;
    const rate = rates[key] || 1.0;
    
    return {
      txId: `sell_tx_${Math.random().toString(36).substr(2, 9)}`,
      rate,
      receivedAmount: params.amount * rate
    };
  }
};

export const MerchantService = {
  // Acts as the primary web application backend
  exchange: async (params: ExchangeParams): Promise<{ status: number; headers: Partial<X402Headers>; body: any }> => {
    await new Promise(r => setTimeout(r, 1000));
    
    // In a real X402 flow, the merchant returns a 402 with instructions
    return {
      status: 402,
      headers: {
        'X-402-Amount': params.amount.toString(),
        'X-402-Currency': params.sourceCurrency,
        'X-402-Address': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', // Merchant Vault
        'X-402-Network': 'Polygon-Amoy',
        'X-402-Deadline': new Date(Date.now() + 300000).toISOString(), // 5 mins
      },
      body: {
        error: "Payment Required",
        message: "Please submit payment to the provided address to proceed with the exchange."
      }
    };
  },

  confirm: async (txHash: string, params: ExchangeParams): Promise<{ status: number; body: any }> => {
    await new Promise(r => setTimeout(r, 1200));
    
    // 1. Verify on-chain (MOCKED)
    if (!txHash.startsWith('0x') || txHash.length < 10) {
      return { status: 400, body: { error: "Invalid transaction hash" }};
    }
    
    // 2. Call Seller to execute conversion
    const result = await SellerService.convert('exchange_id_1', params);
    
    return {
      status: 200,
      body: {
        message: "Exchange Successful",
        conversion: result
      }
    };
  }
};
