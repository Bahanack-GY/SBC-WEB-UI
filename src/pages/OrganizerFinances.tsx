import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

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

const xaf = (n: number) => (n || 0).toLocaleString('fr-FR') + ' XAF';

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
    <div className="bg-gray-50 rounded-xl p-3">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold mt-1">{value}</div>
        {hint && <div className="text-[10px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
);

export default function OrganizerFinances() {
    const navigate = useNavigate();
    const [totals, setTotals] = useState<Totals | null>(null);
    const [perEvent, setPerEvent] = useState<PerEvent[]>([]);
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
                setTotals(fin.body?.data?.totals || null);
                setPerEvent(fin.body?.data?.perEvent || []);
            } else {
                setError(fin.message || 'Erreur');
            }
            if (bal.apiReportedSuccess) setBalance(bal.body?.data || null);
        } catch (e: any) { setError(e?.message || 'Erreur réseau'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const doTransfer = async () => {
        const amt = parseInt(transferAmount, 10);
        if (!amt || amt < (balance?.minTransferAmount ?? 2000)) {
            setError(`Montant minimum : ${(balance?.minTransferAmount ?? 2000).toLocaleString('fr-FR')} XAF.`);
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

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate('/events/organizer')} />
                <h1 className="text-lg font-semibold">Finances organisateur</h1>
            </div>

            <div className="p-4 space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

                {/* Solde disponible + transfert */}
                <div className="bg-gradient-to-br from-[#115CF6] to-[#2C7BE5] text-white rounded-2xl p-5">
                    <div className="text-xs uppercase opacity-80">Solde organisateur disponible</div>
                    <div className="text-2xl font-bold mt-1">{xaf(balance?.eventOrganizerBalance ?? 0)}</div>
                    <div className="text-[11px] opacity-70 mt-1">
                        Transfert minimum : {xaf(balance?.minTransferAmount ?? 2000)}. Une fois transféré, le montant est disponible pour retrait via votre solde principal.
                    </div>
                    <div className="mt-3 flex gap-2">
                        <input
                            type="number"
                            placeholder="Montant à transférer"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            className="flex-1 bg-white/95 text-gray-900 rounded-xl px-3 py-2 text-sm"
                        />
                        <button
                            onClick={doTransfer}
                            disabled={transferring || !balance?.eventOrganizerBalance}
                            className="bg-white text-[#115CF6] font-semibold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
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

                {/* Per-event */}
                <div>
                    <h2 className="text-base font-semibold mb-2">Détails par événement</h2>
                    {perEvent.length === 0 ? (
                        <div className="text-sm text-gray-500">Aucun événement.</div>
                    ) : (
                        <div className="space-y-2">
                            {perEvent.map((ev) => (
                                <div key={ev.eventId} className="border border-gray-200 rounded-xl p-3 text-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium">{ev.title}</div>
                                            <div className="text-xs text-gray-500">{new Date(ev.startsAt).toLocaleDateString('fr-FR')}</div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{ev.status}</span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <div className="text-gray-500">Brut</div>
                                            <div className="font-semibold">{xaf(ev.gross)}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">Commission</div>
                                            <div className="font-semibold">{xaf(ev.commission)}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">Net</div>
                                            <div className="font-semibold text-[#115CF6]">{xaf(ev.net)}</div>
                                        </div>
                                        {ev.refunded > 0 && (
                                            <>
                                                <div>
                                                    <div className="text-gray-500">Remboursé</div>
                                                    <div className="font-semibold text-red-600">{xaf(ev.refunded)}</div>
                                                </div>
                                                <div className="col-span-2 text-[10px] text-gray-400">{ev.refundedOrders} commandes remboursées</div>
                                            </>
                                        )}
                                        {ev.resaleGross > 0 && (
                                            <div className="col-span-3 mt-1 pt-2 border-t border-gray-100">
                                                <div className="text-[10px] text-purple-700">Revente : {xaf(ev.resaleGross)} · commission {xaf(ev.resaleCommission)} · {ev.resaleOrders} transactions</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
