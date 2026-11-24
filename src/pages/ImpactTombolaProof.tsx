import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, SecurityCheckIcon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { dateTime } from '../components/impact/stages';
import { segmentsCanonical, sha256Hex, useTombolaProof } from '../hooks/useImpactTombola';
import type { ImpactTombolaProof } from '../types/impact';
import { sectionRise, sequence } from '../utils/motion';
import { cn } from '../lib/utils';

const card = 'bg-surface border border-border rounded-card p-4';
const short = (h: string | null | undefined) => (h ? `${h.slice(0, 10)}…` : '—');

type Check = 'checking' | 'ok' | 'bad' | 'unavailable';

/** Both checks, recomputed in this browser: sha256(graine) = empreinte, sha256(tranches) = empreinte des tickets. */
function useChecks(p: ImpactTombolaProof | undefined) {
  const [seed, setSeed] = useState<Check>('checking');
  const [segments, setSegments] = useState<Check>('checking');
  useEffect(() => {
    let stop = false;
    if (!p || p.status !== 'DONE' || !p.seed) return;
    if (!globalThis.crypto?.subtle) {
      setSeed('unavailable');
      setSegments('unavailable');
      return;
    }
    sha256Hex(p.seed).then((h) => { if (!stop) setSeed(h === p.seedCommitment ? 'ok' : 'bad'); }, () => !stop && setSeed('unavailable'));
    if (p.segments && p.segmentsHash) {
      sha256Hex(segmentsCanonical(p.segments)).then((h) => { if (!stop) setSegments(h === p.segmentsHash ? 'ok' : 'bad'); }, () => !stop && setSegments('unavailable'));
    } else {
      setSegments('unavailable');
    }
    return () => { stop = true; };
  }, [p]);
  return { seed, segments };
}

