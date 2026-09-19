import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';

interface EventItem {
    _id: string;
    slug: string;
    title: string;
    posterFileId?: string;
    startsAt: string;
    venue?: string;
    city?: string;
    publishedAt?: string;
    createdAt: string;
}

const STORAGE_KEY = 'sbc.events.lastSeenId';
const DISMISS_KEY = 'sbc.events.lastDismissed';

/**
 * On app boot (mounted from Home), poll the public feed once. If the newest
 * PUBLISHED event has an id we haven't seen before AND the user hasn't
 * dismissed it in the last 3 hours, show a one-shot popup announcing it.
 *
 * "Seen" is bumped every time the user opens /events, so this is only ever
 * intrusive for genuinely new events. The dismiss backoff prevents nagging
 * the same user twice in a session if they click "Plus tard".
 */
export default function NewEventPopup() {
    const navigate = useNavigate();
    const [event, setEvent] = useState<EventItem | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await sbcApiService.listPublicEvents({ limit: 3 });
                if (cancelled) return;
                if (!res.apiReportedSuccess) return;
                const items = (res.body?.data?.items || []) as EventItem[];
                if (items.length === 0) return;

                // Sort by publishedAt/createdAt desc so the "newest" is first.
                const newest = [...items].sort((a, b) => {
                    const ta = new Date(a.publishedAt || a.createdAt).getTime();
                    const tb = new Date(b.publishedAt || b.createdAt).getTime();
                    return tb - ta;
                })[0];

                const lastSeen = localStorage.getItem(STORAGE_KEY);
                if (lastSeen === newest._id) return;

                const lastDismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
                if (lastDismissed && Date.now() - lastDismissed < 3 * 3600 * 1000) return;

                setEvent(newest);
            } catch {
                /* silent — no popup is better than a broken popup */
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (!event) return null;

    const close = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setEvent(null);
    };

    const open = () => {
        localStorage.setItem(STORAGE_KEY, event._id);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setEvent(null);
        navigate(`/events/${encodeURIComponent(event.slug)}`);
    };

    const poster = event.posterFileId ? sbcApiService.generateThumbnailUrl(event.posterFileId, 512) : '';
    const when = new Date(event.startsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <AnimatePresence>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-4"
                onClick={close}
            >
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 24 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-surface border border-border rounded-card w-full max-w-md overflow-hidden"
                >
                    <div className="relative">
                        {poster ? (
                            <img src={poster} alt={event.title} className="w-full h-48 object-cover" />
                        ) : (
                            <div className="w-full h-32 bg-primary-soft grid place-items-center">
                                <HugeiconsIcon icon={Ticket01Icon} size={34} className="text-primary" />
                            </div>
                        )}
                        <span className="absolute top-3 left-3 rounded-pill bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            Nouvel événement
                        </span>
                        <button
                            onClick={close}
                            className="absolute top-3 right-3 size-8 grid place-items-center rounded-pill bg-surface text-ink-2 border border-border"
                            aria-label="Fermer"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} size={15} />
                        </button>
                    </div>
                    <div className="p-4">
                        <p className="font-bold text-ink text-lg text-balance">{event.title}</p>
                        <p className="text-sm text-ink-2 mt-1">{when}</p>
                        {(event.venue || event.city) && (
                            <p className="text-xs text-ink-3 mt-0.5">
                                {event.venue}{event.venue && event.city ? ' · ' : ''}{event.city}
                            </p>
                        )}
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={close}
                                className="flex-1 rounded-xl border border-border text-ink font-medium py-2.5 text-sm"
                            >
                                Plus tard
                            </button>
                            <button
                                onClick={open}
                                className="flex-1 rounded-xl bg-primary text-white font-semibold py-2.5 text-sm hover:bg-primary-hover transition-colors"
                            >
                                Voir l'événement
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/** Called by Events.tsx to bump the last-seen marker so we don't re-alert. */
export const markEventsSeen = (newestId?: string) => {
    if (newestId) localStorage.setItem(STORAGE_KEY, newestId);
};
