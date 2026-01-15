
export enum UserRole {
  UNSELECTED = 'UNSELECTED',
  PAYEE = 'PAYEE',
  MERCHANT = 'MERCHANT',
  LIQUIDITY_PROVIDER = 'LIQUIDITY_PROVIDER'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  HTTP_402_REQUIRED = 'HTTP_402_REQUIRED',
  AUTHORIZED = 'AUTHORIZED',
  FULFILLED = 'FULFILLED',
  FAILED = 'FAILED'
}

export interface Transaction {
  id: string;
  payeeAddress: string;
  usdAmount: number;
  usdtAmount: number;
  fee: number;
  status: TransactionStatus;
  timestamp: number;
  lpAddress?: string;
}

export interface PoolStats {
  totalLiquidity: number;
  availableLiquidity: number;
  utilizationRate: number;
  totalFeesEarned: number;
}

export interface WalletState {
  address: string | null;
  connected: boolean;
  balanceUSD: number;
  balanceUSDT: number;
}