function CheckLine({ state, ok, label }: { state: Check; ok: string; label: string }) {
  return (
    <p className={cn('text-sm font-semibold rounded-tile px-3 py-2',
      state === 'ok' ? 'bg-success-soft text-success' : state === 'bad' ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-ink-2')}
    role="status" aria-label={label}>
      {state === 'ok' ? `${ok} ✓`
        : state === 'bad' ? `${ok.replace(' = ', ' ≠ ')} ✗ : la vérification échoue.`
          : state === 'unavailable' ? 'Ce navigateur ne peut pas faire le calcul : téléchargez la preuve pour la vérifier ailleurs.'
            : 'Vérification…'}
    </p>
  );
}

const download = (p: ImpactTombolaProof) => {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `preuve-tirage-${p.drawId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** « Vérifier le tirage »: everything needed to recompute the draw, and the commitment checked here. */
export default function ImpactTombolaProof() {
  const { drawId = '' } = useParams();
  const navigate = useNavigate();
  const proof = useTombolaProof(drawId);
  const p = proof.data;
  const checks = useChecks(p);

  let body;
  if (proof.isLoading) {
    body = <div aria-busy="true" aria-label="Chargement de la preuve"><Skeleton height="h-64" rounded="rounded-card" /></div>;
  } else if (proof.isError || !p) {
    body = (
      <div className="bg-danger-soft text-danger rounded-card p-4" role="alert">
        <p className="text-sm">{(proof.error as Error)?.message || 'Impossible de charger la preuve du tirage.'}</p>
      </div>
    );
  } else {
    const done = p.status === 'DONE';
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="proof-commitment">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={SecurityCheckIcon} size={20} className="text-primary" />
            <h2 id="proof-commitment" className="text-lg font-bold text-ink">Graine et empreinte</h2>
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-ink-2">Empreinte publiée le {dateTime(p.committedAt)}</dt>
              <dd className="font-mono text-xs text-ink bg-surface-2 rounded-tile px-3 py-2 break-all select-all" data-testid="proof-commitment">{p.seedCommitment}</dd>
            </div>
            {done && (
              <div>
                <dt className="text-ink-2">Graine révélée au tirage{p.drawnAt ? ` (${dateTime(p.drawnAt)})` : ''}</dt>
                <dd className="font-mono text-xs text-ink bg-surface-2 rounded-tile px-3 py-2 break-all select-all" data-testid="proof-seed">{p.seed}</dd>
              </div>
            )}
            {done && p.segmentsHash && (
              <div>
                <dt className="text-ink-2">Empreinte des tickets</dt>
                <dd className="font-mono text-xs text-ink bg-surface-2 rounded-tile px-3 py-2 break-all select-all" data-testid="proof-segments-hash">{p.segmentsHash}</dd>
              </div>
            )}
          </dl>
          {done ? (
            <>
              <CheckLine state={checks.seed} ok="sha256(graine) = empreinte" label="Vérification de la graine" />
              <CheckLine state={checks.segments} ok="sha256(tickets) = empreinte des tickets" label="Vérification des tickets" />
            </>
          ) : (
            <p className="text-sm text-ink-2">Le tirage n’a pas encore eu lieu : seule l’empreinte est publiée. La graine le sera au moment du tirage.</p>
          )}
          {!p.committedBeforeTicketsClosed && (
            <p className="text-sm text-ink bg-accent-soft rounded-tile px-3 py-2">
              L’empreinte a été fixée après la clôture des votes payants, quand les tickets étaient déjà connus.
            </p>
          )}
        </motion.section>

        {done && (
          <>
            <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="proof-method">
              <h2 id="proof-method" className="text-lg font-bold text-ink">La méthode</h2>
              <p className="text-sm text-ink-2">
                Chaque lot est tiré à partir de la graine, dans l’ordre des lots. Avec la graine, la liste des tickets et la méthode ci-dessous, n’importe qui peut
                recalculer les gagnants et trouver le même résultat.
              </p>
              {p.method && <p className="text-xs text-ink-2 bg-surface-2 rounded-tile px-3 py-2 whitespace-pre-line">{p.method}</p>}
            </motion.section>

            {!!p.winners?.length && (
              <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3 overflow-x-auto')} aria-labelledby="proof-winners">
                <h2 id="proof-winners" className="text-lg font-bold text-ink">Les gagnants tirés</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-ink-3 text-left">
                      <th scope="col" className="font-medium pb-1">Lot</th>
                      <th scope="col" className="font-medium pb-1">Ticket</th>
                      <th scope="col" className="font-medium pb-1">Détenteur</th>
                      <th scope="col" className="font-medium pb-1 text-right">Exclus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.winners.map((w) => (
                      <tr key={w.order} className="border-t border-border">
                        <td className="py-1.5 text-ink">{w.order}. {w.prizeLabel}</td>
                        <td className="py-1.5 tabular-nums">{w.ticketNumber ?? '—'}</td>
                        <td className="py-1.5 font-mono text-xs">{short(w.holderHash)}</td>
                        <td className="py-1.5 text-right tabular-nums">{p.exclusions?.find((x) => x.order === w.order)?.holderHashes.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.section>
            )}

            {!!p.segments?.length && (
              <motion.section variants={sectionRise} className={card} aria-labelledby="proof-segments">
                <details>
                  <summary id="proof-segments" className="text-sm font-semibold text-primary cursor-pointer select-none">
                    Voir les {p.segments.length.toLocaleString('fr-FR')} tranches de tickets
                  </summary>
                  {p.segmentsFormat && <p className="text-xs text-ink-3 mt-2">Format : {p.segmentsFormat}. Poids × {p.weightScale ?? 10000}.</p>}
                  <div className="mt-2 max-h-96 overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-ink-3 text-left">
                          <th scope="col" className="font-medium pb-1">Tickets</th>
                          <th scope="col" className="font-medium pb-1">Poids</th>
                          <th scope="col" className="font-medium pb-1">Détenteur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.segments.map((g) => (
                          <tr key={`${g.from}-${g.to}`} className="border-t border-border">
                            <td className="py-1 tabular-nums">{g.from === g.to ? g.from : `${g.from}–${g.to}`}</td>
                            <td className="py-1 tabular-nums">{g.weight}</td>
                            <td className="py-1 font-mono">{short(g.holderHash)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </motion.section>
            )}
          </>
        )}

        <motion.div variants={sectionRise}>
          <button type="button" onClick={() => download(p)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-pill py-3 text-sm font-semibold bg-surface text-ink border border-border hover:bg-surface-2">
            <HugeiconsIcon icon={Download01Icon} size={16} />
            Télécharger la preuve (JSON)
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 max-w-3xl mx-auto">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold text-ink">Vérifier le tirage</h1>
      </div>
      <div className="px-4 pb-10 max-w-3xl mx-auto">{body}</div>
    </div>
  );
}
