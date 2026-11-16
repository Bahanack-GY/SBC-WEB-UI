import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, GiftIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi } from '../../services/animationApi';
import { CHALLENGE_STATUS, REWARD_TYPES, challengePath, countdown, info } from '../../lib/animation';
import { TONE_CLASS, xaf } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

/** The phase-relevant deadline of a challenge, as a short French line. */
const nextDeadline = (c: any): string => {
    const s = c.schedule ?? {};
    const pick = (at: string | undefined, prefix: string) => {
        const left = countdown(at);
        return left ? `${prefix} ${left}` : '';
    };
    switch (c.status) {
        case 'PROGRAMMED': return pick(s.registrationOpensAt, 'Inscriptions dans') || pick(s.votingOpensAt, 'Votes dans');
        case 'REGISTRATION_OPEN': return pick(s.registrationClosesAt, 'Inscriptions closes dans');
        case 'REGISTRATION_CLOSED':
        case 'ACTIVE': return pick(s.votingOpensAt, 'Votes dans');
        case 'VOTING_OPEN': return pick(s.votingClosesAt, 'Votes clos dans');
        default: return '';
    }
};

/**
 * "🎉 Animations" on the public event page: the event's challenges and its
 * public rewards. Renders nothing when the organizer set none up, or when the
 * module is unreachable — the event page must never break because of it.
 */
export default function EventAnimations({ slug }: { slug: string }) {
    const [data, setData] = useState<{ event?: any; challenges: any[]; rewards: any[] } | null>(null);

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        animationApi.eventChallenges(slug)
            .then((r) => {
                if (!cancelled && r.apiReportedSuccess && r.body?.data) {
                    setData({ event: r.body.data.event, challenges: r.body.data.challenges ?? [], rewards: r.body.data.rewards ?? [] });
                }
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [slug]);

    if (!data || (data.challenges.length === 0 && data.rewards.length === 0)) return null;
    const eventSlug = data.event?.slug || slug;

    return (
        <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3" aria-labelledby="event-animations-title">
            <h3 id="event-animations-title" className="text-base font-bold text-ink">🎉 Animations</h3>

            {data.challenges.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {data.challenges.map((c) => {
                        const st = info(CHALLENGE_STATUS, c.status);
                        const deadline = nextDeadline(c);
                        return (
                            <li key={String(c._id)}>
                                <Link to={challengePath(eventSlug, c.slug)} className="flex items-center gap-3 rounded-tile bg-surface-2 p-2.5">
                                    {c.imageFileId ? (
                                        <img src={sbcApiService.generateThumbnailUrl(c.imageFileId, 128)} alt="" loading="lazy" className="size-12 shrink-0 rounded-tile object-cover" />
                                    ) : (
                                        <span className="size-12 shrink-0 grid place-items-center rounded-tile bg-primary-soft text-lg" aria-hidden>🏆</span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-ink truncate">{c.name}</span>
                                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                            <span className={cn('rounded-pill px-2 py-0.5 text-[10px] font-semibold', TONE_CLASS[st.tone])}>{st.label}</span>
                                            {deadline && <span className="text-[11px] text-ink-2">{deadline}</span>}
                                        </span>
                                    </span>
                                    <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                                        Voir
                                        <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            {data.rewards.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                        <HugeiconsIcon icon={GiftIcon} size={15} className="text-accent" />
                        À gagner
                    </p>
                    <ul className="flex flex-col gap-2">
                        {data.rewards.map((r) => {
                            const type = r.type === 'CUSTOM' && r.customTypeLabel ? r.customTypeLabel : REWARD_TYPES.find((t) => t.value === r.type)?.label;
                            const left = typeof r.quantity === 'number' ? Math.max(0, r.quantity - (r.quantityAwarded ?? 0)) : undefined;
                            return (
                                <li key={String(r._id)} className="flex items-start gap-3">
                                    <span className="size-10 shrink-0 grid place-items-center rounded-tile bg-accent-soft overflow-hidden text-accent">
                                        {r.imageFileId
                                            ? <img src={sbcApiService.generateThumbnailUrl(r.imageFileId, 96)} alt="" loading="lazy" className="size-full object-cover" />
                                            : <HugeiconsIcon icon={GiftIcon} size={18} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-ink">{r.name}</span>
                                        <span className="block text-[11px] text-ink-2">
                                            {[type,
                                                typeof r.estimatedValue === 'number' && r.estimatedValue > 0 ? xaf(r.estimatedValue) : null,
                                                left !== undefined ? (r.status === 'EXHAUSTED' || left === 0 ? 'épuisé' : `${left} restant${left > 1 ? 's' : ''}`) : null,
                                            ].filter(Boolean).join(' · ')}
                                        </span>
                                        {(r.conditionsText || r.description) && (
                                            <span className="block text-xs text-ink-2 mt-0.5 whitespace-pre-wrap">{r.conditionsText || r.description}</span>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
}
