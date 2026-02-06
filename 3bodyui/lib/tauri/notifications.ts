/**
 * Native Notifications API
 * 
 * Provides access to the native notification system on all platforms:
 * - Desktop: System notification center / toast notifications
 * - Mobile: Push-style notifications with native styling
 * 
 * Use this for alerting users about:
 * - Transaction status updates
 * - Security alerts
 * - Important system messages
 * 
 * @module lib/tauri/notifications
 * 
 * @example
 * ```typescript
 * import { notifications } from '@/lib/tauri/notifications';
 * 
 * await notifications.show(
 *   'Transaction Complete',
 *   'Your USD to USDT swap has been processed successfully'
 * );
 * ```
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Notification display options
 */
export interface NotificationOptions {
  /** The notification title */
  title: string;
  /** The notification body text */
  body: string;
  /** Optional: Notification icon (platform-specific) */
  icon?: string;
}

/**
 * Native notification operations
 */
export const notifications = {
  /**
   * Display a native notification to the user
   * 
   * On mobile, this shows a push-style notification.
   * On desktop, this shows a system notification/toast.
   * 
   * @param title - The notification title
   * @param body - The notification body message
   * @returns Promise that resolves when notification is displayed
   * @throws Error if notification fails to display
   * 
   * @example
   * ```typescript
   * await notifications.show(
   *   'Payment Received',
   *   'You have received 100 USDT from 0x1234...'
   * );
   * ```
   */
  async show(title: string, body: string): Promise<void> {
    try {
      await invoke('show_notification', { title, body });
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw new Error(`Notification failed: ${error}`);
    }
  },

  /**
   * Display a notification with options object
   * 
   * @param options - Notification options including title and body
   * @returns Promise that resolves when notification is displayed
   * 
   * @example
   * ```typescript
   * await notifications.showWithOptions({
   *   title: 'Alert',
   *   body: 'Unusual activity detected',
   *   icon: '/assets/warning.png'
   * });
   * ```
   */
  async showWithOptions(options: NotificationOptions): Promise<void> {
    return this.show(options.title, options.body);
  },

  /**
   * Convenience method for transaction notifications
   * 
   * @param status - The transaction status (e.g., 'completed', 'failed')
   * @param amount - The transaction amount
   * @param currency - The currency (e.g., 'USDT', 'USD')
   * @returns Promise that resolves when notification is displayed
   * 
   * @example
   * ```typescript
   * await notifications.transaction('completed', 100, 'USDT');
   * ```
   */
  async transaction(
    status: 'completed' | 'failed' | 'pending',
    amount: number,
    currency: string
  ): Promise<void> {
    const titles = {
      completed: 'Transaction Complete',
      failed: 'Transaction Failed',
      pending: 'Transaction Pending',
    };

    const bodies = {
      completed: `Your transaction of ${amount} ${currency} has been completed successfully.`,
      failed: `Your transaction of ${amount} ${currency} has failed. Please try again.`,
      pending: `Your transaction of ${amount} ${currency} is being processed.`,
    };

    return this.show(titles[status], bodies[status]);
  },
};
