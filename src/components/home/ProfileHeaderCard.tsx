import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Link01Icon } from '@hugeicons/core-free-icons';
import { cn } from '../../lib/utils';

interface Props {
  name: string;
  image: string;
  affiliates: number | null;
  status: string;
  promoCode: string;
  memberSince?: string;
  memberId?: string;
}

/**
 * Recomputed on render.
 *
 * The old HomeUserCard computed this at MODULE level, so the greeting froze for
 * the tab's lifetime, and `time > 12` mislabelled 12:00-12:59 as "Bonjour".
 *
 * ponytail: still not on a timer — a tab left open across 18:00 keeps the stale
 * word until the next interaction. Add a setInterval only if someone reports it.
 */
function greetingFor(hours: number) {
  if (hours < 12) return 'Bonjour';
  if (hours < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function ProfileHeaderCard({ name, image, affiliates, status, promoCode, memberSince, memberId }: Props) {
  const navigate = useNavigate();
  const greeting = greetingFor(new Date().getHours());
  const isSubscribed = status === 'Abonné';

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`https://sniperbuisnesscenter.com/signup?affiliationCode=${promoCode}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onClick={() => navigate('/profile')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
      className="bg-surface border border-border rounded-card p-4 flex items-center gap-3 cursor-pointer"
    >
      <div className="relative shrink-0">
        <img
          src={image}
          alt={name}
          className="size-14 rounded-pill object-cover ring-2 ring-primary ring-offset-2 ring-offset-surface"
        />
        <span className="absolute bottom-0 right-0 size-3 rounded-pill bg-success-dot ring-2 ring-surface" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-2 truncate">
          {greeting}, <span className="font-bold text-ink">{name}</span>
        </p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'text-[11px] font-semibold px-2 py-0.5 rounded-pill',
              isSubscribed ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink-2',
            )}
          >
            {status}
          </span>
          <span className="text-[11px] text-ink-3">
            {memberId ? `#${memberId}` : promoCode}
            {affiliates !== null ? ` · ${affiliates} filleuls` : ' · … filleuls'}
            {memberSince ? ` · ${memberSince}` : ''}
          </span>
        </div>
      </div>

      <button
        onClick={copyLink}
        aria-label="Copier mon lien d'affiliation"
        className="shrink-0 size-9 grid place-items-center rounded-tile bg-primary-soft text-primary"
      >
        <HugeiconsIcon icon={Link01Icon} size={16} />
      </button>
      <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3 shrink-0" />
    </motion.div>
  );
}

export default ProfileHeaderCard;
