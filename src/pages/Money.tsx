import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/common/BackButton';
import CurrencyConverterComponent from '../components/CurrencyConverterComponent';
import UnifiedWithdrawalComponent from '../components/UnifiedWithdrawalComponent';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { FaWallet, FaExchangeAlt, FaChartLine, FaArrowDown } from 'react-icons/fa';
import { EXCHANGE_RATES } from '../utils/balanceHelpers';

function Money() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);
    const [showUnifiedWithdrawal, setShowUnifiedWithdrawal] = useState(false);

    const balance = user?.balance || 0;
    const usdBalance = user?.usdBalance || 0;

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
                            onClick={() => navigate('/wallet')}
                            className="flex flex-col items-center justify-center bg-teal-500 hover:bg-teal-600 text-white p-6 rounded-2xl shadow-lg transition-colors"
                        >
                            <FaChartLine size={32} className="mb-2" />
                            <span className="font-semibold">Statistiques</span>
                            <span className="text-xs opacity-80">Analytics</span>
                        </button>
                    </div>
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
            </div>
        </ProtectedRoute>
    );
}

export default Money;
