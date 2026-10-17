import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MinusSignIcon, PlusSignIcon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { VOTE_PRICE, francs } from '../../hooks/useImpactChallenge';

export type VoteMode = 'vote' | 'support';

interface Props {
  open: boolean;
  mode: VoteMode;
  projectName: string;
  entrepreneurName: string;
  /** Most votes this purchase may carry: the tickets left for a vote. */
  maxVotes: number;
  /** The monthly ticket cap, for the support explanation. */
  maxTickets: number;
  busy: boolean;
  error: string;
  onConfirm: (votes: number) => void;
  onClose: () => void;
}

const clamp = (n: number, max: number) => Math.min(Math.max(1, Math.floor(n) || 1), Math.max(1, max));

/**
 * Choose how many votes, see the total, go to the payment page. The same sheet
 * serves "Soutenir" once the member has all their tickets: the money still
 * counts for the entrepreneur, only the tombola ticket is gone.
 */
export default function VoteSheet({
  open, mode, projectName, entrepreneurName, maxVotes, maxTickets, busy, error, onConfirm, onClose,
}: Props) {
  // The field's text. The count is derived from it, so the total shown and the
  // amount sent are the same number even while the member is still typing.
  const [draft, setDraft] = useState('1');
  const votes = clamp(Number(draft), maxVotes);

  // Each opening starts from one vote.
  useEffect(() => {
    if (open) setDraft('1');
  }, [open]);

  const set = (n: number) => setDraft(String(clamp(n, maxVotes)));

  const total = votes * VOTE_PRICE;
  const isVote = mode === 'vote';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !busy && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={isVote ? `Voter pour ${projectName}` : `Soutenir ${projectName}`}
            className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-pill mx-auto mb-4 sm:hidden" />
            <h2 className="font-bold text-lg text-ink">
              {isVote ? 'Voter pour' : 'Soutenir'} « {projectName} »
            </h2>
            <p className="text-sm text-ink-2 mt-1">
              {isVote
                ? `1 vote = ${francs(VOTE_PRICE)}, et chaque vote vous donne 1 ticket pour la tombola du mois.`
                : `Vous avez déjà vos ${maxTickets} tickets de tombola ce mois-ci. Vous pouvez continuer à soutenir ${entrepreneurName} : chaque soutien de ${francs(VOTE_PRICE)} compte comme un vote pour lui, mais ne donne pas de ticket.`}
            </p>

            <div className="mt-5 flex items-center justify-center gap-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => set(votes - 1)}
                disabled={busy || votes <= 1}
                aria-label="Un vote de moins"
                className="size-11 grid place-items-center rounded-pill border border-border text-ink disabled:opacity-40"
              >
                <HugeiconsIcon icon={MinusSignIcon} size={20} />
              </motion.button>
              <label className="flex flex-col items-center">
                <span className="sr-only">Nombre de votes</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxVotes}
                  value={draft}
                  disabled={busy}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => set(votes)}
                  className="w-20 text-center text-3xl font-bold text-ink bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-ink-3">vote{votes > 1 ? 's' : ''}</span>
              </label>
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => set(votes + 1)}
                disabled={busy || votes >= maxVotes}
                aria-label="Un vote de plus"
                className="size-11 grid place-items-center rounded-pill border border-border text-ink disabled:opacity-40"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={20} />
              </motion.button>
            </div>
            {isVote && (
              <p className="text-xs text-ink-3 text-center mt-2">
                Jusqu'à {maxVotes} vote{maxVotes > 1 ? 's' : ''} avec ticket ce mois-ci.
              </p>
            )}

            <div className="mt-5 bg-surface-2 rounded-card p-3 flex items-center justify-between gap-3">
              <span className="text-sm text-ink-2">Total à payer</span>
              <span className="text-lg font-bold text-ink" data-testid="vote-total">{francs(total)}</span>
            </div>
            {isVote && (
              <p className="mt-2 text-sm text-success flex items-center gap-1.5">
                <HugeiconsIcon icon={Ticket01Icon} size={16} />
                + {votes} ticket{votes > 1 ? 's' : ''} de tombola
              </p>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">
                {error}
              </p>
            )}

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={busy}
              onClick={() => onConfirm(votes)}
              className="w-full mt-4 bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-pill disabled:opacity-60"
            >
              {busy ? 'Ouverture du paiement…' : `Payer ${francs(total)}`}
            </motion.button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full mt-2 text-sm text-ink-3 py-2"
            >
              Annuler
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
