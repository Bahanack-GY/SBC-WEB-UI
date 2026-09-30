import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Exchange01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { xaf } from '../lib/eventStatus';

interface ListingRow {
    _id: string;
    askingPrice: number;
    originalPrice: number;
    event?: { _id: string; title: string; startsAt: string; venue: string; city: string; posterFileId?: string };
    ticketType?: { name: string };
}

const posterUrl = (fileId?: string) => fileId ? sbcApiService.generateThumbnailUrl(fileId, 512) : '';
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function ResaleMarket() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    // EventDetail sends people here already filtered to one event (§4).
    const focus = (location.state ?? {}) as { eventId?: string; eventTitle?: string };
    const [eventId, setEventId] = useState<string | undefined>(focus.eventId);
    const [items, setItems] = useState<ListingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [buyingId, setBuyingId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        (async () => {
            try {
                const res = await sbcApiService.listPublicResale({ eventId, limit: 30 });
                if (res.apiReportedSuccess) setItems(res.body?.data?.items || []);
                else setError(res.message || 'Impossible de charger la marketplace.');
            } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
            finally { setLoading(false); }
        })();
    }, [eventId]);

    const buy = async (listing: ListingRow) => {
        if (!user) { setError('Connectez-vous pour acheter un billet.'); return; }
        setBuyingId(listing._id); setError(null);
        try {
            const res = await sbcApiService.buyResaleListing(listing._id, {
                firstName: user.name?.split(' ')[0] || 'Client',
                lastName: user.name?.split(' ').slice(1).join(' ') || 'SBC',
                phone: user.phoneNumber || '',
                email: user.email,
            });
            const sessionId = res.body?.data?.paymentSessionId;
            const orderId = res.body?.data?.orderId;
            if (!res.apiReportedSuccess || !sessionId) {
                setError(res.message || 'Impossible de démarrer le paiement.');
                setBuyingId(null);
                return;
            }
            window.open(sbcApiService.generatePaymentUrl(sessionId), '_blank', 'noopener,noreferrer');
            if (orderId) navigate(`/events/commande/${orderId}`, { state: { eventTitle: listing.event?.title } });
            else navigate('/events/mes-billets');
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); setBuyingId(null); }
    };

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <div className="min-w-0">
                    <h1 className="text-xl font-bold text-ink">Billets en revente</h1>
                    <p className="text-xs text-ink-2">Revendus par des membres, sécurisés par SBC</p>
                </div>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-3">
                {eventId && (
                    <button
                        onClick={() => setEventId(undefined)}
                        className="self-start inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
                    >
                        {focus.eventTitle || 'Événement filtré'}
                        <HugeiconsIcon icon={Cancel01Icon} size={13} />
                    </button>
                )}

                {error && <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">{error}</p>}

                {loading ? (
                    <div className="flex flex-col gap-3">
                        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height="h-56" rounded="rounded-card" />)}
                    </div>
                ) : items.length === 0 ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={Exchange01Icon} size={30} className="text-ink-3" />
                        <p className="text-sm font-semibold text-ink">Aucun billet en revente</p>
                        <p className="text-xs text-ink-2">Les billets remis en vente par des membres apparaîtront ici.</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {items.map((l) => {
                            const cheaper = l.originalPrice > l.askingPrice;
                            return (
                                <li key={l._id} className="bg-surface border border-border rounded-card overflow-hidden">
                                    {l.event?.posterFileId && (
                                        <img src={posterUrl(l.event.posterFileId)} alt="" aria-hidden loading="lazy" className="w-full h-40 object-cover" />
                                    )}
                                    <div className="p-4">
                                        <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-ink">
                                            <HugeiconsIcon icon={Exchange01Icon} size={11} className="text-accent" />
                                            Revente
                                        </span>
                                        <p className="font-semibold text-ink mt-1.5">{l.event?.title || '—'}</p>
                                        <p className="text-xs text-ink-2 mt-0.5">{l.event?.startsAt && fmt(l.event.startsAt)}</p>
                                        <p className="text-xs text-ink-2">{l.event?.venue} · {l.event?.city}</p>
                                        <p className="text-xs text-ink-2 mt-2">{l.ticketType?.name || 'Billet'}</p>

                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-lg font-bold text-primary tabular-nums">{xaf(l.askingPrice)}</span>
                                            {l.originalPrice !== l.askingPrice && (
                                                <span className="text-xs text-ink-3 line-through tabular-nums">{xaf(l.originalPrice)}</span>
                                            )}
                                            {cheaper && (
                                                <span className="rounded-pill bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-success">
                                                    Moins cher
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => buy(l)}
                                            disabled={buyingId === l._id}
                                            className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
                                        >
                                            {buyingId === l._id ? 'Ouverture du paiement…' : 'Acheter ce billet'}
                                        </button>
                                        <p className="mt-2 text-[11px] text-ink-3 text-center">
                                            Un nouveau billet et un nouveau QR vous sont délivrés après paiement.
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
