import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Flag02Icon, UserBlock01Icon, Calendar03Icon } from '@hugeicons/core-free-icons';
import { INTENTION_LABELS, type LoveProfile } from '../../hooks/useSbcLove';
import LovePhoto from './LovePhoto';

/** "Membre depuis mars 2024" — the month is enough, and gives away less. */
function memberSince(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/**
 * Full profile behind a card: every photo, the whole description, and how long
 * they have been an SBC member — the one signal that says this is a real, older
 * account rather than one made this morning.
 */
function LoveProfileModal({
  profile,
  onClose,
  onInterest,
  onPass,
  onReport,
  onBlock,
  interestDisabled,
  interestLabel,
}: {
  profile: LoveProfile;
  onClose: () => void;
  onInterest: () => void;
  onPass: () => void;
  onReport: () => void;
  onBlock: () => void;
  interestDisabled?: boolean;
  interestLabel: string;
}) {
  const since = memberSince(profile.memberSince);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-card sm:rounded-card"
      >
        <div className="sticky top-0 flex items-center justify-between bg-surface/95 backdrop-blur px-4 py-3 border-b border-border">
          <h2 className="font-bold text-ink">{profile.displayName}</h2>
          <button onClick={onClose} aria-label="Fermer" className="p-1 text-ink-3">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>

        {/* Every photo, swipeable horizontally — one is never the whole picture. */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory p-4">
          {(profile.photos.length ? profile.photos : [{ fileId: 'none', blurred: false, order: 0 }]).map((p) => (
            <LovePhoto
              key={p.fileId}
              url={p.url}
              blurred={p.blurred}
              alt={profile.displayName}
              className="w-64 h-72 shrink-0 snap-center rounded-card"
            />
          ))}
        </div>

        {/* Bottom sheet on mobile: its buttons land exactly where the floating
            nav bar and the home indicator are. The overlay sits above the bar
            (z-[60], as elsewhere in the app) and this clears the indicator. */}
        <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-3">
          <p className="text-sm text-ink-2">
            {[profile.ageBracket, profile.city, profile.country].filter(Boolean).join(' · ')}
          </p>
          <p className="text-sm font-medium text-primary">
            {profile.intention === 'autre' && profile.otherIntentionText
              ? profile.otherIntentionText
              : INTENTION_LABELS[profile.intention] ?? profile.intention}
          </p>
          <p className="text-sm text-ink whitespace-pre-line">{profile.description}</p>

          {since && (
            <p className="flex items-center gap-2 text-xs text-ink-3">
              <HugeiconsIcon icon={Calendar03Icon} size={14} />
              Membre SBC depuis {since}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onPass} className="flex-1 border border-border rounded-tile py-2.5 text-sm font-medium text-ink-2">
              Passer
            </button>
            <button
              onClick={onInterest}
              disabled={interestDisabled}
              className="flex-1 bg-danger text-white rounded-tile py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              {interestLabel}
            </button>
          </div>

          <div className="flex gap-4 justify-center pt-1">
            <button onClick={onReport} className="flex items-center gap-1 text-xs text-ink-3">
              <HugeiconsIcon icon={Flag02Icon} size={14} /> Signaler
            </button>
            <button onClick={onBlock} className="flex items-center gap-1 text-xs text-ink-3">
              <HugeiconsIcon icon={UserBlock01Icon} size={14} /> Bloquer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default LoveProfileModal;
