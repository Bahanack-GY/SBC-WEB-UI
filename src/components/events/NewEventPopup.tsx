import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
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
                    className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                >
                    <div className="relative">
                        {poster ? (
                            <img src={poster} alt={event.title} className="w-full h-48 object-cover" />
                        ) : (
                            <div className="w-full h-32 bg-gradient-to-br from-[#115CF6] to-[#2C7BE5]" />
                        )}
                        <div className="absolute top-3 left-3 bg-[#115CF6] text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">
                            🎉 Nouvel événement
                        </div>
                        <button
                            onClick={close}
                            className="absolute top-3 right-3 bg-white/90 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none"
                            aria-label="Fermer"
                        >
                            ×
                        </button>
                    </div>
                    <div className="p-4">
                        <div className="font-bold text-gray-900 text-lg">{event.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{when}</div>
                        {(event.venue || event.city) && (
                            <div className="text-xs text-gray-500 mt-0.5">
                                {event.venue}{event.venue && event.city ? ' · ' : ''}{event.city}
                            </div>
                        )}
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={close}
                                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl text-sm"
                            >
                                Plus tard
                            </button>
                            <button
                                onClick={open}
                                className="flex-1 bg-[#115CF6] text-white font-semibold py-2.5 rounded-xl text-sm"
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
