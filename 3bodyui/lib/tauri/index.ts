/**
 * Tauri API Bridge
 * 
 * This module provides a clean interface for interacting with Tauri's native APIs.
 * All Tauri-specific functionality is centralized here to make it easier to:
 * - Mock in tests
 * - Replace if switching to a different native bridge
 * - Type properly with TypeScript
 * 
 * @module lib/tauri
 * @description Tauri native API bridge for desktop and mobile platforms
 * 
 * @example
 * ```typescript
 * import { secureStorage, notifications, external } from '@/lib/tauri';
 * 
 * // Store sensitive data securely
 * await secureStorage.set('wallet_key', 'encrypted_value');
 * 
 * // Show a native notification
 * await notifications.show('Transaction Complete', 'Your swap has been processed');
 * 
 * // Open external URL
 * await external.openUrl('https://etherscan.io/tx/0x123...');
 * ```
 */

import { invoke } from '@tauri-apps/api/core';

// Re-export all sub-modules
export { secureStorage } from './storage';
export { notifications } from './notifications';
export { appInfo } from './app';
export { external } from './shell';

type TauriWindow = Window & {
  __TAURI__?: unknown;
};

/**
 * Check if the app is running inside Tauri
 * 
 * This is useful for conditionally using native features only when available.
 * When running in a regular browser (web), these APIs won't be available.
 * 
 * @returns {boolean} True if running in Tauri, false otherwise
 * 
 * @example
 * ```typescript
 * import { isTauri } from '@/lib/tauri';
 * 
 * if (isTauri()) {
 *   // Use native features
 * } else {
 *   // Fallback to web APIs
 * }
 * ```
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && 
         (window as TauriWindow).__TAURI__ !== undefined;
}

/**
 * Check if running on a mobile platform (iOS or Android)
 * 
 * @returns Promise resolving to true if on mobile, false if desktop
 * 
 * @example
 * ```typescript
 * const mobile = await isMobile();
 * if (mobile) {
 *   // Use mobile-specific UI
 * }
 * ```
 */
export async function isMobile(): Promise<boolean> {
  if (!isTauri()) return false;
  
  try {
    return await invoke('is_mobile');
  } catch {
    return false;
  }
}

/**
 * Get the application's data directory path
 * 
 * This is where the app can store non-sensitive data files.
 * On mobile, this is sandboxed to the app.
 * 
 * @returns Promise resolving to the app data directory path
 * 
 * @example
 * ```typescript
 * const dataDir = await getAppDataDir();
 * console.log('App data directory:', dataDir);
 * ```
 */
export async function getAppDataDir(): Promise<string> {
  if (!isTauri()) {
    throw new Error('getAppDataDir is only available in Tauri');
  }
  
  return await invoke('get_app_data_dir');
}
