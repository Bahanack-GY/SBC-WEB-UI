import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { Sheet } from '../relance/ui/Sheet';
import { sbcApiService } from '../../services/SBCApiService';
import { useBlockRemoteControl } from '../../services/remoteAssist';
import { redirectTo } from '../../utils/redirect';
import { francs } from '../../hooks/useImpactChallenge';
import { ImpactApiError, impactData, newIdempotencyKey } from '../../hooks/useImpactCandidate';
import { cn } from '../../lib/utils';
import type { ImpactPayMethod, ImpactPurchase, ImpactVotePack } from '../../types/impact';
import { plural } from './stages';

const CHECK_EVERY_MS = 5000;
const CHECKS = 6;

type Result =
  | { kind: 'counted'; purchase: ImpactPurchase }
  | { kind: 'pending'; purchase: ImpactPurchase }
  | { kind: 'failed'; purchase: ImpactPurchase };

const resultOf = (p: ImpactPurchase): Result =>
  p.status === 'SUCCESS' ? { kind: 'counted', purchase: p }
    : p.status === 'PENDING' ? { kind: 'pending', purchase: p }
      : { kind: 'failed', purchase: p };

/**
 * Week-3 paid votes: a pack, Mobile Money (the payment page, like the monthly
 * vote) or the SBC balance (answered at once). Every click sends a NEW
 * idempotency key; a double tap within one click is one purchase server-side.
 */
