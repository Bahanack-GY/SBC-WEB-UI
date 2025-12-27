import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/common/BackButton';
import CurrencyConverterComponent from '../components/CurrencyConverterComponent';
import UnifiedWithdrawalComponent from '../components/UnifiedWithdrawalComponent';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { FaWallet, FaExchangeAlt, FaArrowDown, FaGift, FaArrowUp, FaSpinner, FaCheck } from 'react-icons/fa';
import { EXCHANGE_RATES } from '../utils/balanceHelpers';
import { motion } from 'framer-motion';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

function Money() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);
    const [showUnifiedWithdrawal, setShowUnifiedWithdrawal] = useState(false);
    const [showFundActivationModal, setShowFundActivationModal] = useState(false);
    const balance = user?.balance || 0;
    const usdBalance = user?.usdBalance || 0;

    // Handle activation balance button click - navigate to page with teaser overlay for non-admin/tester
    const handleActivationBalanceClick = () => {
        navigate('/activation-balance');
    };

    return (
        <ProtectedRoute>
            <div className="p-4 h-screen bg-white">
                <div className="flex items-center mb-6">
                    <BackButton />
                    <h3 className="text-xl font-medium text-center w-full text-gray-900">Gestion financière</h3>
                </div>

                {/* Exchange Rate Display */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">Taux de change actuel</h4>
                    <div className="text-center">
                        <div className="text-xl font-bold text-blue-900 mb-1">
                            USD → FCFA: 1$ = {EXCHANGE_RATES.DISPLAY.USD_TO_XAF_RATE}F
                        </div>
                        <div className="text-lg font-bold text-blue-900">
                            FCFA → USD: {EXCHANGE_RATES.DISPLAY.XAF_TO_USD_RATE}F = 1$
                        </div>
                        <div className="text-sm text-blue-600 mt-2">Taux de conversion</div>
                    </div>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* FCFA Balance */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm opacity-80">Solde FCFA</h3>
                                <p className="text-2xl font-bold">{balance.toLocaleString('fr-FR')} F</p>
                            </div>
                            <FaWallet size={32} className="opacity-80" />
                        </div>
                        <div className="text-xs opacity-70">Franc CFA</div>
                    </div>

                    {/* USD Balance */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm opacity-80">Solde USD</h3>
                                <p className="text-2xl font-bold">${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <FaWallet size={32} className="opacity-80" />
                        </div>
                        <div className="text-xs opacity-70">Dollar américain</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setShowCurrencyConverter(true)}
                            className="flex flex-col items-center justify-center bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-2xl shadow-lg transition-colors"
                        >
                            <FaExchangeAlt size={32} className="mb-2" />
                            <span className="font-semibold">Convertir</span>
                            <span className="text-xs opacity-80">FCFA ⇄ USD</span>
                        </button>

                        <button
                            onClick={() => setShowUnifiedWithdrawal(true)}
                            className="flex flex-col items-center justify-center bg-green-500 hover:bg-green-600 text-white p-6 rounded-2xl shadow-lg transition-colors"
                        >
                            <FaArrowDown size={32} className="mb-2" />
                            <span className="font-semibold">Retirer</span>
                            <span className="text-xs opacity-80">MoMo & Crypto</span>
                        </button>

                        <button
                            onClick={() => navigate('/wallet')}
                            className="flex flex-col items-center justify-center bg-purple-500 hover:bg-purple-600 text-white p-6 rounded-2xl shadow-lg transition-colors"
                        >
                            <FaWallet size={32} className="mb-2" />
                            <span className="font-semibold">Portefeuille</span>
                            <span className="text-xs opacity-80">Transactions</span>
                        </button>

                        <button
                            onClick={() => setShowFundActivationModal(true)}
                            className="flex flex-col items-center justify-center bg-[#115CF6] hover:bg-blue-700 text-white p-6 rounded-2xl shadow-lg transition-colors"
                        >
                            <FaArrowUp size={32} className="mb-2" />
                            <span className="font-semibold">Alimenter</span>
                            <span className="text-xs opacity-80">Solde Activation</span>
                        </button>
                    </div>

                    {/* Navigation to Activation Balance */}
                    <button
                        onClick={handleActivationBalanceClick}
                        className="w-full mt-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <FaGift size={24} className="text-[#115CF6]" />
                            </div>
                            <div className="text-left">
                                <span className="font-semibold text-gray-900 block">Solde d'Activation</span>
                                <span className="text-xs text-gray-500">Voir & sponsoriser vos filleuls</span>
                            </div>
                        </div>
                        <span className="text-gray-400">→</span>
                    </button>
                </div>

                {/* Balance Summary */}
                <div className="bg-gray-50 p-6 rounded-2xl">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Résumé financier</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total FCFA</span>
                            <span className="font-semibold text-gray-900">{balance.toLocaleString('fr-FR')} F</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total USD</span>
                            <span className="font-semibold text-gray-900">${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-800 font-medium">Soldes disponibles</span>
                                <span className="text-green-600 font-bold">2 devises</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Currency Converter Modal */}
                <CurrencyConverterComponent
                    isOpen={showCurrencyConverter}
                    onClose={() => setShowCurrencyConverter(false)}
                    onConversionComplete={() => {
                        // Just refresh user context, no page reload
                    }}
                />

                {/* Unified Withdrawal Modal */}
                <UnifiedWithdrawalComponent
                    isOpen={showUnifiedWithdrawal}
                    onClose={() => setShowUnifiedWithdrawal(false)}
                    onWithdrawalComplete={() => {
                        // Just refresh user context, no page reload
                    }}
                />

                {/* Fund Activation Balance Modal */}
                <FundActivationModal
                    isOpen={showFundActivationModal}
                    onClose={() => setShowFundActivationModal(false)}
                    mainBalance={balance}
                    onSuccess={() => {
                        refreshUser();
                    }}
                />
            </div>
        </ProtectedRoute>
    );
}

// ==================== FUND ACTIVATION MODAL ====================
interface FundModalProps {
    isOpen: boolean;
    onClose: () => void;
    mainBalance: number;
    onSuccess: () => void;
}

function FundActivationModal({ isOpen, onClose, mainBalance, onSuccess }: FundModalProps) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const minimumAmount = 100; // Default minimum

    const handleSubmit = async () => {
        const amountNum = parseInt(amount);
        if (isNaN(amountNum) || amountNum < minimumAmount) {
            setError(`Le montant minimum est de ${minimumAmount.toLocaleString('fr-FR')} F`);
            return;
        }
        if (amountNum > mainBalance) {
            setError('Solde principal insuffisant');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await sbcApiService.transferToActivationBalance(amountNum);
            handleApiResponse(response);
            setSuccess(true);
            onSuccess();
            setTimeout(() => {
                onClose();
                setAmount('');
                setSuccess(false);
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setAmount('');
        setError('');
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
        >
            <motion.div
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-md shadow-xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                {success ? (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaCheck className="text-green-600" size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-green-600 mb-2">Transfert réussi !</h4>
                        <p className="text-gray-600">Votre solde d'activation a été alimenté.</p>
                    </div>
                ) : (
                    <>
                        <h4 className="text-xl font-bold text-gray-900 mb-4">Alimenter le solde d'activation</h4>

                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <p className="text-sm text-gray-600">Solde principal disponible</p>
                            <p className="text-2xl font-bold text-gray-900">{mainBalance.toLocaleString('fr-FR')} F</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Montant à transférer (min. {minimumAmount.toLocaleString('fr-FR')} F)
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError('');
                                }}
                                placeholder="Ex: 5000"
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                            <p className="text-xs text-yellow-700">
                                ⚠️ Ce transfert est irréversible. Le solde d'activation ne peut être utilisé que pour sponsoriser vos filleuls.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !amount}
                                className="flex-1 bg-[#115CF6] text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <FaSpinner className="animate-spin" /> : 'Transférer'}
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}

export default Money;
