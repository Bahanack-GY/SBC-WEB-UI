import { sbcApiService } from '../../services/SBCApiService';
import { initials, cn } from '../../lib/utils';
import type { LeaderboardEntry } from '../../types/api';

/**
 * Avatar with an initials fallback. Resolution order matches the rest of the
 * app: a direct URL, then a settings file id, then initials.
 */
function Avatar({ entry, size, className }: { entry: LeaderboardEntry; size: number; className?: string }) {
  // Fetched at the size it is drawn, not the size it was uploaded: profile
  // photos average ~950 KiB in the bucket and a leaderboard is a column of them.
  const src = sbcApiService.generateThumbnailUrl(entry.avatar || entry.avatarId, size * 2);
  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={entry.name}
        style={style}
        loading="lazy"
        decoding="async"
        className={cn('rounded-pill object-cover bg-surface-2', className)}
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.36) }}
      className={cn(
        'rounded-pill bg-primary-soft text-primary font-bold grid place-items-center select-none',
        className,
      )}
      aria-hidden
    >
      {initials(entry.name)}
    </span>
  );
}

export default Avatar;
