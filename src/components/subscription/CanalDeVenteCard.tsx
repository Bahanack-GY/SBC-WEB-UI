import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Copy01Icon, LinkSquare02Icon, Share08Icon } from '@hugeicons/core-free-icons';
import { useEffect, useRef, useState } from 'react';
import { sbcApiService } from '../../services/SBCApiService';
import { cn } from '../../lib/utils';

const btn = 'w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 disabled:cursor-not-allowed';
const CANAL_LINK = /^https:\/\/canaldevente\.sniperbuisnesscenter\.com\//;

/**
 * The Pack Winner member's canal de vente link, on the profile. SBC creates it
 * (and returns the one they already had); while it is being created, a short
 * notice shows instead.
 */
function CanalDeVenteCard({ className }: { className?: string }) {
    const [link, setLink] = useState<string | null | undefined>(undefined);
    const [copy, setCopy] = useState<'copied' | 'failed' | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => () => clearTimeout(timer.current), []);

    useEffect(() => {
        let alive = true;
        Promise.resolve()
            .then(() => sbcApiService.getCanalDeVente())
            .then(res => {
                const value = res.body?.data?.link;
                if (alive) setLink(typeof value === 'string' && CANAL_LINK.test(value) ? value : null);
            })
            .catch(() => { if (alive) setLink(null); });
        return () => { alive = false; };
    }, []);

    if (link === undefined) return null;

    const copyLink = async () => {
        if (!link) return;
        clearTimeout(timer.current);
        try {
            await navigator.clipboard.writeText(link);
            setCopy('copied');
        } catch {
            // No clipboard (old browser, http): the link stays on screen to copy by hand.
            setCopy('failed');
        }
        timer.current = setTimeout(() => setCopy(null), 2500);
    };

    const share = async () => {
        if (!link) return;
        const text = 'Découvrez Sniper Business Center';
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: 'Sniper Business Center', text, url: link });
            } catch { /* closed the share sheet */ }
            return;
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} : ${link}`)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <section aria-labelledby="canal-de-vente-title" className={cn('bg-surface border border-border rounded-card p-4 flex flex-col gap-3', className)}>
            <div>
                <h3 id="canal-de-vente-title" className="text-base font-bold text-ink">Votre canal de vente</h3>
                <p className="mt-1 text-sm text-ink-2 text-pretty">
                    {link
                        ? 'Votre lien personnel : vos prospects vous contactent sur WhatsApp et s\'inscrivent sous vous.'
                        : 'Votre lien est en cours de création. Revenez dans quelques minutes.'}
                </p>
            </div>
            {link && (
                <>
                    <p className="rounded-tile bg-surface-2 px-3 py-2.5 text-sm font-medium text-ink break-all select-all" data-testid="canal-de-vente-link">
                        {link}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={copyLink}
                            className={cn(btn, 'bg-surface text-ink border border-border hover:bg-surface-2')}
                        >
                            <HugeiconsIcon icon={copy === 'copied' ? CheckmarkCircle02Icon : Copy01Icon} size={16} className={copy === 'copied' ? 'text-success' : undefined} />
                            {copy === 'copied' ? 'Lien copié' : 'Copier le lien'}
                        </button>
                        <button
                            type="button"
                            onClick={share}
                            className={cn(btn, 'bg-primary text-white hover:bg-primary-hover')}
                        >
                            <HugeiconsIcon icon={Share08Icon} size={16} />
                            Partager
                        </button>
                    </div>
                    <p role="status" className={cn('text-sm text-ink-2', copy !== 'failed' && 'sr-only')}>
                        {copy === 'copied' && 'Lien copié'}
                        {copy === 'failed' && 'Copie impossible : appuyez longuement sur le lien pour le copier.'}
                    </p>
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="-mt-1 inline-flex items-center justify-center gap-1 py-1 text-sm font-semibold text-primary"
                    >
                        Voir mon canal de vente
                        <HugeiconsIcon icon={LinkSquare02Icon} size={16} />
                    </a>
                </>
            )}
        </section>
    );
}

export default CanalDeVenteCard;
