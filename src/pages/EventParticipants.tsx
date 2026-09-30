import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Cancel01Icon, Download01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { ticketStatusInfo, TONE_CLASS, xaf } from '../lib/eventStatus';

const PAGE = 50;

interface Participant {
    _id: string;
    serial: string;
    holderName: string;
    holderPhone: string;
    holderEmail?: string;
    ticketTypeId: string;
    status: string;
    resaleListingId?: string;
    checkedInAt?: string;
    createdAt: string;
}

const frDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="text-[11px] text-ink-3">{label}</div>
            <div className="text-sm text-ink truncate">{children}</div>
        </div>
    );
}

export default function EventParticipants() {
    const { id: eventId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    const [items, setItems] = useState<Participant[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // The participants endpoint returns raw tickets: the billet type name and
    // its price come from the event's ticket types, joined here by id.
    // ponytail: the price shown is the ticket type's current price; the API
    // exposes no per-ticket amount (a resale may have been paid differently).
    const [types, setTypes] = useState<Record<string, { name: string; price: number }>>({});

    // Debounced search — 350 ms after the last keystroke.
    useEffect(() => {
        const t = setTimeout(() => setQ(input.trim()), 350);
        return () => clearTimeout(t);
    }, [input]);

    useEffect(() => {
        if (!eventId) return;
        sbcApiService.listEventTicketTypes(eventId).then((r) => {
            if (!r.apiReportedSuccess) return;
            const map: Record<string, { name: string; price: number }> = {};
            for (const tt of r.body?.data || []) map[tt._id] = { name: tt.name, price: tt.price };
            setTypes(map);
        }).catch(() => undefined);
    }, [eventId]);

    useEffect(() => {
        if (!eventId) return;
        let cancelled = false;
        setLoading(true); setError(null);
        sbcApiService.listEventParticipants(eventId, { q: q || undefined, limit: PAGE, skip: 0 })
            .then((r) => {
                if (cancelled) return;
                if (r.apiReportedSuccess) {
                    setItems(r.body?.data?.items || []);
                    setTotal(r.body?.data?.total || 0);
                } else setError(r.message || 'Impossible de charger les participants.');
            })
            .catch((e: any) => { if (!cancelled) setError(e?.message || 'Erreur réseau.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [eventId, q]);

    const loadMore = async () => {
        if (!eventId) return;
        setLoadingMore(true);
        try {
            const r = await sbcApiService.listEventParticipants(eventId, { q: q || undefined, limit: PAGE, skip: items.length });
            if (r.apiReportedSuccess) setItems((prev) => [...prev, ...(r.body?.data?.items || [])]);
        } finally { setLoadingMore(false); }
    };

    const checkedIn = useMemo(() => items.filter((p) => p.checkedInAt).length, [items]);

    return (
        <div className="min-h-screen bg-bg">
            <div className="bg-surface border-b border-border p-4 flex items-center gap-3">
                <BackButton onClick={() => navigate(`/events/organizer/${eventId}`)} />
                <h1 className="text-lg font-semibold text-ink">Participants</h1>
            </div>

            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-pill px-3 py-2">
                        <HugeiconsIcon icon={Search01Icon} size={18} className="text-ink-3 shrink-0" />
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Nom, téléphone ou n° de billet"
                            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none"
                        />
                        {input && (
                            <button onClick={() => setInput('')} aria-label="Effacer la recherche" className="text-ink-3 shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} size={16} />
                            </button>
                        )}
                    </div>
                    {eventId && (
                        <a
                            href={sbcApiService.getEventParticipantsCsvUrl(eventId)}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 inline-flex items-center gap-1.5 bg-surface border border-border rounded-pill px-3 py-2 text-sm font-medium text-ink-2"
                        >
                            <HugeiconsIcon icon={Download01Icon} size={16} />
                            CSV
                        </a>
                    )}
                </div>

                {!loading && !error && items.length > 0 && (
                    <div className="text-xs text-ink-2">
                        {total} participant{total > 1 ? 's' : ''} · {checkedIn} entré{checkedIn > 1 ? 's' : ''} sur les {items.length} affichés
                    </div>
                )}

                {loading && (
                    <div className="space-y-2">
                        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height="h-28" rounded="rounded-card" />)}
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-danger-soft border border-border rounded-card p-4 text-sm text-danger">
                        {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="bg-surface border border-border rounded-card p-8 text-center">
                        <span className="mx-auto size-12 grid place-items-center rounded-pill bg-surface-2 text-ink-3">
                            <HugeiconsIcon icon={UserGroupIcon} size={24} />
                        </span>
                        <p className="mt-3 text-sm text-ink-2">
                            {q ? 'Aucun participant ne correspond à cette recherche.' : 'Aucun billet vendu pour l’instant.'}
                        </p>
                    </div>
                )}

                {!loading && !error && items.map((p) => {
                    const st = ticketStatusInfo(p.status, Boolean(p.resaleListingId));
                    const type = types[p.ticketTypeId];
                    const entered = Boolean(p.checkedInAt);
                    return (
                        <div key={p._id} className="bg-surface border border-border rounded-card p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-ink truncate">{p.holderName}</div>
                                    <div className="text-xs text-ink-2">{p.holderPhone}</div>
                                </div>
                                <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[st.tone]}`}>
                                    {st.label}
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                                <Field label="Type de billet">{type?.name ?? '—'}</Field>
                                <Field label="Montant payé">{xaf(type?.price)}</Field>
                                <Field label="Date d’achat">{frDate(p.createdAt)}</Field>
                                <Field label="N° de billet">{p.serial}</Field>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                                <span className={`rounded-pill px-2 py-0.5 text-[11px] font-semibold ${entered ? TONE_CLASS.success : TONE_CLASS.muted}`}>
                                    {entered ? 'Entré' : 'Pas encore entré'}
                                </span>
                                {entered && <span className="text-[11px] text-ink-3">le {frDate(p.checkedInAt)}</span>}
                            </div>
                        </div>
                    );
                })}

                {!loading && !error && items.length < total && (
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full bg-surface border border-border rounded-card py-3 text-sm font-medium text-ink-2"
                    >
                        {loadingMore ? 'Chargement…' : `Afficher plus (${total - items.length} restants)`}
                    </button>
                )}
            </div>
        </div>
    );
}
