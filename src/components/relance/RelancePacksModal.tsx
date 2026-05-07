import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaSms, FaTimes } from 'react-icons/fa';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import type { RelancePack, RelancePacksResponse, PurchasePackResponse } from '../../types/relance';

interface RelancePacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional: limit which pack types to show (default both)
  showEmail?: boolean;
  showSms?: boolean;
}

const formatXAF = (amount: number) => `${amount.toLocaleString('fr-FR')} XAF`;
const formatCredits = (n: number) => n.toLocaleString('fr-FR');

export default function RelancePacksModal({
  isOpen,
  onClose,
  showEmail = true,
  showSms = true,
}: RelancePacksModalProps) {
  const [packs, setPacks] = useState<RelancePacksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    sbcApiService.relanceGetPacks()
      .then(res => {
        if (cancelled) return;
        const data = handleApiResponse(res);
        setPacks(data);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'Impossible de charger les packs.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handlePurchase = async (pack: RelancePack) => {
    setPurchasingId(pack.id);
    setError('');
    try {
      const res = await sbcApiService.relancePurchasePack(pack.id);
      const data = handleApiResponse(res) as PurchasePackResponse;
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError("Lien de paiement indisponible.");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'achat.");
    } finally {
      setPurchasingId(null);
    }
  };

  const renderPack = (pack: RelancePack) => {
    const isEmail = pack.type === 'email';
    const isPurchasing = purchasingId === pack.id;
    return (
      <button
        key={pack.id}
        onClick={() => handlePurchase(pack)}
        disabled={purchasingId !== null}
        className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
          isEmail
            ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
            : 'border-green-200 hover:border-green-400 hover:bg-green-50'
        } ${isPurchasing ? 'opacity-60 cursor-wait' : ''} disabled:opacity-50`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold text-gray-800">
              {formatCredits(pack.credits)} crédits {isEmail ? 'email' : 'SMS'}
            </div>
            {pack.label && <div className="text-xs text-gray-500 mt-1">{pack.label}</div>}
          </div>
          <div className="text-right">
            <div className={`font-bold ${isEmail ? 'text-blue-600' : 'text-green-600'}`}>
              {formatXAF(pack.priceXAF)}
            </div>
            {isPurchasing && <div className="text-xs text-gray-500 mt-1">Redirection…</div>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-full max-w-lg text-gray-900 relative shadow-lg max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Fermer"
            >
              <FaTimes size={20} />
            </button>

            <h3 className="text-xl font-bold mb-2">Acheter des crédits Relance</h3>
            <p className="text-sm text-gray-600 mb-5">
              Les crédits sont consommés à chaque message envoyé. Aucun abonnement, vous payez à l'usage.
            </p>

            {loading && (
              <div className="text-center py-8 text-gray-500">Chargement des packs…</div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
                {error}
              </div>
            )}

            {!loading && packs && (
              <div className="space-y-5">
                {showEmail && packs.emailPacks?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2 text-blue-700">
                      <FaEnvelope />
                      <h4 className="font-bold">Packs Email</h4>
                    </div>
                    <div className="space-y-2">
                      {packs.emailPacks.map(renderPack)}
                    </div>
                  </section>
                )}

                {showSms && packs.smsPacks?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2 text-green-700">
                      <FaSms />
                      <h4 className="font-bold">Packs SMS</h4>
                    </div>
                    <div className="space-y-2">
                      {packs.smsPacks.map(renderPack)}
                    </div>
                  </section>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
