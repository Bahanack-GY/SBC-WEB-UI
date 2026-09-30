import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { WhatsappIcon, FacebookIcon, Copy01Icon, Exchange01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { xaf } from '../lib/eventStatus';
import { cn } from '../lib/utils';

interface TicketType {
    _id: string;
    name: string;
    description?: string;
    price: number;
    available: number;
    maxPerOrder: number;
    /** Set by the server from salesStart/salesEnd (§6) — a closed type stays visible but unbuyable. */
    onSale?: boolean;
    salesStart?: string;
    salesEnd?: string;
}

interface EventDoc {
    _id: string;
    slug: string;
    title: string;
    description: string;
    posterFileId?: string;
    videoFileId?: string;
    city: string;
    venue: string;
    address: string;
    startsAt: string;
    endsAt: string;
    resaleEnabled: boolean;
    organizer?: { displayName?: string; logoFileId?: string };
    shareUrls?: { link?: string; whatsapp?: string; facebook?: string };
}

interface ResaleListing {
    _id: string;
    askingPrice: number;
    originalPrice?: number;
    /** The API hydrates the whole ticket type, not just its name. */
    ticketType?: { name?: string };
}

const posterUrl = (fileId?: string) => fileId ? sbcApiService.generateThumbnailUrl(fileId, 800) : '';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'full' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function EventDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<EventDoc | null>(null);
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
    const [resale, setResale] = useState<ResaleListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!slug) return;
        (async () => {
            try {
                const res = await sbcApiService.getPublicEventBySlug(slug);
                if (res.apiReportedSuccess && res.body?.data) {
                    const ev: EventDoc = res.body.data.event;
                    setEvent(ev);
                    setTicketTypes(res.body.data.ticketTypes ?? []);
                    // "Billets en revente" for THIS event (§4). Best-effort: the page is
                    // still useful if the marketplace call fails.
                    if (ev?.resaleEnabled && ev?._id) {
                        try {
                            const r = await sbcApiService.listPublicResale({ eventId: ev._id, limit: 5 });
                            if (r.apiReportedSuccess) setResale(r.body?.data?.items ?? []);
                        } catch { /* marketplace unavailable — section simply stays hidden */ }
                    }
                } else {
                    setError(res.message || 'Événement introuvable.');
                }
            } catch (e: any) {
                setError(e?.message || 'Erreur réseau.');
            } finally { setLoading(false); }
        })();
    }, [slug]);

    const shareLink = event?.shareUrls?.link || (typeof window !== 'undefined' ? window.location.href : '');

    const nativeShare = async () => {
        const text = `Découvrez ${event?.title} sur SBC Event`;
        try {
            if (navigator.share) { await navigator.share({ title: event?.title, text, url: shareLink }); return; }
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* user cancelled */ }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-3 flex flex-col gap-3">
                <Skeleton height="h-10" rounded="rounded-card" />
                <Skeleton height="h-48" rounded="rounded-card" />
                <Skeleton height="h-40" rounded="rounded-card" />
            </div>
        );
    }
    if (error || !event) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-10">
                <div className="bg-surface border border-border rounded-card p-6 text-center">
                    <p className="text-sm font-semibold text-ink">{error || 'Événement introuvable.'}</p>
                    <button onClick={() => navigate('/events')} className="mt-3 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                        Tous les événements
                    </button>
                </div>
            </div>
        );
    }

    const soldOut = ticketTypes.every((t) => t.available <= 0 || t.onSale === false);

    return (
        <div className="min-h-screen bg-bg pb-8">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-bold text-ink truncate">{event.title}</h1>
            </div>

            {event.posterFileId && (
                <img src={posterUrl(event.posterFileId)} alt={event.title} className="w-full h-56 object-cover" />
            )}
            {event.videoFileId && (
                <video
                    src={sbcApiService.generateSettingsFileUrl(event.videoFileId)}
                    poster={event.posterFileId ? posterUrl(event.posterFileId) : undefined}
                    className="w-full max-h-96 bg-black"
                    controls
                    playsInline
                    preload="metadata"
                />
            )}

            <div className="px-4 pt-4 flex flex-col gap-4">
                <div>
                    <h2 className="text-xl font-bold text-ink text-balance">{event.title}</h2>
                    <p className="text-sm text-ink-2 mt-1">{fmtDate(event.startsAt)} · {fmtTime(event.startsAt)}</p>
                    <p className="text-sm text-ink-2">{event.venue} · {event.city}</p>
                    <p className="text-xs text-ink-3 mt-0.5">{event.address}</p>
                </div>

                {event.organizer?.displayName && (
                    <div className="flex items-center gap-2.5 bg-surface border border-border rounded-card p-3">
                        <span className="size-9 shrink-0 grid place-items-center rounded-pill bg-primary-soft text-primary overflow-hidden">
                            {event.organizer.logoFileId
                                ? <img src={sbcApiService.generateThumbnailUrl(event.organizer.logoFileId, 96)} alt="" className="size-full object-cover" />
                                : <HugeiconsIcon icon={UserGroupIcon} size={16} />}
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[11px] text-ink-2">Organisé par</span>
                            <span className="block text-sm font-semibold text-ink truncate">{event.organizer.displayName}</span>
                        </span>
                    </div>
                )}

                <p className="text-sm text-ink-2 whitespace-pre-wrap leading-relaxed text-pretty">{event.description}</p>

                <section className="flex flex-col gap-2">
                    <h3 className="text-base font-bold text-ink">Billets</h3>
                    {ticketTypes.length === 0 ? (
                        <p className="text-sm text-ink-2">Aucun billet en vente pour l'instant.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {ticketTypes.map((tt) => {
                                const closed = tt.onSale === false;
                                const empty = tt.available <= 0;
                                return (
                                    <li key={tt._id} className={cn(
                                        'bg-surface border rounded-card p-3 flex items-center justify-between gap-3',
                                        closed || empty ? 'border-border opacity-70' : 'border-border',
                                    )}>
                                        <div className="min-w-0">
                                            <p className="font-medium text-ink">{tt.name}</p>
                                            {tt.description && <p className="text-xs text-ink-2 mt-0.5">{tt.description}</p>}
                                            <p className="text-xs text-ink-2 mt-1">
                                                {empty ? 'Épuisé'
                                                    : closed ? (tt.salesStart && new Date(tt.salesStart) > new Date()
                                                        ? `Vente dès le ${new Date(tt.salesStart).toLocaleDateString('fr-FR')}`
                                                        : 'Vente terminée')
                                                        : `${tt.available} disponible${tt.available > 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-semibold text-primary">{xaf(tt.price)}</p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {resale.length > 0 && (
                    <section className="flex flex-col gap-2">
                        <h3 className="text-base font-bold text-ink flex items-center gap-2">
                            <HugeiconsIcon icon={Exchange01Icon} size={17} className="text-accent" />
                            Billets en revente
                        </h3>
                        <p className="text-xs text-ink-2 -mt-1">
                            Revendus par des membres SBC. Le billet est retiré au vendeur et un nouveau QR vous est délivré.
                        </p>
                        <ul className="flex flex-col gap-2">
                            {resale.map((l) => (
                                <li key={l._id} className="bg-surface border border-border rounded-card p-3 flex items-center justify-between gap-3">
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium text-ink truncate">{l.ticketType?.name || 'Billet'}</span>
                                        {typeof l.originalPrice === 'number' && l.originalPrice !== l.askingPrice && (
                                            <span className="block text-[11px] text-ink-3 line-through">{xaf(l.originalPrice)}</span>
                                        )}
                                    </span>
                                    <span className="shrink-0 font-semibold text-accent">{xaf(l.askingPrice)}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => navigate('/events/revente', { state: { eventId: event._id, eventTitle: event.title } })}
                            className="rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-ink"
                        >
                            Voir la marketplace
                        </button>
                    </section>
                )}

                <div className="flex flex-col gap-2 pt-1">
                    <button
                        onClick={() => navigate(`/events/${encodeURIComponent(event.slug)}/checkout`, { state: { event, ticketTypes } })}
                        disabled={soldOut}
                        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {soldOut ? 'Billets indisponibles' : 'Acheter un billet'}
                    </button>

                    {/* §24: the link must work from WhatsApp, Facebook and any browser. */}
                    <div className="grid grid-cols-3 gap-2">
                        <a
                            href={event.shareUrls?.whatsapp || `https://wa.me/?text=${encodeURIComponent(`${event.title} — ${shareLink}`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-ink"
                        >
                            <HugeiconsIcon icon={WhatsappIcon} size={16} className="text-whatsapp" />
                            WhatsApp
                        </a>
                        <a
                            href={event.shareUrls?.facebook || `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-ink"
                        >
                            <HugeiconsIcon icon={FacebookIcon} size={16} className="text-primary" />
                            Facebook
                        </a>
                        <button
                            onClick={nativeShare}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-ink"
                        >
                            <HugeiconsIcon icon={Copy01Icon} size={16} />
                            {copied ? 'Copié' : 'Partager'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
