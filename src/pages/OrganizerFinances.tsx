import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import { statusInfo, TONE_CLASS, xaf } from '../lib/eventStatus';

interface PerEvent {
    eventId: string;
    title: string;
    startsAt: string;
    status: string;
    gross: number;
    commission: number;
    net: number;
    credited: number;
    refunded: number;
    primaryOrders: number;
    refundedOrders: number;
    resaleGross: number;
    resaleCommission: number;
    resaleOrders: number;
}

interface Totals {
    gross: number;
    commission: number;
    net: number;
    credited: number;
    refunded: number;
    primaryOrders: number;
    refundedOrders: number;
    resaleGross: number;
    resaleCommission: number;
    resaleOrders: number;
}

/** A movement row, if the API ever starts returning one (§20). */
interface Movement {
    _id?: string;
    id?: string;
    type?: string;
    label?: string;
    description?: string;
    amount?: number;
    createdAt?: string;
    date?: string;
}

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
    <div className="bg-surface border border-border rounded-card p-3">
        <div className="text-xs text-ink-2">{label}</div>
        <div className="text-lg font-bold text-ink mt-1">{value}</div>
        {hint && <div className="text-[10px] text-ink-3 mt-0.5">{hint}</div>}
    </div>
);

const frDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function OrganizerFinances() {
    const navigate = useNavigate();
    const [totals, setTotals] = useState<Totals | null>(null);
    const [perEvent, setPerEvent] = useState<PerEvent[]>([]);
    const [movements, setMovements] = useState<Movement[] | null>(null);
    const [balance, setBalance] = useState<{ eventOrganizerBalance: number; minTransferAmount: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [transferring, setTransferring] = useState(false);
    const [transferAmount, setTransferAmount] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [fin, bal] = await Promise.all([
                sbcApiService.getOrganizerFinances(),
                sbcApiService.getEventOrganizerBalance(),
            ]);
            if (fin.apiReportedSuccess) {
                const data = fin.body?.data || {};
                setTotals(data.totals || null);
                setPerEvent(data.perEvent || []);
                // The endpoint returns per-event aggregates today. If a real
                // movement feed ever ships, it wins over the aggregate ledger.
                const feed = data.movements ?? data.history ?? data.transactions;
                setMovements(Array.isArray(feed) && feed.length > 0 ? feed : null);
            } else {
                setError(fin.message || 'Erreur');
            }
            if (bal.apiReportedSuccess) setBalance(bal.body?.data || null);
        } catch (e: any) { setError(e?.message || 'Erreur réseau'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    // Ledger order: most recent event first.
    const ledger = useMemo(
        () => [...perEvent].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
        [perEvent],
    );

    const doTransfer = async () => {
        const amt = parseInt(transferAmount, 10);
        if (!amt || amt < (balance?.minTransferAmount ?? 2000)) {
            setError(`Montant minimum : ${xaf(balance?.minTransferAmount ?? 2000)}.`);
            return;
        }
        setTransferring(true); setError(null);
        try {
            const res = await sbcApiService.transferEventOrganizerBalanceToMain(amt);
            if (res.apiReportedSuccess) {
                setTransferAmount('');
                await load();
            } else {
                setError(res.message || 'Transfert refusé.');
            }
        } catch (e: any) { setError(e?.message || 'Erreur réseau'); }
        finally { setTransferring(false); }
    };

    if (loading) return <div className="min-h-screen bg-bg p-8 text-center text-ink-2">Chargement...</div>;

    return (
        <div className="min-h-screen bg-bg">
            <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                <BackButton onClick={() => navigate('/events/organizer')} />
                <h1 className="text-lg font-semibold text-ink">Finances organisateur</h1>
            </div>

            <div className="p-4 space-y-4">
                {error && <div className="bg-danger-soft border border-border rounded-card p-3 text-sm text-danger">{error}</div>}

                {/* Solde disponible + transfert */}
                <div className="bg-success-soft border border-border rounded-card p-5">
                    <div className="text-xs uppercase text-ink-2 tracking-wide">Solde organisateur disponible</div>
                    <div className="text-2xl font-bold text-success mt-1">{xaf(balance?.eventOrganizerBalance ?? 0)}</div>
                    <div className="text-[11px] text-ink-2 mt-1">
                        Transfert minimum : {xaf(balance?.minTransferAmount ?? 2000)}. Une fois transféré, le montant est disponible pour retrait via votre solde principal.
                    </div>
                    <div className="mt-3 flex gap-2">
                        <input
                            type="number"
                            placeholder="Montant à transférer"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            className="flex-1 min-w-0 bg-surface border border-border rounded-tile px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-primary"
                        />
                        <button
                            onClick={doTransfer}
                            disabled={transferring || !balance?.eventOrganizerBalance}
                            className="shrink-0 bg-primary hover:bg-primary-hover text-white font-semibold rounded-tile px-4 py-2 text-sm transition-colors disabled:opacity-50"
                        >
                            {transferring ? '...' : 'Transférer'}
                        </button>
                    </div>
                </div>

                {/* Totals */}
                {totals && (
                    <div className="grid grid-cols-2 gap-3">
                        <Stat label="Chiffre d'affaires brut" value={xaf(totals.gross)} hint={`${totals.primaryOrders} commandes payées`} />
                        <Stat label="Commissions SBC" value={xaf(totals.commission)} hint="prélevées automatiquement" />
                        <Stat label="Net organisateur" value={xaf(totals.net)} />
                        <Stat label="Déjà crédité sur solde" value={xaf(totals.credited)} />
                        <Stat label="Remboursements traités" value={xaf(totals.refunded)} hint={`${totals.refundedOrders} commandes`} />
                        <Stat label="Ventes en revente" value={xaf(totals.resaleGross)} hint={`${totals.resaleOrders} reventes`} />
                    </div>
                )}

                {/* Mouvements */}
                <div>
                    <h2 className="text-base font-semibold text-ink mb-1">Historique des mouvements</h2>
                    <p className="text-xs text-ink-2 mb-2">
                        {movements
                            ? 'Du plus récent au plus ancien.'
                            : 'Récapitulatif par événement, du plus récent au plus ancien. Les transferts vers votre solde principal apparaissent, eux, dans l’historique de votre portefeuille.'}
                    </p>

                    {movements ? (
                        <div className="space-y-2">
                            {movements.map((m, i) => (
                                <div key={m._id || m.id || i} className="bg-surface border border-border rounded-card p-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-ink truncate">{m.label || m.description || m.type || 'Mouvement'}</div>
                                        <div className="text-xs text-ink-2">{frDate(m.createdAt || m.date)}</div>
                                    </div>
                                    <div className={`text-sm font-semibold shrink-0 ${(m.amount ?? 0) < 0 ? 'text-danger' : 'text-success'}`}>{xaf(m.amount)}</div>
                                </div>
                            ))}
                        </div>
                    ) : ledger.length === 0 ? (
                        <div className="bg-surface border border-border rounded-card p-6 text-center text-sm text-ink-2">Aucun mouvement pour l'instant.</div>
                    ) : (
                        <div className="space-y-2">
                            {ledger.map((ev) => {
                                const st = statusInfo('event', ev.status);
                                return (
                                    <div key={ev.eventId} className="bg-surface border border-border rounded-card p-3 text-sm">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <div className="font-medium text-ink truncate">{ev.title}</div>
                                                <div className="text-xs text-ink-2">{frDate(ev.startsAt)}</div>
                                            </div>
                                            <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <div className="text-ink-3">Brut</div>
                                                <div className="font-semibold text-ink">{xaf(ev.gross)}</div>
                                            </div>
                                            <div>
                                                <div className="text-ink-3">Commission</div>
                                                <div className="font-semibold text-ink">{xaf(ev.commission)}</div>
                                            </div>
                                            <div>
                                                <div className="text-ink-3">Net</div>
                                                <div className="font-semibold text-success">{xaf(ev.net)}</div>
                                            </div>
                                            {ev.refunded > 0 && (
                                                <>
                                                    <div>
                                                        <div className="text-ink-3">Remboursé</div>
                                                        <div className="font-semibold text-danger">{xaf(ev.refunded)}</div>
                                                    </div>
                                                    <div className="col-span-2 self-end text-[10px] text-ink-3">{ev.refundedOrders} commandes remboursées</div>
                                                </>
                                            )}
                                            {ev.resaleGross > 0 && (
                                                <div className="col-span-3 mt-1 pt-2 border-t border-border">
                                                    <div className="text-[10px] text-accent">Revente : {xaf(ev.resaleGross)} · commission {xaf(ev.resaleCommission)} · {ev.resaleOrders} transactions</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
