/**
 * Transaction Helper Utilities
 * Handles status labels, colors, and icons for transaction displays
 */

/**
 * Get the translation key for a transaction status
 */
export function getStatusTranslationKey(status: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': 'common.statuses.pending',
    'pending_otp_verification': 'common.statuses.pendingOTP',
    'pending_admin_approval': 'common.statuses.pendingAdminApproval',
    'processing': 'common.statuses.processing',
    'completed': 'common.statuses.completed',
    'failed': 'common.statuses.failed',
    'rejected_by_admin': 'common.statuses.rejectedByAdmin',
    'cancelled': 'common.statuses.cancelled',
    'refunded': 'common.statuses.refunded',
  };

  return statusMap[status] || status;
}

/**
 * Get the color for a transaction status (hex color code)
 */
export function getStatusColor(status: string): string {
  const colorMap: { [key: string]: string } = {
    'pending': '#f59e0b', // Orange
    'pending_otp_verification': '#f59e0b', // Orange
    'pending_admin_approval': '#f59e0b', // Orange
    'processing': '#3b82f6', // Blue
    'completed': '#10b981', // Green
    'failed': '#ef4444', // Red
    'rejected_by_admin': '#ef4444', // Red
    'cancelled': '#9ca3af', // Gray
    'refunded': '#a855f7', // Purple
  };

  return colorMap[status] || '#6b7280'; // Default gray
}

/**
 * Get the icon name for a transaction status (for icon libraries)
 */
export function getStatusIcon(status: string): string {
  const iconMap: { [key: string]: string } = {
    'pending': 'hourglass-empty',
    'pending_otp_verification': 'hourglass-empty',
    'pending_admin_approval': 'hourglass-empty',
    'processing': 'sync',
    'completed': 'check-circle',
    'failed': 'times-circle',
    'rejected_by_admin': 'times-circle',
    'cancelled': 'cancel',
    'refunded': 'refresh',
  };

  return iconMap[status] || 'info-circle';
}

/**
 * Check if a withdrawal is pending admin approval
 */
export function isPendingAdminApproval(status: string): boolean {
  return status === 'pending_admin_approval';
}

/**
 * Check if a withdrawal was rejected by admin
 */
export function isRejectedByAdmin(status: string): boolean {
  return status === 'rejected_by_admin';
}

/**
 * Check if a withdrawal is in a pending state (waiting for something)
 */
export function isPendingState(status: string): boolean {
  return ['pending', 'pending_otp_verification', 'pending_admin_approval'].includes(status);
}

/**
 * Check if a withdrawal is in a final state (no more changes expected)
 */
export function isFinalState(status: string): boolean {
  return ['completed', 'failed', 'rejected_by_admin', 'cancelled', 'refunded'].includes(status);
}

/**
 * Check if the user can cancel a pending withdrawal
 * Note: Users can ONLY cancel when OTP verification is pending
 * Once admin starts processing (pending_admin_approval or processing), cancellation is NOT allowed
 */
export function canCancelWithdrawal(status: string): boolean {
  return ['pending', 'pending_otp_verification'].includes(status);
}

/**
 * Check if a withdrawal is being processed by admin (cannot be cancelled)
 */
export function isAdminProcessing(status: string): boolean {
  return ['pending_admin_approval', 'processing'].includes(status);
}

/**
 * Check if there's an ongoing withdrawal that blocks new withdrawals
 */
export function isOngoingWithdrawal(status: string): boolean {
  return ['pending', 'pending_otp_verification', 'pending_admin_approval', 'processing'].includes(status);
}

/**
 * Check if the withdrawal is in processing (between approval and completion)
 */
export function isProcessing(status: string): boolean {
  return ['processing'].includes(status);
}

/**
 * Get a human-readable description of the withdrawal status
 */
export function getStatusDescription(status: string, t?: any): string {
  if (!t) {
    // Fallback descriptions if translation function not provided
    const descriptions: { [key: string]: string } = {
      'pending': 'Your withdrawal is pending',
      'pending_otp_verification': 'Waiting for OTP verification',
      'pending_admin_approval': 'Waiting for admin approval',
      'processing': 'Your withdrawal is being processed',
      'completed': 'Withdrawal completed successfully',
      'failed': 'Withdrawal failed',
      'rejected_by_admin': 'Withdrawal rejected',
      'cancelled': 'Withdrawal cancelled',
      'refunded': 'Withdrawal refunded',
    };
    return descriptions[status] || status;
  }

  // Use translation keys when t function is provided
  const transKey = getStatusTranslationKey(status);
  return t(transKey);
}

/**
 * Check if a transaction is a withdrawal
 */
export function isWithdrawal(type: string): boolean {
  return type === 'withdrawal';
}

/**
 * Check if a transaction amount should be shown as negative (for withdrawals)
 */
export function shouldShowNegative(type: string): boolean {
  return ['withdrawal', 'payment'].includes(type);
}

/**
 * Format transaction amount with sign
 */
export function formatTransactionAmount(amount: number, type: string, currency: string = 'XAF'): string {
  const sign = shouldShowNegative(type) ? '-' : '+';
  const formatted = Math.abs(amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${sign}${formatted} ${currency}`;
}
