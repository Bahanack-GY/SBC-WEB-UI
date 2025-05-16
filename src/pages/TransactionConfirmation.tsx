import { useState } from 'react';
import { FiDownload, FiShare2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const transaction = {
  id: 123456,
  name: 'Placement principal',
  date: '14 Avril, Dimanche',
  amount: 70500,
  type: 'Paiement',
  description: 'Paiement pour la réservation de la bannière principale.',
  status: 'Succès',
  phone: '+31611133458',
};

function TransactionConfirmation() {
  const [showDetails, setShowDetails] = useState(false);

  const handleDownload = () => {
    alert('Téléchargement du reçu PDF...');
  };
  const handleShare = () => {
    alert('Partage du reçu PDF...');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-8">
      {/* Transaction summary card */}
      <div className="w-full max-w-md bg-[#f8fafc] border border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-4 mb-6">
        <div className="bg-[#115CF6]/10 rounded-full p-3 flex items-center justify-center">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#115CF6" opacity="0.1"/><path d="M8 12h8M8 16h5" stroke="#115CF6" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-800">Retrait SBC</div>
          <div className="text-xs text-gray-500">{transaction.date}</div>
        </div>
        <div className="text-[#115CF6] font-bold text-lg">{transaction.amount.toLocaleString()} F</div>
      </div>
      {/* Checkmark */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }} className="mb-4">
        <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#22c55e" opacity="0.15"/><path d="M8 12.5l3 3 5-5.5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </motion.div>
      {/* Success message */}
      <div className="text-2xl font-bold text-gray-800 text-center mb-2">Votre transaction a été effectuée avec succès</div>
      <div className="text-gray-500 text-center max-w-md mb-6">
        Vous allez recevoir un email de confirmation de votre transaction.
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
            <div className="font-mono text-sm mb-2">{transaction.id}</div>
            <div className="mb-2 text-sm text-gray-500">Type</div>
            <div className="font-semibold mb-2">{transaction.type}</div>
            <div className="mb-2 text-sm text-gray-500">Montant</div>
            <div className="font-bold text-lg mb-2 text-green-600">{transaction.amount.toLocaleString()} F</div>
            <div className="mb-2 text-sm text-gray-500">Description</div>
            <div className="mb-2">{transaction.description}</div>
            <div className="mb-2 text-sm text-gray-500">Date</div>
            <div className="mb-2">{transaction.date}</div>
            <div className="mb-2 text-sm text-gray-500">Téléphone</div>
            <div>{transaction.phone}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TransactionConfirmation;