import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon, Download01Icon, Share08Icon, PlusSignIcon, ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

function InstallPrompt() {
  const { canShow, isIos, canPromptNatively, install, dismiss } = useInstallPrompt();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (!canShow) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          // Sits above the bottom nav pill.
          className="fixed bottom-24 left-4 right-4 z-50 bg-surface border border-border rounded-card p-3 flex items-center gap-3"
          role="dialog"
          aria-label="Installer l'application"
        >
          <img src="/pwa-192.png" alt="" aria-hidden className="size-11 rounded-tile shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink text-sm">Installer SBC</p>
            <p className="text-xs text-ink-3">
              Ajoutez l'app à votre écran d'accueil, sans passer par le navigateur.
            </p>
          </div>

          <button
            onClick={() => (canPromptNatively ? install() : setShowIosSteps(true))}
            className="shrink-0 bg-primary text-white text-sm font-semibold rounded-pill px-3.5 py-2 flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={Download01Icon} size={15} />
            Installer
          </button>

          <button
            onClick={dismiss}
            aria-label="Plus tard"
            className="shrink-0 text-ink-3 p-1"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </motion.div>
      </AnimatePresence>

      {/* iOS has no install API — Safari only offers the Share sheet, so the
          best we can do is show exactly where to tap. */}
      <AnimatePresence>
        {showIosSteps && isIos && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIosSteps(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md bg-surface border border-border rounded-card p-5 mb-20"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-bold text-ink">Ajouter SBC à l'écran d'accueil</h2>
                  <p className="text-xs text-ink-3 mt-0.5">Sur iPhone, en 3 étapes depuis Safari.</p>
                </div>
                <button onClick={() => setShowIosSteps(false)} aria-label="Fermer" className="text-ink-3">
                  <HugeiconsIcon icon={Cancel01Icon} size={18} />
                </button>
              </div>

              <ol className="flex flex-col gap-3">
                {[
                  { n: 1, icon: Share08Icon, text: 'Touchez le bouton Partager, en bas de Safari.' },
                  { n: 2, icon: PlusSignIcon, text: "Faites défiler et choisissez « Sur l'écran d'accueil »." },
                  { n: 3, icon: ArrowRight01Icon, text: 'Touchez « Ajouter ». L\'icône SBC apparaît sur votre écran.' },
                ].map((s) => (
                  <li key={s.n} className="flex items-start gap-3">
                    <span className="shrink-0 size-7 grid place-items-center rounded-pill bg-primary text-white text-xs font-bold">
                      {s.n}
                    </span>
                    <span className="flex items-center gap-2 text-sm text-ink-2 pt-0.5">
                      <HugeiconsIcon icon={s.icon} size={16} className="text-primary shrink-0" />
                      {s.text}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 text-[11px] text-ink-3">
                Cette option n'existe que dans Safari. Depuis Chrome ou Firefox sur iPhone, ouvrez
                d'abord cette page dans Safari.
              </p>

              <button
                onClick={() => { setShowIosSteps(false); dismiss(); }}
                className="mt-4 w-full bg-surface-2 text-ink-2 rounded-pill py-2.5 text-sm font-semibold"
              >
                Ne plus afficher
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default InstallPrompt;
