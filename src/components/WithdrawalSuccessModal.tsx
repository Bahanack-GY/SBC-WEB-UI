import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface WithdrawalSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
  currency?: string;
}

/**
 * Modal component for displaying withdrawal success with approval notice
 * Replaces the old "Retrait effectué" message to reflect the new admin approval flow
 */
const WithdrawalSuccessModal: React.FC<WithdrawalSuccessModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency = 'XAF'
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleViewTransactions = () => {
    onClose();
    navigate('/wallet');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
          {t('common.withdrawal.submittedSuccessTitle')}
        </h3>

        {/* Message */}
        <p className="text-center text-gray-600 text-sm mb-4">
          {t('common.withdrawal.submittedSuccessMessage')}
        </p>

        {/* Amount Display */}
        {amount && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{t('wallet.amount')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {amount.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} {currency}
            </p>
          </div>
        )}

        {/* Info Box - Pending Approval */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">
                {t('common.withdrawal.importantInfo')}
              </p>
              <p className="mt-1 text-sm text-blue-800">
                {t('common.withdrawal.submittedSuccessInfo')}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                <li className="flex items-center">
                  <span className="mr-2">⏱️</span>
                  {t('common.withdrawal.approvalTime')}
                </li>
                <li className="flex items-center">
                  <span className="mr-2">📬</span>
                  {t('common.withdrawal.willBeNotified')}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleViewTransactions}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {t('common.withdrawal.viewTransactions')}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {t('common.ok')}
          </button>
        </div>

        {/* Disclaimer */}
        <p className="mt-4 text-xs text-center text-gray-500">
          {t('common.withdrawal.estimatedApprovalTime')}
        </p>
      </div>
    </div>
  );
};

export default WithdrawalSuccessModal;
