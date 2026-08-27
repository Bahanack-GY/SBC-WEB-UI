import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FavouriteIcon } from '@hugeicons/core-free-icons';
import type { LoveProfile } from '../../hooks/useSbcLove';
import LovePhoto from './LovePhoto';

/**
 * The moment the interest turns out to be reciprocal (spec §10).
 *
 * It is a full-screen interruption on purpose: a match is the one event in the
 * module worth stopping the deck for, and the next step — the contact double
 * opt-in — is a decision, not a notification.
 *
 * « Dire bonjour » records that first opt-in straight away; contact still only
 * opens once the other side does the same (spec §13), which the button copy
 * says rather than promising a chat that isn't unlocked yet.
 */
function LoveMatchCelebration({
  me,
  them,
  onSayHello,
  onLater,
  busy,
}: {
  me: LoveProfile | null;
  them: LoveProfile;
  onSayHello: () => void;
  onLater: () => void;
  busy?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] bg-ink/95 flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="relative h-64 w-64 mb-8">
        <motion.div
          initial={{ x: -60, rotate: -18, opacity: 0 }}
          animate={{ x: -28, rotate: -8, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.05 }}
          className="absolute left-0 top-6 w-36 h-48 rounded-card overflow-hidden ring-4 ring-white/90"
        >
          <LovePhoto url={them.photos[0]?.url} blurred={them.photos[0]?.blurred} alt={them.displayName} className="h-full w-full" />
        </motion.div>

        <motion.div
          initial={{ x: 60, rotate: 18, opacity: 0 }}
          animate={{ x: 28, rotate: 8, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.12 }}
          className="absolute right-0 top-0 w-36 h-48 rounded-card overflow-hidden ring-4 ring-white/90"
        >
          <LovePhoto url={me?.photos[0]?.url} blurred={me?.photos[0]?.blurred} alt="Votre photo" className="h-full w-full" />
        </motion.div>

        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.3, stiffness: 300 }}
          className="absolute left-1/2 bottom-2 -translate-x-1/2 size-16 grid place-items-center rounded-pill bg-danger text-white ring-4 ring-ink/95"
        >
          <HugeiconsIcon icon={FavouriteIcon} size={30} />
        </motion.span>
      </div>

      <h2 className="text-3xl font-extrabold text-white">C'est un match !!</h2>
      <p className="text-sm text-white/70 mt-2 max-w-xs">
        {them.displayName} a manifesté un intérêt pour vous aussi. Dites-lui que vous souhaitez
        être contacté(e) — le contact s'ouvre quand vous êtes d'accord tous les deux.
      </p>

      <button
        onClick={onSayHello}
        disabled={busy}
        className="mt-8 w-full max-w-xs bg-white text-ink rounded-pill py-3.5 font-semibold disabled:opacity-60"
      >
        {busy ? 'Un instant…' : 'Dire bonjour'}
      </button>
      <button onClick={onLater} className="mt-4 text-sm text-white/70 font-medium">
        Plus tard, je verrai ça après
      </button>
    </motion.div>
  );
}

export default LoveMatchCelebration;
