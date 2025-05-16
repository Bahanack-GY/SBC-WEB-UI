import BackButton from "../components/common/BackButton";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';
import { FaArrowUp } from 'react-icons/fa';
import { FaMoneyBillWave } from 'react-icons/fa';
import { FiShare2, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../components/common/Skeleton';
import { FaMoneyBill1 } from "react-icons/fa6";

const chartData = [
  { name: 'Lun', Dépôt: 4000, Retrait: 2400 },
  { name: 'Mar', Dépôt: 3000, Retrait: 1398 },
  { name: 'Mer', Dépôt: 2000, Retrait: 9800 },
  { name: 'Jeu', Dépôt: 2780, Retrait: 3908 },
  { name: 'Ven', Dépôt: 1890, Retrait: 4800 },
  { name: 'Sam', Dépôt: 2390, Retrait: 3800 },
  { name: 'Dim', Dépôt: 3490, Retrait: 2100 },
];

type Transaction = {
  id: number;
  name: string;
  date: string;
  amount: number;
  icon: string;
  type: string;
  description: string;
};

const transactions: Transaction[] = [
  { id: 1, name: 'Dribble Pro', date: '26 Juin - 00:01', amount: -573, icon: '🏀', type: 'Débit', description: 'Paiement abonnement Dribble Pro.' },
  { id: 2, name: 'David William', date: '26 Juin - 00:01', amount: 1115, icon: '👤', type: 'Crédit', description: 'Virement reçu de David William.' },
];

function Wallet() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const [chartType, setChartType] = useState('Reçu');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const openModal = (tx: Transaction) => {
    setSelectedTx(tx);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setSelectedTx(null);
  };
  const handleShare = () => {
    if (selectedTx) {
      const shareText = `Transaction ID: ${selectedTx.id}\nType: ${selectedTx.type}\nMontant: ${selectedTx.amount} F\nDescription: ${selectedTx.description}\nDate: ${selectedTx.date}`;
      if (navigator.share) {
        navigator.share({ text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        alert('Transaction copiée dans le presse-papier !');
      }
    }
  };
  const handleWithdraw = () => {
    setShowWithdrawForm((v) => !v);
  };
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount && Number(withdrawAmount) > 0) {
      window.location.href = '/otp';
    }
  };

  return (
    <div className="p-3 h-screen mb-36 bg-white text-white">
      <div className="flex items-center mb-4">
        <BackButton />
        <h3 className="text-xl font-medium text-center w-full text-gray-900">Portefeuille</h3>
      </div>
      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton height="h-32" rounded="rounded-2xl" />
          <div className="flex gap-3">
            <Skeleton width="w-24" height="h-16" rounded="rounded-2xl" />
            <Skeleton width="w-24" height="h-16" rounded="rounded-2xl" />
          </div>
          <Skeleton height="h-40" rounded="rounded-2xl" />
          <Skeleton height="h-32" rounded="rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Balance Card */}
          <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 mb-6 shadow-lg">
            <div className="text-sm opacity-80">Solde total</div>
            <div className="text-3xl font-bold mb-2">17 298,92 F</div>
            <div className="flex justify-between text-sm mt-2">
              <div>
                <div className="opacity-80">Bénéfice</div>
                <div className="font-bold">1 132 151 F</div>
              </div>
              <div>
                <div className="opacity-80">Retraits</div>
                <div className="font-bold">1 132 151 F</div>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button className="flex-1 flex flex-col items-center justify-center bg-[#115CF6] rounded-2xl py-4 shadow hover:bg-blue-800 transition-colors">
              <FaArrowUp size={24} className="mb-1" />
              <span className="text-xs font-semibold">Envoyer</span>
            </button>
            <button onClick={handleWithdraw} className="flex-1 flex flex-col items-center justify-center bg-[#94B027] rounded-2xl py-4 shadow hover:bg-green-700 transition-colors">
              <FaMoneyBillWave size={24} className="mb-1" />
              <span className="text-xs font-semibold">Retrait</span>
            </button>
          </div>
          {showWithdrawForm && (
            <form onSubmit={handleWithdrawSubmit} className="mb-6 flex flex-col  gap-3 bg-gray-50 rounded-2xl p-4 shadow">
              <label className="text-gray-800 font-semibold">Montant à retirer</label>
              <div className="flex justify-between gap-2">
              <input
                type="number"
                min="1"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 text-center font-bold w-full"
                placeholder="Montant en F"
                required
              />
              <button type="submit" className="bg-[#115CF6] text-white rounded-full p-3 font-bold shadow hover:bg-blue-800 transition-colors"><FaMoneyBill1 size={24} /></button>
              </div>
              
            </form>
          )}
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl p-4 mb-6 shadow text-gray-800 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-[#115CF6]">Résumé des transactions</div>
              <div className="flex bg-gray-100 rounded-full p-1 gap-1">
                <button
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 ${chartType === 'Reçu' ? 'bg-[#115CF6] text-white' : 'text-[#115CF6]'}`}
                  onClick={() => setChartType('Reçu')}
                >
                  Reçu
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 ${chartType === 'Retrait' ? 'bg-[#115CF6] text-white' : 'text-[#115CF6]'}`}
                  onClick={() => setChartType('Retrait')}
                >
                  Retrait
                </button>
              </div>
            </div>
            <div className="relative w-full h-[120px]">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData} barCategoryGap={30} barGap={8}>
                  <XAxis dataKey="name" stroke="#bbb" fontSize={14} tickLine={false} axisLine={false} />
                  {chartType === 'Reçu' && (
                    <Bar dataKey="Dépôt" fill="#115CF6" radius={[20,20,20,20]} barSize={32} isAnimationActive={true} />
                  )}
                  {chartType === 'Retrait' && (
                    <Bar dataKey="Retrait" fill="#FFB200" radius={[20,20,20,20]} barSize={32} isAnimationActive={true} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Recent Transactions */}
          <div className="bg-[#192040] rounded-2xl p-4 shadow">
            <div className="font-semibold mb-2 text-white">Transactions récentes</div>
            {transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 cursor-pointer hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => openModal(tx)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tx.icon}</span>
                  <div>
                    <div className="font-bold text-white text-sm">{tx.name}</div>
                    <div className="text-xs text-gray-300">{tx.date}</div>
                  </div>
                </div>
                <div className={`font-bold text-sm ${tx.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount} F</div>
              </div>
            ))}
          </div>
          {/* Modal */}
          <AnimatePresence>
            {modalOpen && selectedTx && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0.2 }}
                >
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                    onClick={closeModal}
                  >
                    <FiX size={22} />
                  </button>
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1">ID de la transaction</div>
                    <div className="font-mono text-sm mb-2">{selectedTx.id}</div>
                    <div className="text-xs text-gray-400 mb-1">Type</div>
                    <div className="font-semibold mb-2">{selectedTx.type}</div>
                    <div className="text-xs text-gray-400 mb-1">Montant</div>
                    <div className={`font-bold text-lg mb-2 ${selectedTx.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>{selectedTx.amount > 0 ? '+' : ''}{selectedTx.amount} F</div>
                    <div className="text-xs text-gray-400 mb-1">Description</div>
                    <div className="mb-2">{selectedTx.description}</div>
                    <div className="text-xs text-gray-400 mb-1">Date</div>
                    <div>{selectedTx.date}</div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      className="flex-1 bg-[#115CF6] text-white rounded-xl py-2 font-bold shadow hover:bg-blue-800 transition-colors"
                      onClick={handleShare}
                    >
                      <FiShare2 className="inline mr-2" />Partager
                    </button>
                    <button
                      className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                      onClick={closeModal}
                    >
                      Fermer
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

export default Wallet;
