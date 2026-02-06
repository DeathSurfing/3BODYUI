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
 * import { secureStorage, notifications } from '@/lib/tauri';
 * 
 * // Store sensitive data securely
 * await secureStorage.set('wallet_key', 'encrypted_value');
 * 
 * // Show a native notification
 * await notifications.show('Transaction Complete', 'Your swap has been processed');
 * ```
 */

// Re-export all sub-modules
export { secureStorage } from './storage';
export { notifications } from './notifications';
export { appInfo } from './app';
export { external } from './shell';

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
         (window as any).__TAURI__ !== undefined;
}
