import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiX, FiUsers, FiDollarSign } from 'react-icons/fi';

interface NegativeBalanceNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  userReferralCode: string;
  negativeBalance: number;
}

const NegativeBalanceNotification: React.FC<NegativeBalanceNotificationProps> = ({
  isOpen,
  onClose,
  userReferralCode,
  negativeBalance,
}) => {
  console.log('NegativeBalanceNotification props:', { isOpen, userReferralCode, negativeBalance });

  const message = `Vous avez un solde négatif de ${Math.abs(negativeBalance).toLocaleString()} XAF parce que vous avez perdu vos filleuls. Ne vous inquiétez pas ! Vous pouvez facilement récupérer ces montants.`;

  const recoverySteps = [
    `📋 Utilisez votre code parrain: "${userReferralCode}"`,
    "🔄 Demandez à vos filleuls de se réinscrire avec ce code",
    "📱 Ils doivent utiliser le même numéro de téléphone qu'avant",
    "💰 Ils ne paieront pas à nouveau - leurs comptes seront simplement restaurés",
    "✅ Vous recevrez automatiquement les montants de leurs paiements",
    "🎉 Votre solde négatif sera corrigé instantanément"
  ];

  console.log('NegativeBalanceNotification message:', message);
  console.log('Recovery steps:', recoverySteps);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-w-[95vw] sm:max-w-lg mx-auto my-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          >
            <div className="flex items-start mb-3 sm:mb-4">
              <div className="bg-red-100 rounded-full p-2 sm:p-3 mr-3 sm:mr-4 flex-shrink-0">
                <FiAlertCircle className="text-red-600" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
                  ⚠️ Solde Négatif Détecté
                </h3>
                <div className="flex items-center text-red-600 text-sm mb-2 sm:mb-3">
                  <FiDollarSign size={14} className="mr-1 flex-shrink-0" />
                  <span className="truncate">-{Math.abs(negativeBalance).toLocaleString()} XAF</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-3 sm:p-4 rounded-r-lg mb-3 sm:mb-4">
              <div className="flex items-start">
                <FiUsers className="text-red-600 mr-2 sm:mr-3 mt-1 flex-shrink-0" size={18} />
                <div className="text-gray-700 text-sm leading-relaxed">
                  {message}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h4 className="font-semibold text-blue-800 mb-2 sm:mb-3 text-sm">
                🔧 Comment résoudre ce problème :
              </h4>
              <div className="space-y-1 sm:space-y-2">
                {recoverySteps.map((step, index) => (
                  <div key={index} className="flex items-start text-sm text-blue-700">
                    <span className="mr-2 text-blue-600 font-bold flex-shrink-0">{index + 1}.</span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h4 className="font-semibold text-green-800 mb-2 text-sm">
                💡 Avantages pour vos filleuls :
              </h4>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• ✅ Pas de paiement supplémentaire requis</li>
                <li>• 📱 Utiliser le même numéro pour une récupération facile</li>
                <li>• 🔄 Récupération automatique de leur historique</li>
                <li>• 📈 Conservation de leur niveau et avantages</li>
                <li>• 🎁 Vous recevrez les commissions normalement</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(userReferralCode);
                  // You could add a toast notification here
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 text-sm min-h-[44px] flex items-center justify-center"
              >
                📋 Copier Code
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 min-h-[44px] flex items-center justify-center"
              >
                J'ai compris
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NegativeBalanceNotification;
