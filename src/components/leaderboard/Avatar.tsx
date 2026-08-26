import { sbcApiService } from '../../services/SBCApiService';
import { initials, cn } from '../../lib/utils';
import type { LeaderboardEntry } from '../../types/api';

/**
 * Avatar with an initials fallback. Resolution order matches the rest of the
 * app: a direct URL, then a settings file id, then initials.
 */
function Avatar({ entry, size, className }: { entry: LeaderboardEntry; size: number; className?: string }) {
  const src = entry.avatar || (entry.avatarId ? sbcApiService.generateSettingsFileUrl(entry.avatarId) : '');
  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={entry.name}
        style={style}
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
