import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Notification01Icon } from '@hugeicons/core-free-icons';
import { enablePush, isPushEnabled, pushSupport } from '../../utils/push';

type View = 'hidden' | 'offer' | 'ios' | 'done';

const dismissedKey = (key: string) => `sbc.pushOptIn.dismissed.${key}`;
const wasDismissed = (key?: string) => {
  if (!key) return false;
  try { return localStorage.getItem(dismissedKey(key)) === '1'; } catch { return false; }
};

/**
 * Offers notifications on this phone. Hidden where push cannot work, once it
 * is on, once the browser refused — and, where it can be closed (dismissKey),
 * once the member closed it there.
 */
export function PushOptIn({
  hint = 'Crédits bas, filleul qui paie.',
  dismissKey,
}: {
  /** What they will be told about, in a few words. */
  hint?: string;
  /** Lets the member close the card for good on this page. */
  dismissKey?: string;
} = {}) {
  const [view, setView] = useState<View>('hidden');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const support = pushSupport();
    if (wasDismissed(dismissKey)) return;
    if (support === 'ios-needs-install') { setView('ios'); return; }
    if (support !== 'supported' || Notification.permission === 'denied') return;
    isPushEnabled()
      .then(on => { if (!cancelled && !on) setView('offer'); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [dismissKey]);

  const enable = async () => {
    setBusy(true);
    try {
      const result = await enablePush();
      setView(result === 'enabled' ? 'done' : 'hidden');
      if (result === 'enabled') window.setTimeout(() => setView('hidden'), 2500);
    } catch {
      setView('hidden');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence initial={false}>
      {view !== 'hidden' && (
        <motion.section
          aria-label="Alertes sur ce téléphone"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-card p-4 bg-surface border border-border flex items-center gap-3">
            <motion.span
              className="size-10 grid place-items-center rounded-tile bg-primary-soft text-primary shrink-0"
              animate={view === 'offer' ? { rotate: [0, -14, 12, -8, 0] } : undefined}
              transition={{ duration: 0.9, delay: 0.6, repeat: Infinity, repeatDelay: 4 }}
            >
              <HugeiconsIcon icon={Notification01Icon} size={20} />
            </motion.span>
            {view === 'done' ? (
              <p className="flex-1 text-sm font-semibold text-success">Alertes activées</p>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">Être alerté sur ce téléphone</p>
                <p className="text-xs text-ink-3">
                  {view === 'ios' ? "Sur iPhone, ajoutez d'abord SBC à l'écran d'accueil." : hint}
                </p>
              </div>
            )}
            {view === 'offer' && (
              <button
                onClick={enable}
                disabled={busy}
                className="h-9 px-4 rounded-pill bg-primary text-white text-sm font-semibold shrink-0 disabled:opacity-50"
              >
                Activer
              </button>
            )}
            {dismissKey && view !== 'done' && (
              <button
                onClick={() => {
                  try { localStorage.setItem(dismissedKey(dismissKey), '1'); } catch { /* private mode */ }
                  setView('hidden');
                }}
                aria-label="Fermer"
                className="size-8 grid place-items-center rounded-pill text-ink-3 hover:bg-surface-2 shrink-0"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
