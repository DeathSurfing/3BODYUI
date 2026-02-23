import { PoolStats, Transaction } from "@/types";

type JsonBody = Record<string, unknown>;

async function request<TResponse>(
  path: string,
  options?: RequestInit
): Promise<TResponse> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Request failed");
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json() as Promise<TResponse>;
}

function get<TResponse>(path: string): Promise<TResponse> {
  return request<TResponse>(path, { method: "GET" });
}

function post<TRequest extends JsonBody, TResponse>(
  path: string,
  body: TRequest
): Promise<TResponse> {
  return request<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type WalletBalanceResponse = {
  usd: number;
  usdt: number;
};

export type UsdtInrQuoteResponse = {
  rate: number;
  timestamp: number;
  usdtPriceInInr?: number;
  usdtPriceInUsd?: number;
  priceChange24h?: number;
  lastUpdated?: string;
};

export type LiquidityExposureResponse = PoolStats;

export type TransactionsListResponse = {
  transactions: Transaction[];
};

export type CreateTransactionRequest = {
  payeeAddress: string;
  usdAmount: number;
  orderId?: string;
  merchantWallet?: string;
  source?: string;
};

export type CreateTransactionResponse = {
  id: string;
  status: string;
};

export type ExecuteTransactionRequest = {
  transactionId: string;
  lpAddress?: string;
  proof?: string;
};

export type ExecuteTransactionResponse = {
  status: string;
  txHash?: string;
};

export type DepositLiquidityRequest = {
  amount: number;
};

export type DepositLiquidityResponse = {
  status: string;
  amount: number;
};

export type MerchantPayoutRequest = {
  amount: number;
  currency?: string;
  transactionCount?: number;
  source?: string;
};

export type MerchantPayoutResponse = {
  status: string;
  amount: number;
  txId?: string;
};

export const apiClient = {
  getWalletBalance() {
    return get<WalletBalanceResponse>("/api/wallets/balance");
  },

  getUsdtInrQuote(amount: number) {
    return post<{ amount: number }, UsdtInrQuoteResponse>(
      "/api/quotes/usdt-inr",
      { amount }
    );
  },

  getLiquidityExposure() {
    return get<LiquidityExposureResponse>("/api/liquidity/exposure");
  },

  listTransactions() {
    return get<TransactionsListResponse>("/api/transactions/list");
  },

  createTransaction(payload: CreateTransactionRequest) {
    return post<CreateTransactionRequest, CreateTransactionResponse>(
      "/api/transactions/create",
      payload
    );
  },

  executeTransaction(payload: ExecuteTransactionRequest) {
    return post<ExecuteTransactionRequest, ExecuteTransactionResponse>(
      "/api/transactions/execute",
      payload
    );
  },

  depositLiquidity(payload: DepositLiquidityRequest) {
    return post<DepositLiquidityRequest, DepositLiquidityResponse>(
      "/api/liquidity/deposit",
      payload
    );
  },

  processMerchantPayout(payload: MerchantPayoutRequest) {
    return post<MerchantPayoutRequest, MerchantPayoutResponse>(
      "/api/merchants/payout",
      payload
    );
  },
};
