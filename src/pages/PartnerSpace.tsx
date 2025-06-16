import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import Skeleton from '../components/common/Skeleton';
import { useEffect } from 'react';
import { handleApiResponse } from '../utils/apiHelpers';
import BackButton from '../components/common/BackButton';
import TourButton from '../components/common/TourButton';

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).replace('XAF', 'FCFA');
}

type PartnerTransaction = {
  _id: string;
  transType: string;
  amount: number;
  createdAt: string;
};

const PartnerSpace = () => {
  const {
    data: partnerData,
    isLoading: loadingDetails,
    error: errorDetails,
    refetch: refetchDetails,
    isFetching: isFetchingDetails
  } = useQuery({
    queryKey: ['partner-details'],
    queryFn: () => sbcApiService.getPartnerDetails().then(handleApiResponse),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const {
    data: transactionsData,
    isLoading: loadingTx,
    error: errorTx,
    refetch: refetchTx,
    isFetching: isFetchingTx
  } = useQuery({
    queryKey: ['partner-transactions'],
    queryFn: () => sbcApiService.getPartnerTransactions().then(handleApiResponse),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    refetchDetails();
    refetchTx();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center py-0">
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="flex items-center mb-4">
          <BackButton />
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center flex-1">Espace Partenaire</h2>
        </div>
        {/* Partner Info */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6 flex flex-col md:flex-row gap-6 items-center">
          {loadingDetails || isFetchingDetails ? (
            <Skeleton width="w-32" height="h-8" rounded="rounded-lg" />
          ) : errorDetails ? (
            <div className="text-red-500">Erreur: {String(errorDetails)}</div>
          ) : partnerData ? (
            <>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-700 mb-1">{partnerData.name || 'Partenaire'}</div>
                <div className="text-gray-500 mb-1">Email: {partnerData.email || 'N/A'}</div>
                <div className="text-gray-500 mb-1">Téléphone: {partnerData.phoneNumber || 'N/A'}</div>
                <div className="text-gray-500 mb-1">Statut: <span className="font-medium text-green-600">{partnerData.isActive ? 'Actif' : 'Inactif'}</span></div>
                <div className="text-gray-700 mt-2 font-bold">Solde: {formatFCFA(partnerData.amount || 0)}</div>
              </div>
              {partnerData.avatarId && (
                <img src={sbcApiService.generateSettingsFileUrl(partnerData.avatarId)} alt="avatar" className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg" />
              )}
            </>
          ) : null}
        </div>
        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="text-lg font-semibold text-gray-700 mb-4">Transactions récentes</div>
          {loadingTx || isFetchingTx ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} width="w-full" height="h-8" rounded="rounded-lg" />
              ))}
            </div>
          ) : errorTx ? (
            <div className="text-red-500">Erreur: {String(errorTx)}</div>
          ) : transactionsData && transactionsData.data && transactionsData.data.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {transactionsData.data.slice(0, 5).map((tx: PartnerTransaction) => (
                <li key={tx._id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800">{tx.transType}</div>
                    <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString('fr-FR')}</div>
                  </div>
                  <div className={`font-bold text-right ${tx.transType === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatFCFA(tx.amount)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400 text-center">Aucune transaction récente.</div>
          )}
        </div>
      </div>
      <TourButton />
    </div>
  );
};

export default PartnerSpace; 