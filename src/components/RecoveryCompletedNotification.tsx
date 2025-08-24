import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

interface RecoveryCompletedNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryData: {
    recoveryDetails: {
      totalTransactions: number;
      paymentTransactions: number;
      payoutTransactions: number;
      totalAmount: number;
      restoredAt: string;
    };
    notification: {
      title: string;
      message: string;
      details: string[];
      actions: Array<{
        type: string;
        label: string;
        target: string;
      }>;
    };
  };
}

const RecoveryCompletedNotification: React.FC<RecoveryCompletedNotificationProps> = ({ 
  isOpen, 
  onClose, 
  recoveryData 
}) => {
  const handleNavigation = (target: string) => {
    onClose();
    window.location.href = target;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="recovery-completed-modal bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header bg-gradient-to-r from-green-500 to-green-600 text-white text-center p-8 relative">
              <button 
                className="absolute top-4 right-4 text-white hover:text-green-200 text-xl"
                onClick={onClose}
              >
                <FiX />
              </button>
              <div className="success-icon text-5xl mb-4">
                ✅
              </div>
              <h2 className="text-2xl font-bold">
                {recoveryData.notification.title}
              </h2>
            </div>
            
            {/* Body */}
            <div className="modal-body p-6">
              <p className="main-message text-center text-gray-700 text-lg mb-6">
                {recoveryData.notification.message}
              </p>
              
              <div className="recovery-summary">
                <div className="summary-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="stat-card bg-gray-50 border-2 border-gray-100 rounded-lg p-4 text-center">
                    <span className="stat-number block text-2xl font-bold text-green-600">
                      {recoveryData.recoveryDetails.totalTransactions}
                    </span>
                    <span className="stat-label text-xs text-gray-600 mt-1 block">
                      Total Transactions
                    </span>
                  </div>
                  <div className="stat-card bg-gray-50 border-2 border-gray-100 rounded-lg p-4 text-center">
                    <span className="stat-number block text-2xl font-bold text-green-600">
                      {recoveryData.recoveryDetails.totalAmount.toLocaleString()}
                    </span>
                    <span className="stat-label text-xs text-gray-600 mt-1 block">
                      XAF Récupérés
                    </span>
                  </div>
                  <div className="stat-card bg-gray-50 border-2 border-gray-100 rounded-lg p-4 text-center">
                    <span className="stat-number block text-2xl font-bold text-green-600">
                      {recoveryData.recoveryDetails.paymentTransactions}
                    </span>
                    <span className="stat-label text-xs text-gray-600 mt-1 block">
                      Abonnements
                    </span>
                  </div>
                  <div className="stat-card bg-gray-50 border-2 border-gray-100 rounded-lg p-4 text-center">
                    <span className="stat-number block text-2xl font-bold text-green-600">
                      {recoveryData.recoveryDetails.payoutTransactions}
                    </span>
                    <span className="stat-label text-xs text-gray-600 mt-1 block">
                      Retraits
                    </span>
                  </div>
                </div>
                
                <div className="recovery-details bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Ce qui a été récupéré:
                  </h4>
                  <ul className="space-y-2">
                    {recoveryData.notification.details.map((detail, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-700">
                        <span className="mr-2 text-green-600 font-bold">✓</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="modal-footer flex flex-col sm:flex-row justify-between gap-3 p-6 bg-gray-50">
              <button 
                className="btn-secondary px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                onClick={onClose}
              >
                Parfait!
              </button>
              <div className="action-buttons flex gap-2">
                {recoveryData.notification.actions.map((action, index) => (
                  <button 
                    key={index}
                    className="btn-primary px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-colors"
                    onClick={() => handleNavigation(action.target)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecoveryCompletedNotification;