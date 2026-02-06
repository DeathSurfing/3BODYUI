/**
 * Application Information API
 * 
 * Provides access to application metadata and runtime information.
 * Useful for displaying version info, checking for updates, etc.
 * 
 * @module lib/tauri/app
 * 
 * @example
 * ```typescript
 * import { appInfo } from '@/lib/tauri/app';
 * 
 * const version = await appInfo.getVersion();
 * console.log('App version:', version);
 * ```
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Application information operations
 */
export const appInfo = {
  /**
   * Get the current application version
   * 
   * @returns Promise resolving to the version string (e.g., "1.0.0")
   * @throws Error if version retrieval fails
   * 
   * @example
   * ```typescript
   * const version = await appInfo.getVersion();
   * console.log(`Running version ${version}`);
   * ```
   */
  async getVersion(): Promise<string> {
    try {
      const version = await invoke<string>('get_app_version');
      return version;
    } catch (error) {
      console.error('Failed to get app version:', error);
      throw new Error(`Failed to get version: ${error}`);
    }
  },

  /**
   * Check if this is a production build
   * 
   * @returns boolean indicating if running in production mode
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },

  /**
   * Check if this is a development build
   * 
   * @returns boolean indicating if running in development mode
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },
};
