import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

/**
 * Bottom sheet. Closes on the backdrop, the × and Escape. The body scrolls
 * inside so a long sheet never pushes its buttons off a small phone screen.
 */
export function Sheet({
  open, onClose, title, children, footer, label,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Accessible name when the title isn't plain text. */
  label?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Fermer" className="absolute inset-0 bg-ink/40" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label ?? (typeof title === 'string' ? title : undefined)}
            className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-surface rounded-t-card"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex justify-center pt-2"><span className="h-1 w-10 rounded-pill bg-border" /></div>
            {title && (
              <div className="flex items-center gap-3 px-4 pt-2 pb-3">
                <h2 className="flex-1 text-base font-semibold text-ink">{title}</h2>
                <button onClick={onClose} aria-label="Fermer" className="size-9 grid place-items-center rounded-pill text-ink-3 hover:bg-surface-2">
                  <HugeiconsIcon icon={Cancel01Icon} size={20} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
            {footer && <div className="px-4 pt-3 pb-5 border-t border-border">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
