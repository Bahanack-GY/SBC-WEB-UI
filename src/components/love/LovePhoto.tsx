import { HugeiconsIcon } from '@hugeicons/react';
import { UserIcon } from '@hugeicons/core-free-icons';

/**
 * A SBCLOVE photo.
 *
 * Spec §6 asks the frontend for a deterrent: a watermark, no right-click, no
 * drag-to-save. None of it is enforceable — the real protection is server-side,
 * where members without an approved profile only ever receive the blurred
 * derivative. This is the visible half of that rule.
 */
function LovePhoto({
  url,
  blurred,
  alt = '',
  className = '',
}: {
  url?: string;
  blurred?: boolean;
  alt?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-surface-2 select-none ${className}`}>
      {url ? (
        <img
          src={url}
          alt={alt}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full object-cover pointer-events-none"
        />
      ) : (
        // No URL at all means the blurred derivative is missing — never fall
        // back to the clear photo, show nothing.
        <div className="h-full w-full grid place-items-center text-ink-3">
          <HugeiconsIcon icon={UserIcon} size={28} />
        </div>
      )}

      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center text-white/40 font-bold tracking-widest text-xs rotate-[-20deg]"
      >
        SBCLOVE
      </span>

      {blurred && (
        <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/50 rounded-pill px-2 py-0.5 text-center">
          Photo floutée
        </span>
      )}
    </div>
  );
}

export default LovePhoto;
