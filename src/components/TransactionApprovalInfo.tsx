import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Transaction } from '../types/api';
import { isPendingAdminApproval, isRejectedByAdmin } from '../utils/transactionHelpers';

interface TransactionApprovalInfoProps {
  transaction: Transaction;
}

/**
 * Component to display approval-related information for withdrawals
 */
const TransactionApprovalInfo: React.FC<TransactionApprovalInfoProps> = ({ transaction }) => {
  const { t } = useTranslation();

  // Show pending approval info
  if (isPendingAdminApproval(transaction.status)) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-orange-900">
              {t('common.withdrawal.pendingApprovalTitle')}
            </h3>
            <p className="mt-2 text-sm text-orange-800">
              {t('common.withdrawal.pendingApprovalMessage')}
            </p>
            <p className="mt-2 text-xs text-orange-700 flex items-center">
              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 002 0V6z" clipRule="evenodd" />
              </svg>
              {t('common.withdrawal.estimatedApprovalTime')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show rejection info
  if (isRejectedByAdmin(transaction.status) && transaction.rejectionReason) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-900">
              {t('common.withdrawal.rejectedTitle')}
            </h3>
            <p className="mt-2 text-sm text-red-800">
              {t('common.withdrawal.rejectionReason', { reason: transaction.rejectionReason })}
            </p>
            {transaction.rejectedAt && (
              <p className="mt-2 text-xs text-red-700">
                {t('common.withdrawal.rejectionDate', {
                  date: new Date(transaction.rejectedAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                })}
              </p>
            )}
            <p className="mt-2 text-sm font-medium text-green-700">
              ✓ {t('common.withdrawal.balanceRefunded')}
            </p>
            {transaction.adminNotes && (
              <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
                <strong>Admin Notes:</strong> {transaction.adminNotes}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No approval info to display
  return null;
};

export default TransactionApprovalInfo;
