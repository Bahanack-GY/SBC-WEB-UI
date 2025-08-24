import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryInfo: {
    totalTransactions: number;
    totalAmount: number;
    message: string;
    suggestedIdentifiers: {
      email?: string;
      phoneNumber?: string;
      countryCode: string;
    };
  };
  enteredPassword?: string; // Add the entered password
}

const RecoveryModal: React.FC<RecoveryModalProps> = ({ 
  isOpen, 
  onClose, 
  recoveryInfo,
  enteredPassword 
}) => {
  const handleRegisterRedirect = () => {
    // Redirect to registration with pre-filled data including password
    const params = new URLSearchParams();
    if (recoveryInfo.suggestedIdentifiers.email) {
      params.append('email', recoveryInfo.suggestedIdentifiers.email);
    }
    if (recoveryInfo.suggestedIdentifiers.phoneNumber) {
      params.append('phone', recoveryInfo.suggestedIdentifiers.phoneNumber);
    }
    if (recoveryInfo.suggestedIdentifiers.countryCode) {
      params.append('country', recoveryInfo.suggestedIdentifiers.countryCode);
    }
    if (enteredPassword) {
      params.append('password', enteredPassword);
    }
    
    window.location.href = `/signup?${params.toString()}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <motion.div
            className="bg-white rounded-2xl shadow-lg max-w-md w-full relative animate-fadeIn max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-4 border-b border-gray-200">
              <button 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                onClick={onClose}
              >
                <FiX />
              </button>
              <div className="text-center pr-8">
                <div className="text-3xl mb-2">
                  {recoveryInfo.totalTransactions > 0 ? '🎉' : '⚠️'}
                </div>
                <h3 className="text-lg font-bold text-gray-800">
                  {recoveryInfo.totalTransactions > 0 
                    ? 'Récupération disponible!' 
                    : 'Compte introuvable'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {recoveryInfo.totalTransactions > 0 
                    ? 'Vos transactions peuvent être récupérées'
                    : 'Mais récupération possible'}
                </p>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-4">
              <p className="text-gray-700 text-center mb-4 text-sm">
                {recoveryInfo.message}
              </p>
              
              {/* Only show stats if we have transaction data */}
              {recoveryInfo.totalTransactions > 0 && (
                <div className="flex justify-center gap-6 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <span className="block text-xl font-bold text-blue-600">
                      {recoveryInfo.totalTransactions}
                    </span>
                    <span className="text-xs text-gray-600">
                      Transaction{recoveryInfo.totalTransactions > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xl font-bold text-green-600">
                      {recoveryInfo.totalAmount.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-600">XAF</span>
                  </div>
                </div>
              )}
              
              {/* Show a different message when we don't have specific transaction data */}
              {recoveryInfo.totalTransactions === 0 && (
                <div className="p-3 bg-orange-50 rounded-lg mb-4 border border-orange-200">
                  <p className="text-orange-700 text-sm text-center">
                    Vos informations de connexion ont été perdues, mais nous avons détecté des transactions 
                    associées à ce numéro. Inscrivez-vous avec les mêmes identifiants pour tout récupérer automatiquement.
                  </p>
                </div>
              )}
              
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">
                  Utilisez ces identifiants pour récupérer:
                </h4>
                {recoveryInfo.suggestedIdentifiers.email && (
                  <div className="flex items-center mb-2 text-sm">
                    <span className="mr-2">📧</span>
                    <span className="text-gray-700">Email: </span>
                    <span className="ml-1 font-medium text-blue-700 break-all">
                      {recoveryInfo.suggestedIdentifiers.email}
                    </span>
                  </div>
                )}
                {recoveryInfo.suggestedIdentifiers.phoneNumber && (
                  <div className="flex items-center mb-2 text-sm">
                    <span className="mr-2">📱</span>
                    <span className="text-gray-700">Téléphone: </span>
                    <span className="ml-1 font-medium text-blue-700">
                      {recoveryInfo.suggestedIdentifiers.phoneNumber}
                    </span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <span className="mr-2">🌍</span>
                  <span className="text-gray-700">Pays: </span>
                  <span className="ml-1 font-medium text-blue-700">
                    {recoveryInfo.suggestedIdentifiers.countryCode}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex flex-col gap-2 p-4 bg-gray-50 border-t border-gray-200">
              <button 
                className="w-full py-3 px-4 bg-[#115CF6] hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm"
                onClick={handleRegisterRedirect}
              >
                {recoveryInfo.totalTransactions > 0 ? 'S\'inscrire & Récupérer' : 'S\'inscrire pour récupérer'}
              </button>
              <button 
                className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors text-sm"
                onClick={onClose}
              >
                Annuler
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RecoveryModal;