export default function VotePurchaseSheet({
  open, candidateId, candidateName, packs, balancePayment, balance, onClose, onSettled,
}: {
  open: boolean;
  candidateId: string;
  candidateName: string;
  packs: ImpactVotePack[];
  balancePayment: boolean;
  /** The member's SBC balance, when the app has it. */
  balance?: number;
  onClose: () => void;
  /** A balance purchase got an answer (counted, pending or failed): refresh the counts. */
  onSettled: (p: ImpactPurchase) => void;
}) {
  // Money leaves the account here: no remote control while the sheet is open.
  useBlockRemoteControl(open);
  const [packIndex, setPackIndex] = useState(0);
  const [method, setMethod] = useState<ImpactPayMethod>('MOBILE_MONEY');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (open) {
      setPackIndex(0);
      setMethod('MOBILE_MONEY');
      setError('');
      setResult(null);
    }
  }, [open]);

  // A balance payment whose outcome is not known yet: ask again a few times.
  const pendingId = result?.kind === 'pending' ? result.purchase._id : null;
  useEffect(() => {
    if (!open || !pendingId) return;
    let tries = 0;
    let stopped = false;
    const t = setInterval(async () => {
      tries++;
      try {
        const p = impactData<ImpactPurchase>(await sbcApiService.impactMyPurchase(pendingId), '');
        if (!stopped && p.status !== 'PENDING') {
          setResult(resultOf(p));
          onSettled(p);
        }
      } catch { /* try again */ }
      if (tries >= CHECKS) clearInterval(t);
    }, CHECK_EVERY_MS);
    return () => { stopped = true; clearInterval(t); };
  }, [open, pendingId, onSettled]);

  const pack = packs[packIndex];

  const buy = async () => {
    if (!pack) return;
    setBusy(true);
    setError('');
    try {
      const res = await sbcApiService.impactBuyVotes({
        candidateId, packIndex, method, idempotencyKey: newIdempotencyKey(),
      });
      const data = impactData<{ transaction: ImpactPurchase; sessionId: string | null }>(res, 'L’achat n’a pas pu commencer. Réessayez.');
      if (method === 'MOBILE_MONEY') {
        if (!data?.sessionId) {
          setError('Le paiement n’a pas pu être ouvert. Réessayez.');
          return;
        }
        redirectTo(sbcApiService.generatePaymentUrl(data.sessionId));
        return;
      }
      const r = resultOf(data.transaction);
      setResult(r);
      onSettled(data.transaction);
    } catch (err) {
      const e = err as ImpactApiError;
      if (e.code === 'INSUFFICIENT_BALANCE') {
        setError(`${e.message} Choisissez un plus petit pack ou payez par Mobile Money.`);
      } else if (e.code === 'PURCHASE_LIMIT') {
        setError(e.message || 'Trop d’achats en une heure. Réessayez plus tard.');
      } else {
        setError(e.message || 'Erreur réseau. Vérifiez votre connexion et réessayez.');
      }
    } finally {
      setBusy(false);
    }
  };

  const footer = result ? (
    <button type="button" onClick={onClose} className="w-full h-12 rounded-tile bg-primary text-white font-semibold">
      Fermer
    </button>
  ) : (
    <div className="flex flex-col gap-2">
      <motion.button
        type="button"
        whileTap={busy ? undefined : { scale: 0.98 }}
        onClick={buy}
        disabled={busy || !pack}
        className="w-full h-12 rounded-pill bg-primary hover:bg-primary-hover text-white font-semibold disabled:opacity-60"
      >
        {busy
          ? (method === 'MOBILE_MONEY' ? 'Ouverture du paiement…' : 'Paiement…')
          : pack ? `Payer ${francs(pack.price)}` : 'Payer'}
      </motion.button>
      <button type="button" onClick={onClose} disabled={busy} className="w-full text-sm text-ink-3 py-2">Annuler</button>
    </div>
  );

  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title={`Acheter des votes pour ${candidateName}`} footer={footer}>
      {result ? (
        <div className="flex flex-col items-center text-center gap-3 py-4" role="status">
          {result.kind === 'counted' && (
            <>
              <span className="size-14 grid place-items-center rounded-pill bg-success-soft text-success">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={30} />
              </span>
              <p className="font-bold text-ink">
                {result.purchase.counted
                  ? `${plural(result.purchase.votes, 'vote compté', 'votes comptés')} pour ${candidateName}. Merci !`
                  : 'Paiement reçu.'}
              </p>
              {!result.purchase.counted && (
                <p className="text-sm text-ink-2">Le paiement est arrivé après la clôture des votes : il vous sera rendu sur votre solde SBC.</p>
              )}
            </>
          )}
          {result.kind === 'pending' && (
            <>
              <span className="size-14 grid place-items-center rounded-pill bg-accent-soft text-accent">
                <HugeiconsIcon icon={Clock01Icon} size={30} />
              </span>
              <p className="font-bold text-ink">Paiement en cours de vérification</p>
              <p className="text-sm text-ink-2">
                Nous vérifions le paiement sur votre solde. Vos votes seront comptés dès qu’il est confirmé ; sinon l’argent vous est rendu.
                Suivez-le dans « Mes achats de votes ».
              </p>
            </>
          )}
          {result.kind === 'failed' && (
            <>
              <p className="font-bold text-ink">Le paiement n’a pas abouti</p>
              <p className="text-sm text-ink-2">Aucun vote n’a été compté. Réessayez ou payez par Mobile Money.</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="text-sm font-semibold text-ink mb-2">Nombre de votes</legend>
            <div className="grid grid-cols-1 gap-2">
              {packs.map((p, i) => (
                <label key={i} className={cn(
                  'flex items-center gap-3 rounded-tile border px-3 py-3 cursor-pointer',
                  packIndex === i ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                )}>
                  <input type="radio" name="impact-pack" checked={packIndex === i} onChange={() => setPackIndex(i)} disabled={busy} className="accent-primary size-4" />
                  <span className="flex-1 text-sm font-semibold text-ink">{plural(p.votes, 'vote', 'votes')}</span>
                  <span className="text-sm font-bold text-ink">{francs(p.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink mb-2">Paiement</legend>
            <div className="grid grid-cols-1 gap-2">
              <label className={cn('flex items-start gap-3 rounded-tile border px-3 py-3 cursor-pointer',
                method === 'MOBILE_MONEY' ? 'border-primary bg-primary-soft' : 'border-border bg-surface')}>
                <input type="radio" name="impact-method" checked={method === 'MOBILE_MONEY'} onChange={() => setMethod('MOBILE_MONEY')} disabled={busy} className="accent-primary size-4 mt-0.5" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">Mobile Money</span>
                  <span className="block text-xs text-ink-2">Vous continuez sur la page de paiement.</span>
                </span>
              </label>
              {balancePayment && (
                <label className={cn('flex items-start gap-3 rounded-tile border px-3 py-3 cursor-pointer',
                  method === 'BALANCE' ? 'border-primary bg-primary-soft' : 'border-border bg-surface')}>
                  <input type="radio" name="impact-method" checked={method === 'BALANCE'} onChange={() => setMethod('BALANCE')} disabled={busy} className="accent-primary size-4 mt-0.5" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-ink">Mon solde SBC</span>
                    <span className="block text-xs text-ink-2">
                      {typeof balance === 'number' ? `Solde : ${francs(Math.max(0, Math.floor(balance)))}. ` : ''}Payé tout de suite, sans quitter l’application.
                    </span>
                  </span>
                </label>
              )}
            </div>
          </fieldset>

          <p className="text-xs text-ink-3">
            Les votes sont comptés dès que le paiement est confirmé. L’argent des votes revient à SBC.
          </p>

          {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}
