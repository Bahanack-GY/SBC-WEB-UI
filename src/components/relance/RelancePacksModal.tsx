import { HugeiconsIcon } from '@hugeicons/react';
import { filleulsCovered, filleulsCoveredBySms, isCameroon } from '../../utils/relance';
import { useAuth } from '../../contexts/AuthContext';
import { Cancel01Icon, Mail01Icon, SmsCodeIcon } from '@hugeicons/core-free-icons';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import type { RelancePack, RelancePacksResponse, PurchasePackResponse } from '../../types/relance';

interface RelancePacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional: limit which pack types to show (default both)
  showEmail?: boolean;
  showSms?: boolean;
  /** Called once a pack has been credited (bought with the SBC balance). */
  onPurchased?: () => void;
}

const formatXAF = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;
const formatCredits = (n: number) => n.toLocaleString('fr-FR');
const packName = (pack: RelancePack) => `${formatCredits(pack.credits)} crédits ${pack.type === 'email' ? 'email' : 'SMS'}`;

/** One id per choice, so a repeated tap on "Payer avec mon solde" is one purchase. */
const newRequestId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export default function RelancePacksModal({
  isOpen,
  onClose,
  showEmail = true,
  showSms = true,
  onPurchased,
}: RelancePacksModalProps) {
  const { user, refreshUser } = useAuth();
  const smsAllowed = showSms && isCameroon(user?.country);
  const sbcBalance = Math.max(0, Math.floor(user?.balance ?? 0));
  const [packs, setPacks] = useState<RelancePacksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Rufus, 2026-10-20: relance packs can be paid with the SBC balance too, in full.
  const [choosing, setChoosing] = useState<{ pack: RelancePack; requestId: string } | null>(null);
  const [bought, setBought] = useState<{ pack: RelancePack; inProgress: boolean } | null>(null);

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
      .catch((err: unknown) => {
        if (cancelled) return;
        setError((err instanceof Error && err.message) || 'Impossible de charger les packs.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  // With money on the balance, the member chooses how to pay; without, it is
  // Mobile Money as before, with no extra step.
  const handlePurchase = (pack: RelancePack) => {
    setError('');
    setBought(null);
    if (sbcBalance > 0) {
      setChoosing({ pack, requestId: newRequestId() });
      return;
    }
    void payByMobileMoney(pack);
  };

  const payWithBalance = async (pack: RelancePack, requestId: string) => {
    setPurchasingId(pack.id);
    setError('');
    try {
      const res = await sbcApiService.relancePurchasePack(pack.id, { useBalance: true, requestId });
      const data = handleApiResponse(res) as PurchasePackResponse;
      if (!data?.paidWithBalance) {
        setError("L'achat n'a pas pu être confirmé. Vérifiez vos crédits avant de réessayer.");
        return;
      }
      setBought({ pack, inProgress: data.inProgress === true });
      setChoosing(null);
      void refreshUser();
      onPurchased?.();
    } catch (err) {
      setError((err instanceof Error && err.message) || "Erreur lors de l'achat.");
    } finally {
      setPurchasingId(null);
    }
  };

  const payByMobileMoney = async (pack: RelancePack) => {
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
    } catch (err) {
      setError((err instanceof Error && err.message) || "Erreur lors de l'achat.");
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
            ? 'border-border hover:border-primary hover:bg-blue-50'
            : 'border-border hover:border-success hover:bg-green-50'
        } ${isPurchasing ? 'opacity-60 cursor-wait' : ''} disabled:opacity-50`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold text-gray-800">
              {formatCredits(pack.credits)} crédits {isEmail ? 'email' : 'SMS'}
            </div>
            <div className="text-xs text-ink-3 mt-1">
              {isEmail
                ? `≈ ${filleulsCovered(pack.credits).toLocaleString('fr-FR')} filleuls relancés sur 7 jours`
                : `≈ ${filleulsCoveredBySms(pack.credits).toLocaleString('fr-FR')} filleuls · numéros du Cameroun (+237)`}
            </div>
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
            className="bg-white rounded-2xl p-6 w-full max-w-lg text-gray-900 relative max-h-[90vh] overflow-y-auto border border-border"
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
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>

            <h3 className="text-xl font-bold mb-2">Acheter des crédits Relance</h3>
            <p className="text-sm text-gray-600 mb-5">
              1 crédit = 1 message envoyé. Chaque filleul reçoit un message par jour
              pendant 7 jours, sauf s'il paie avant. Pas d'abonnement.
            </p>

            {loading && (
              <div className="text-center py-8 text-gray-500">Chargement des packs…</div>
            )}

            {error && (
              <div className="bg-red-50 border border-border text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
                {error}
              </div>
            )}

            {bought && (
              <div role="status" className="bg-green-50 border border-border text-green-800 rounded-lg px-3 py-2 text-sm mb-4">
                {bought.inProgress
                  ? `Achat en cours : vos ${packName(bought.pack)} apparaîtront dans un instant.`
                  : `Pack acheté : ${packName(bought.pack)} ajoutés. ${formatXAF(bought.pack.priceXAF)} pris sur votre solde SBC.`}
              </div>
            )}

            {choosing && (
              <section aria-label="Comment payer ?" className="space-y-2">
                <h4 className="font-bold text-gray-900">Comment payer ?</h4>
                <p className="text-sm text-gray-600">
                  {packName(choosing.pack)} · {formatXAF(choosing.pack.priceXAF)}
                </p>
                <button
                  type="button"
                  onClick={() => payWithBalance(choosing.pack, choosing.requestId)}
                  disabled={purchasingId !== null || sbcBalance < choosing.pack.priceXAF}
                  className="w-full text-left rounded-xl border-2 border-primary p-4 disabled:opacity-50"
                >
                  <span className="block font-semibold text-gray-900">Payer avec mon solde SBC</span>
                  <span className="block text-sm text-gray-600 mt-0.5">
                    {sbcBalance >= choosing.pack.priceXAF
                      ? `Votre solde (${formatXAF(sbcBalance)}) couvre ce pack. Les crédits sont ajoutés tout de suite.`
                      : `Votre solde (${formatXAF(sbcBalance)}) ne couvre pas ce pack.`}
                  </span>
                  {purchasingId === choosing.pack.id && (
                    <span className="block text-xs text-gray-500 mt-1">Paiement en cours…</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => payByMobileMoney(choosing.pack)}
                  disabled={purchasingId !== null}
                  className="w-full text-left rounded-xl border border-border p-4 disabled:opacity-50"
                >
                  <span className="block font-semibold text-gray-900">Payer par Mobile Money</span>
                  <span className="block text-sm text-gray-600 mt-0.5">Votre solde SBC reste intact.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChoosing(null)}
                  disabled={purchasingId !== null}
                  className="w-full text-sm text-gray-500 py-2"
                >
                  Retour aux packs
                </button>
              </section>
            )}

            {!loading && packs && !choosing && (
              <div className="space-y-5">
                {showEmail && packs.emailPacks?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2 text-blue-700">
                      <HugeiconsIcon icon={Mail01Icon} />
                      <h4 className="font-bold">Packs Email</h4>
                    </div>
                    <div className="space-y-2">
                      {packs.emailPacks.map(renderPack)}
                    </div>
                  </section>
                )}

                {smsAllowed && packs.smsPacks?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2 text-green-700">
                      <HugeiconsIcon icon={SmsCodeIcon} />
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
