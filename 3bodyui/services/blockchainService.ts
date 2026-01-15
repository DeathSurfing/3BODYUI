
import { Transaction, TransactionStatus, PoolStats } from '../types';
import { DEFAULT_MERCHANT_FEE, EXCHANGE_RATE } from '../constants';

class BlockchainService {
  private transactions: Transaction[] = [];
  private poolStats: PoolStats = {
    totalLiquidity: 1000000,
    availableLiquidity: 850000,
    utilizationRate: 0.15,
    totalFeesEarned: 1240.50,
  };

  constructor() {
    // Initial mock data
    this.transactions = [
      {
        id: 'TX-001',
        payeeAddress: '0xAlice...123',
        usdAmount: 500,
        usdtAmount: 500,
        fee: 0.05,
        status: TransactionStatus.FULFILLED,
        timestamp: Date.now() - 3600000,
        lpAddress: '0xLP...456'
      },
      {
        id: 'TX-002',
        payeeAddress: '0xBob...789',
        usdAmount: 1200,
        usdtAmount: 1200,
        fee: 0.12,
        status: TransactionStatus.HTTP_402_REQUIRED,
        timestamp: Date.now() - 1800000,
      }
    ];
  }

  getTransactions(): Transaction[] {
    return [...this.transactions].sort((a, b) => b.timestamp - a.timestamp);
  }

  getPoolStats(): PoolStats {
    return { ...this.poolStats };
  }

  createRequest(payeeAddress: string, usdAmount: number): Transaction {
    const usdtAmount = usdAmount * EXCHANGE_RATE;
    const fee = usdAmount * DEFAULT_MERCHANT_FEE;
    
    const newTx: Transaction = {
      id: `TX-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      payeeAddress,
      usdAmount,
      usdtAmount,
      fee,
      status: TransactionStatus.HTTP_402_REQUIRED,
      timestamp: Date.now(),
    };

    this.transactions.push(newTx);
    return newTx;
  }

  authorizePayment(txId: string): void {
    const tx = this.transactions.find(t => t.id === txId);
    if (tx && tx.status === TransactionStatus.HTTP_402_REQUIRED) {
      tx.status = TransactionStatus.AUTHORIZED;
    }
  }

  fulfillRequest(txId: string, lpAddress: string): void {
    const tx = this.transactions.find(t => t.id === txId);
    if (tx && tx.status === TransactionStatus.AUTHORIZED) {
      tx.status = TransactionStatus.FULFILLED;
      tx.lpAddress = lpAddress;
      this.poolStats.availableLiquidity -= tx.usdtAmount;
      this.poolStats.totalFeesEarned += tx.fee;
      this.poolStats.utilizationRate = (this.poolStats.totalLiquidity - this.poolStats.availableLiquidity) / this.poolStats.totalLiquidity;
    }
  }

  addLiquidity(amount: number): void {
    this.poolStats.totalLiquidity += amount;
    this.poolStats.availableLiquidity += amount;
    this.poolStats.utilizationRate = (this.poolStats.totalLiquidity - this.poolStats.availableLiquidity) / this.poolStats.totalLiquidity;
  }
}

export const blockchainService = new BlockchainService();
