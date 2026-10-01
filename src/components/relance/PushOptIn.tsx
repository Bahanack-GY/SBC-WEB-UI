import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Notification01Icon } from '@hugeicons/core-free-icons';
import { enablePush, isPushEnabled, pushSupport } from '../../utils/push';

type View = 'hidden' | 'offer' | 'ios' | 'done';

/**
 * Offers relance alerts on this phone: credits running low or out, a filleul
 * paying. Email alerts alone let relance stop without the parrain noticing.
 * Hidden where push cannot work, once it is on, or once the browser refused.
 */
export function PushOptIn() {
  const [view, setView] = useState<View>('hidden');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const support = pushSupport();
    if (support === 'ios-needs-install') { setView('ios'); return; }
    if (support !== 'supported' || Notification.permission === 'denied') return;
    isPushEnabled()
      .then(on => { if (!cancelled && !on) setView('offer'); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

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
                  {view === 'ios' ? "Sur iPhone, ajoutez d'abord SBC à l'écran d'accueil." : 'Crédits bas, filleul qui paie.'}
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
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
