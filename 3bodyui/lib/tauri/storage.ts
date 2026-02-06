/**
 * Secure Storage API
 * 
 * Provides encrypted key-value storage using the native platform's secure storage:
 * - iOS: Keychain Services
 * - Android: Keystore System
 * - Windows: Credential Manager / DPAPI
 * - macOS: Keychain
 * - Linux: Secret Service API / libsecret
 * 
 * This is ideal for storing sensitive data like:
 * - Wallet private keys
 * - Authentication tokens
 * - User credentials
 * 
 * @module lib/tauri/storage
 * 
 * @example
 * ```typescript
 * import { secureStorage } from '@/lib/tauri/storage';
 * 
 * // Store a value
 * await secureStorage.set('wallet_key', encryptedKey);
 * 
 * // Retrieve a value
 * const key = await secureStorage.get('wallet_key');
 * 
 * // Delete a value
 * await secureStorage.delete('wallet_key');
 * ```
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Storage operations for secure key-value pairs
 */
export const secureStorage = {
  /**
   * Store a value securely in the native keychain/keystore
   * 
   * @param key - The key to store the value under
   * @param value - The value to store (will be encrypted)
   * @returns Promise that resolves when storage is complete
   * @throws Error if storage fails
   * 
   * @example
   * ```typescript
   * await secureStorage.set('wallet_key', encryptedPrivateKey);
   * ```
   */
  async set(key: string, value: string): Promise<void> {
    try {
      await invoke('secure_store', { key, value });
    } catch (error) {
      console.error('Failed to store value securely:', error);
      throw new Error(`Secure storage set failed: ${error}`);
    }
  },

  /**
   * Retrieve a value from secure storage
   * 
   * @param key - The key to retrieve
   * @returns Promise resolving to the stored value, or null if not found
   * @throws Error if retrieval fails
   * 
   * @example
   * ```typescript
   * const value = await secureStorage.get('wallet_key');
   * if (value) {
   *   console.log('Retrieved:', value);
   * }
   * ```
   */
  async get(key: string): Promise<string | null> {
    try {
      const result = await invoke<string | null>('secure_retrieve', { key });
      return result;
    } catch (error) {
      console.error('Failed to retrieve value:', error);
      throw new Error(`Secure storage get failed: ${error}`);
    }
  },

  /**
   * Delete a value from secure storage
   * 
   * @param key - The key to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if deletion fails
   * 
   * @example
   * ```typescript
   * await secureStorage.delete('wallet_key');
   * ```
   */
  async delete(key: string): Promise<void> {
    try {
      await invoke('secure_delete', { key });
    } catch (error) {
      console.error('Failed to delete value:', error);
      throw new Error(`Secure storage delete failed: ${error}`);
    }
  },

  /**
   * Check if a key exists in secure storage
   * 
   * @param key - The key to check
   * @returns Promise resolving to true if key exists, false otherwise
   * 
   * @example
   * ```typescript
   * if (await secureStorage.has('wallet_key')) {
   *   console.log('Wallet key exists');
   * }
   * ```
   */
  async has(key: string): Promise<boolean> {
    try {
      const result = await this.get(key);
      return result !== null;
    } catch {
      return false;
    }
  },
};
