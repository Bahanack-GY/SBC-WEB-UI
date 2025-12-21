import { useState, useEffect } from 'react';
import { FiDownload, FiShare2, FiChevronDown, FiChevronUp, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';

function TransactionConfirmation() {
  const [showDetails, setShowDetails] = useState(false);
  const [infoModal, setInfoModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const location = useLocation();
  const navigate = useNavigate();

  const {
    transactionId,
    withdrawalAmount,
    withdrawalCurrency,
  } = location.state || {};

  useEffect(() => {
    if (!transactionId || withdrawalAmount === undefined) {
      navigate('/wallet');
    }
  }, [transactionId, withdrawalAmount, navigate]);

  const handleDownload = () => {
    setInfoModal({ show: true, message: 'Le reçu PDF sera disponible une fois la transaction finalisée.' });
  };
  const handleShare = () => {
    if (transactionId && withdrawalAmount !== undefined && withdrawalCurrency) {
      const shareText = `Ma demande de retrait de ${withdrawalAmount.toLocaleString('fr-FR')} ${withdrawalCurrency} (ID: ${transactionId}) est en cours de traitement.`;
      if (navigator.share) {
        navigator.share({ text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        setInfoModal({ show: true, message: 'Informations de la transaction copiées dans le presse-papier !' });
      }
    } else {
      setInfoModal({ show: true, message: "Informations de transaction insuffisantes pour partager." });
    }
  };

  if (!transactionId || withdrawalAmount === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        Redirection...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-md flex justify-start mb-4">
        <BackButton />
      </div>

      {/* Transaction summary card */}
      <div className="w-full max-w-md bg-[#f8fafc] border border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-4 mb-6">

        <div className="bg-[#115CF6]/10 rounded-full p-3 flex items-center justify-center">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#115CF6" opacity="0.1" /><path d="M8 12h8M8 16h5" stroke="#115CF6" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-800">Retrait SBC</div>
          <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', weekday: 'long' })}
          </div>
        </div>
        <div className="text-[#115CF6] font-bold text-lg">{withdrawalAmount.toLocaleString('fr-FR')} {withdrawalCurrency || 'F'}</div>
      </div>
      {/* Processing indicator */}
      <motion.div initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="mb-4">
        <div className="bg-yellow-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
          <FiLoader size={48} className="text-yellow-500 animate-spin" />
        </div>
      </motion.div>
      {/* Processing message */}
      <div className="text-2xl font-bold text-gray-800 text-center mb-2">Votre retrait est en cours de traitement</div>
      <div className="text-gray-500 text-center max-w-md mb-6">
        Votre demande de retrait a été enregistrée et est en cours de traitement. Vous recevrez une notification lorsque le processus sera terminé.
      </div>
      <div className="flex gap-3 mb-6">
        <button onClick={handleDownload} className="flex items-center gap-2 bg-[#115CF6] text-white rounded-xl px-5 py-2 font-bold shadow hover:bg-blue-800 transition-colors">
          <FiDownload /> Télécharger PDF
        </button>
        <button onClick={handleShare} className="flex items-center gap-2 bg-green-600 text-white rounded-xl px-5 py-2 font-bold shadow hover:bg-green-700 transition-colors">
          <FiShare2 /> Partager
        </button>
      </div>
      <button
        className="flex items-center gap-2 text-[#115CF6] font-semibold mb-2 focus:outline-none"
        onClick={() => setShowDetails(v => !v)}
      >
        {showDetails ? <FiChevronUp /> : <FiChevronDown />} Voir plus
      </button>
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full max-w-md bg-white border border-gray-100 rounded-xl p-4 shadow mb-4"
          >
            <div className="mb-2 text-sm text-gray-500">ID de la transaction</div>
            <div className="font-mono text-sm mb-2">{transactionId}</div>
            <div className="mb-2 text-sm text-gray-500">Type</div>
            <div className="font-semibold mb-2">Retrait</div>
            <div className="mb-2 text-sm text-gray-500">Statut</div>
            <div className="font-semibold mb-2 text-yellow-600">En cours de traitement</div>
            <div className="mb-2 text-sm text-gray-500">Montant</div>
            <div className="font-bold text-lg mb-2 text-green-600">{withdrawalAmount.toLocaleString('fr-FR')} {withdrawalCurrency || 'F'}</div>
            <div className="mb-2 text-sm text-gray-500">Description</div>
            <div className="mb-2">Demande de retrait de fonds</div>
            <div className="mb-2 text-sm text-gray-500">Date</div>
            <div className="mb-2">
              {new Date().toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {infoModal.show && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInfoModal({ show: false, message: '' })}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Information</h3>
                <p className="text-gray-600 mb-6">{infoModal.message}</p>
                <button
                  onClick={() => setInfoModal({ show: false, message: '' })}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TransactionConfirmation;