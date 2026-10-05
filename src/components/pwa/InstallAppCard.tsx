import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon } from '@hugeicons/core-free-icons';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/**
 * A permanent way to install SBC, for screens where it matters (profile,
 * notification settings). The banner only shows when Chrome offers it and
 * hides for 14 days once closed; this stays until SBC is installed.
 * Installed, notifications come in SBC's name, without Chrome's "Unsubscribe".
 */
export function InstallAppCard({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const { installed, isIos, canPromptNatively, install } = useInstallPrompt();
  const [howTo, setHowTo] = useState(false);
  if (installed) return null;

  const steps = isIos
    ? 'Touche Partager, puis « Sur l\'écran d\'accueil ».'
    : 'Menu ⋮ de Chrome, puis « Installer l\'application » (ou « Ajouter à l\'écran d\'accueil »).';

  return (
    <section aria-label="Installer l'application" className={`rounded-card bg-surface border border-border ${compact ? 'p-3' : 'p-4'} ${className}`}>
      <div className="flex items-center gap-3">
        <span className={`${compact ? 'size-9' : 'size-10'} grid place-items-center rounded-tile bg-primary-soft text-primary shrink-0`}>
          <HugeiconsIcon icon={Download01Icon} size={compact ? 18 : 20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Installer l'application</p>
          {!compact && <p className="text-xs text-ink-3">SBC sur ton écran d'accueil, notifications à son nom.</p>}
        </div>
        <button
          onClick={() => (canPromptNatively ? void install() : setHowTo(v => !v))}
          className="h-9 px-4 rounded-pill bg-primary text-white text-sm font-semibold shrink-0"
        >
          {canPromptNatively ? 'Installer' : 'Comment ?'}
        </button>
      </div>
      {howTo && !canPromptNatively && <p className="mt-3 text-sm text-ink-2">{steps}</p>}
    </section>
  );
}
