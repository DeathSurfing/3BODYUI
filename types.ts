
export enum ExchangeStep {
  IDLE = 'IDLE',
  REQUESTING_EXCHANGE = 'REQUESTING_EXCHANGE',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  PROCESSING_PAYMENT = 'PROCESSING_PAYMENT',
  CONFIRMING_PAYMENT = 'CONFIRMING_PAYMENT',
  CONVERTING_ASSETS = 'CONVERTING_ASSETS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface NetworkLog {
  id: string;
  timestamp: string;
  type: 'REQUEST' | 'RESPONSE';
  method?: string;
  path?: string;
  status?: number;
  headers: Record<string, string>;
  body: any;
  role: 'PAYEE' | 'MERCHANT' | 'SELLER';
}

export interface ExchangeParams {
  sourceCurrency: string;
  destCurrency: string;
  amount: number;
  payeeAddress: string;
}

export interface X402Headers {
  'X-402-Amount': string;
  'X-402-Currency': string;
  'X-402-Address': string;
  'X-402-Network': string;
  'X-402-Deadline': string;
}

export interface ConversionResult {
  txId: string;
  rate: number;
  receivedAmount: number;
}
