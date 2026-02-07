/**
 * Price Service - CoinGecko API Integration
 * Fetches USDT to INR conversion rates
 */

export interface PriceData {
  usdtPriceInInr: number;
  usdtPriceInUsd: number;
  priceChange24h: number;
  lastUpdated: Date;
}

class PriceService {
  private static instance: PriceService;
  private lastFetchTime: number = 0;
  private cachedData: PriceData | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  /**
   * Fetch current USDT price from CoinGecko
   * Returns cached data if within 30 seconds
   */
  async fetchUSDTPrice(): Promise<PriceData> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cachedData && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.cachedData;
    }

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr,usd&include_24hr_change=true'
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      const priceData: PriceData = {
        usdtPriceInInr: data.tether.inr,
        usdtPriceInUsd: data.tether.usd,
        priceChange24h: data.tether.inr_24h_change || 0,
        lastUpdated: new Date(),
      };

      this.cachedData = priceData;
      this.lastFetchTime = now;
      
      return priceData;
    } catch (error) {
      console.error('Failed to fetch price:', error);
      
      // Return cached data if available, even if expired
      if (this.cachedData) {
        return this.cachedData;
      }
      
      // Return fallback data
      return {
        usdtPriceInInr: 83.15,
        usdtPriceInUsd: 1.0,
        priceChange24h: 0,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Convert USDT amount to INR
   */
  convertToINR(usdtAmount: number, priceInInr: number): number {
    return usdtAmount * priceInInr;
  }

  /**
   * Convert USDT amount to USD
   */
  convertToUSD(usdtAmount: number, priceInUsd: number): number {
    return usdtAmount * priceInUsd;
  }
}

export const priceService = PriceService.getInstance();
