import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Copy01Icon, Share08Icon } from '@hugeicons/core-free-icons';
import { cn } from '../../lib/utils';

const btn = 'w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold';

/**
 * Copy / share a link (the phone's share sheet, else WhatsApp), like the sales
 * page card. Used for a candidate's public page.
 */
export default function ShareLink({ url, text, title = 'SBC Impact Challenge', showUrl = false }: {
  url: string; text: string; title?: string; showUrl?: boolean;
}) {
  const [copy, setCopy] = useState<'copied' | 'failed' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copyLink = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(url);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
    timer.current = setTimeout(() => setCopy(null), 2500);
  };
  const share = async () => {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title, text, url }); } catch { /* closed the share sheet */ }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} : ${url}`)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-2">
      {showUrl && (
        <p className="rounded-tile bg-surface-2 px-3 py-2.5 text-sm font-medium text-ink break-all select-all" data-testid="impact-share-link">{url}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copyLink} className={cn(btn, 'bg-surface text-ink border border-border hover:bg-surface-2')}>
          <HugeiconsIcon icon={copy === 'copied' ? CheckmarkCircle02Icon : Copy01Icon} size={16} className={copy === 'copied' ? 'text-success' : undefined} />
          {copy === 'copied' ? 'Lien copié' : 'Copier le lien'}
        </button>
        <button type="button" onClick={share} className={cn(btn, 'bg-primary text-white hover:bg-primary-hover')}>
          <HugeiconsIcon icon={Share08Icon} size={16} />
          Partager
        </button>
      </div>
      <p role="status" className={cn('text-sm text-ink-2', copy !== 'failed' && 'sr-only')}>
        {copy === 'copied' && 'Lien copié'}
        {copy === 'failed' && 'Copie impossible : appuyez longuement sur le lien pour le copier.'}
      </p>
    </div>
  );
}
