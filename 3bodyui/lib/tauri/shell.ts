/**
 * Shell / External Operations API
 * 
 * Provides safe access to system shell operations, primarily for opening
 * external URLs in the default browser.
 * 
 * SECURITY NOTE: Only URLs with http/https protocols are allowed.
 * The app cannot execute arbitrary shell commands.
 * 
 * @module lib/tauri/shell
 * 
 * @example
 * ```typescript
 * import { external } from '@/lib/tauri/shell';
 * 
 * // Open a URL in the default browser
 * await external.openUrl('https://etherscan.io/tx/0x123...');
 * ```
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * External URL operations
 */
export const external = {
  /**
   * Open a URL in the system's default browser
   * 
   * This is safer than window.open() as it opens in an external browser,
   * preventing potential security issues with the app's webview.
   * 
   * @param url - The URL to open (must be http:// or https://)
   * @returns Promise that resolves when URL is opened
   * @throws Error if URL opening fails or URL is invalid
   * 
   * @example
   * ```typescript
   * // Open transaction on Etherscan
   * await external.openUrl('https://etherscan.io/tx/0xabc123...');
   * 
   * // Open support page
   * await external.openUrl('https://threebody.protocol/support');
   * ```
   */
  async openUrl(url: string): Promise<void> {
    // Validate URL
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }
    } catch {
      throw new Error('Invalid URL provided');
    }

    try {
      await invoke('open_external_url', { url });
    } catch (error) {
      console.error('Failed to open URL:', error);
      throw new Error(`Failed to open URL: ${error}`);
    }
  },

  /**
   * Open a blockchain explorer for a transaction
   * 
   * @param txHash - The transaction hash
   * @param explorer - The explorer to use (default: etherscan)
   * @returns Promise that resolves when explorer is opened
   * 
   * @example
   * ```typescript
   * await external.openExplorer('0xabc123...', 'etherscan');
   * ```
   */
  async openExplorer(
    txHash: string,
    explorer: 'etherscan' | 'polygonscan' | 'bscscan' = 'etherscan'
  ): Promise<void> {
    const explorers = {
      etherscan: 'https://etherscan.io/tx/',
      polygonscan: 'https://polygonscan.com/tx/',
      bscscan: 'https://bscscan.com/tx/',
    };

    const baseUrl = explorers[explorer];
    const cleanHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    
    return this.openUrl(`${baseUrl}${cleanHash}`);
  },
};
