import { motion, AnimatePresence } from 'motion/react';

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

interface Props {
  open: boolean;
  title: string;
  amount: number;
  balance: number;
  busy: boolean;
  onPay: (useBalance: boolean) => void;
  onClose: () => void;
}

/**
 * How to pay a campaign: from the SBC balance (all of it, or part of it with
 * mobile money for the rest) or by mobile money. Rufus, 2026-10-17: « payer ou
 * compléter la campagne avec son solde SBC ». Campaign credit is still taken
 * first, server-side, so the amounts here are an upper bound.
 */
export default function PayChoiceSheet({ open, title, amount, balance, busy, onPay, onClose }: Props) {
  const covers = balance >= amount;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !busy && onClose()}
        >
          <motion.div
            role="dialog"
            aria-label="Comment payer ?"
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="font-bold text-lg text-gray-900">Comment payer ?</h2>
            <p className="text-sm text-gray-600 mt-1">« {title} » · {fcfa(amount)}</p>

            <div className="flex flex-col gap-2 mt-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={busy}
                onClick={() => onPay(true)}
                className="text-left border-2 border-primary rounded-2xl p-4 disabled:opacity-50"
              >
                <span className="block font-semibold text-gray-900">Payer avec mon solde SBC</span>
                <span className="block text-sm text-gray-600 mt-0.5">
                  {covers
                    ? `Votre solde (${fcfa(balance)}) couvre tout le paiement.`
                    : `${fcfa(balance)} depuis votre solde, le reste (${fcfa(amount - balance)}) par Mobile Money.`}
                </span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={busy}
                onClick={() => onPay(false)}
                className="text-left border border-border rounded-2xl p-4 disabled:opacity-50"
              >
                <span className="block font-semibold text-gray-900">Payer par Mobile Money</span>
                <span className="block text-sm text-gray-600 mt-0.5">Votre solde SBC reste intact.</span>
              </motion.button>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full mt-3 text-sm text-gray-500 py-2"
            >
              Annuler
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
