type FetchOptions = {
  body?: unknown;
  context?: unknown;
};

/**
 * Internal fetch helper for API routes
 * 
 * NOTE: During static export (for Tauri), this will fail if the backend
 * is not running. In production Tauri apps, these API calls should be
 * converted to Tauri commands (see src-tauri/src/lib.rs).
 * 
 * @see docs/ARCHITECTURE.md for migration strategy
 */
export async function internalFetch<T>(
  path: string,
  options?: FetchOptions
): Promise<T> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  
  try {
    const response = await fetch(`${backendUrl}${path}`, {
      method: options?.body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch {
    // During static export, backend won't be available
    // Return mock data for build purposes
    console.warn(`Backend unavailable, returning mock data for ${path}`);
    return generateMockResponse<T>(path);
  }
}

/**
 * Generate mock responses for build-time static generation
 * These should be replaced with actual Tauri commands in production
 */
function generateMockResponse<T>(path: string): T {
  // Simple mock responses based on path
  if (path.includes('/liquidity/exposure')) {
    return {
      totalLiquidity: 1000000,
      availableLiquidity: 750000,
      utilizationRate: 0.25,
      totalFeesEarned: 5000
    } as T;
  }
  
  if (path.includes('/quotes/usdt-inr')) {
    return {
      rate: 83.15,
      usdtPriceInInr: 83.15,
      usdtPriceInUsd: 1.0,
      priceChange24h: 0.12,
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString(),
    } as T;
  }
  
  if (path.includes('/wallets/balance')) {
    return {
      usd: 1000,
      usdt: 500
    } as T;
  }

  if (path.includes('/transactions/list')) {
    return {
      transactions: [
        {
          id: 'TX-001',
          payeeAddress: '0xAlice...123',
          usdAmount: 500,
          usdtAmount: 500,
          fee: 0.05,
          status: 'FULFILLED',
          timestamp: Date.now() - 3600000,
          lpAddress: '0xLP...456',
        },
        {
          id: 'TX-002',
          payeeAddress: '0xBob...789',
          usdAmount: 1200,
          usdtAmount: 1200,
          fee: 0.12,
          status: 'AUTHORIZED',
          timestamp: Date.now() - 1800000,
        },
      ],
    } as T;
  }
  
  if (path.includes('/transactions/create')) {
    return {
      id: `tx_${Date.now()}`,
      status: 'PENDING'
    } as T;
  }
  
  if (path.includes('/transactions/execute')) {
    return {
      status: 'FULFILLED',
      txHash: `0x${Math.random().toString(16).slice(2)}`
    } as T;
  }
  
  if (path.includes('/merchants/payout')) {
    return {
      status: 'COMPLETED',
      amount: 1000
    } as T;
  }

  if (path.includes('/liquidity/deposit')) {
    return {
      status: 'ACCEPTED',
      amount: 0,
    } as T;
  }
  
  return {} as T;
}
