import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, ShieldKeyIcon } from '@hugeicons/core-free-icons';
import { animationApi } from '../../services/animationApi';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import { errorMessage, fmtDateTime } from '../../lib/animation';
import { cn } from '../../lib/utils';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

const DRAW_STATUS: Record<string, string> = { SCHEDULED: 'Programmé', RUNNING: 'En cours', DONE: 'Effectué', CANCELLED: 'Annulé', FAILED: 'Échec' };

// ---------- verification, mirroring the server (lib/rules.ts drawWinners) ----------

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

/** Partial Fisher–Yates driven by HMAC-SHA256(seed, counter), rejection sampling. */
const drawWinners = async (sorted: string[], k: number, seed: string): Promise<string[]> => {
    const pool = [...sorted];
    const n = Math.min(k, pool.length);
    const key = await crypto.subtle.importKey('raw', enc.encode(seed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    let counter = 0;
    const nextUint32 = async () => new DataView(await crypto.subtle.sign('HMAC', key, enc.encode(String(counter++)))).getUint32(0, false);
    const randomBelow = async (bound: number) => {
        const limit = Math.floor(0x100000000 / bound) * bound;
        let x: number;
        do { x = await nextUint32(); } while (x >= limit);
        return x % bound;
    };
    for (let i = 0; i < n; i++) {
        const j = i + (await randomBelow(pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
};

interface Check { label: string; ok: boolean; detail?: string }

const Mark = ({ ok }: { ok: boolean }) => (
    <span className={cn('grid size-6 shrink-0 place-items-center rounded-pill text-sm font-bold text-white', ok ? 'bg-success' : 'bg-danger')} aria-label={ok ? 'Vérifié' : 'Échec'}>
        {ok ? '✓' : '✗'}
    </span>
);

const Field = ({ label, value, mono }: { label: string; value?: ReactNode; mono?: boolean }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-ink-2">{label}</span>
        <span className={cn('text-sm text-ink break-all', mono && 'font-mono text-xs')}>{value ?? '—'}</span>
    </div>
);

export default function DrawProof() {
    const { drawId = '' } = useParams<{ drawId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const myId: string | undefined = (user as any)?.id || (user as any)?._id || (typeof window !== 'undefined' ? localStorage.getItem('userId') || undefined : undefined);

    const [proof, setProof] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [checking, setChecking] = useState(false);
    const [checks, setChecks] = useState<Check[] | null>(null);
    const [winners, setWinners] = useState<{ position: number; hash: string; mine: boolean }[]>([]);
    const [mine, setMine] = useState<{ hash: string; entered: boolean; won?: number } | null>(null);
    const [checkError, setCheckError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await animationApi.drawProof(drawId);
                if (res.apiReportedSuccess) setProof(res.body.data);
                else setError(errText(res));
            } catch (e: any) {
                setError(e?.message || 'Erreur réseau.');
            } finally {
                setLoading(false);
            }
        })();
    }, [drawId]);

    const verify = async () => {
        if (!proof) return;
        if (!window.crypto?.subtle) { setCheckError('Votre navigateur ne permet pas la vérification (Web Crypto indisponible hors HTTPS).'); return; }
        setChecking(true);
        setCheckError(null);
        try {
            const entrants: string[] = proof.entrantHashes ?? [];
            const out: Check[] = [];
            if (proof.seed) {
                const h = await sha256(proof.seed);
                out.push({ label: 'La graine révélée correspond à l’engagement publié avant le tirage', ok: h === proof.seedCommitment, detail: `sha256(graine) = ${h}` });
            }
            const setHash = await sha256(entrants.join('\n'));
            out.push({ label: 'La liste des participants correspond à son empreinte', ok: setHash === proof.eligibleSetHash, detail: `sha256(liste) = ${setHash}` });
            out.push({ label: 'Nombre de participants', ok: entrants.length === proof.eligibleCount, detail: `${entrants.length} empreintes publiées, ${proof.eligibleCount ?? '—'} annoncées` });
            const sorted = entrants.every((h, i) => i === 0 || entrants[i - 1] <= h);
            out.push({ label: 'La liste est triée (ordre imposé, non choisi)', ok: sorted });

            const positions: number[] = proof.winnerPositions ?? [];
            // Recompute exactly as many as were requested; a slot whose winner
            // left the event stays empty, so positions can skip numbers.
            const k = proof.requestedWinners ?? (positions.length ? Math.max(...positions) : 0);
            const myHash = myId ? await sha256(`${myId}:${proof.drawId}`) : null;
            if (proof.seed && k > 0) {
                const picked = await drawWinners(entrants, k, proof.seed);
                const serverHashes: string[] = proof.winnerHashes ?? [];
                const same = serverHashes.length > 0 && positions.every((p, i) => picked[p - 1] === serverHashes[i]);
                out.push({
                    label: 'Les gagnants recalculés sont ceux désignés par SBC',
                    ok: serverHashes.length ? same : picked.length >= positions.length,
                    detail: `${positions.length} gagnant${positions.length > 1 ? 's' : ''} recalculé${positions.length > 1 ? 's' : ''}${serverHashes.length ? '' : ' (empreintes des gagnants non publiées)'}`,
                });
                setWinners(positions.map((p) => ({ position: p, hash: picked[p - 1], mine: Boolean(myHash && picked[p - 1] === myHash) })));
                if (myHash) {
                    const wonAt = positions.find((p) => picked[p - 1] === myHash);
                    setMine({ hash: myHash, entered: entrants.includes(myHash), won: wonAt });
                }
            } else if (myHash) {
                setMine({ hash: myHash, entered: entrants.includes(myHash) });
            }
            setChecks(out);
        } catch (e: any) {
            setCheckError(e?.message || 'La vérification a échoué.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Preuve de tirage</h1>
            </div>
            <div className="px-4 pb-8 flex flex-col gap-3">
                {loading ? (
                    <Skeleton height="h-64" rounded="rounded-card" />
                ) : error || !proof ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                        <p className="text-sm font-semibold text-ink">{error || 'Tirage introuvable.'}</p>
                    </div>
                ) : (
                    <>
                        <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] text-ink-2">Récompense</p>
                                    <p className="text-base font-bold text-ink">{proof.reward ?? '—'}</p>
                                </div>
                                <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold', proof.status === 'DONE' ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink-2')}>
                                    {DRAW_STATUS[proof.status] ?? proof.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Prévu le" value={fmtDateTime(proof.scheduledAt)} />
                                <Field label="Effectué le" value={proof.drawnAt ? fmtDateTime(proof.drawnAt) : '—'} />
                                <Field label="Participants éligibles" value={typeof proof.eligibleCount === 'number' ? proof.eligibleCount.toLocaleString('fr-FR') : '—'} />
                                <Field label="Positions gagnantes" value={proof.winnerPositions?.length ? proof.winnerPositions.join(', ') : '—'} />
                            </div>
                            <Field label="Engagement de la graine (publié avant le tirage)" value={proof.seedCommitment} mono />
                            <Field label="Graine révélée" value={proof.seed ?? 'Révélée après le tirage'} mono />
                            <Field label="Empreinte de la liste des participants" value={proof.eligibleSetHash} mono />
                            {proof.method && <p className="text-xs text-ink-2 bg-surface-2 rounded-tile p-2.5">{proof.method}</p>}
                        </section>

                        {proof.status === 'DONE' ? (
                            <button
                                onClick={verify}
                                disabled={checking}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
                            >
                                <HugeiconsIcon icon={ShieldKeyIcon} size={16} />
                                {checking ? 'Vérification…' : 'Vérifier dans mon navigateur'}
                            </button>
                        ) : (
                            <p className="bg-accent-soft rounded-card p-3 text-sm text-ink">
                                La graine est révélée une fois le tirage effectué : vous pourrez alors vérifier le résultat ici.
                            </p>
                        )}
                        {checkError && <p role="alert" className="bg-danger-soft rounded-card p-3 text-sm text-danger">{checkError}</p>}

                        {checks && (
                            <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3" aria-live="polite">
                                <h2 className="text-base font-bold text-ink">Résultat de la vérification</h2>
                                <ul className="flex flex-col gap-2.5">
                                    {checks.map((c) => (
                                        <li key={c.label} className="flex items-start gap-2.5">
                                            <Mark ok={c.ok} />
                                            <span className="min-w-0">
                                                <span className="block text-sm text-ink">{c.label}</span>
                                                {c.detail && <span className="block text-[11px] text-ink-3 font-mono break-all">{c.detail}</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {winners.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <p className="text-xs font-semibold text-ink">Empreintes gagnantes recalculées</p>
                                        <ul className="flex flex-col gap-1">
                                            {winners.map((w) => (
                                                <li key={w.position} className={cn('rounded-tile px-2.5 py-1.5 text-[11px] font-mono break-all', w.mine ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink-2')}>
                                                    #{w.position} · {w.hash ?? '—'}{w.mine ? ' (vous)' : ''}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {mine && (
                                    <p className={cn('rounded-tile p-2.5 text-sm', mine.won ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink-2')}>
                                        {mine.won
                                            ? `Vous avez gagné (position ${mine.won}).`
                                            : mine.entered
                                                ? 'Vous faisiez partie des participants à ce tirage.'
                                                : 'Votre compte ne figure pas parmi les participants à ce tirage.'}
                                        <span className="block text-[11px] font-mono break-all opacity-80 mt-0.5">Votre empreinte : {mine.hash}</span>
                                    </p>
                                )}
                                <p className="text-[11px] text-ink-3">
                                    Chaque participant est représenté par sha256(identifiant:tirage) : la liste est publique sans révéler qui y figure.
                                </p>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
