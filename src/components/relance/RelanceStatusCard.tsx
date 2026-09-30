import { AnimatePresence, motion } from 'motion/react';
import { Switch } from './ui/Switch';
import { CountUp } from './ui/CountUp';
import type { RelanceState } from '../../utils/relance';

const COPY: Record<RelanceState, { title: string; body: string; tone: string; dot: string }> = {
  running: {
    title: 'Relance en marche',
    body: '',
    tone: 'bg-success-soft border-success/30',
    dot: 'bg-success-dot',
  },
  paused: {
    title: 'Relance en pause',
    body: '',
    tone: 'bg-surface-2 border-border',
    dot: 'bg-ink-3',
  },
  no_credits: {
    title: 'Plus de crédits',
    body: '',
    tone: 'bg-accent-soft border-accent/30',
    dot: 'bg-accent',
  },
  daily_limit: {
    title: 'Limite du jour atteinte',
    body: 'Reprise demain.',
    tone: 'bg-primary-soft border-primary/30',
    dot: 'bg-primary',
  },
};

/**
 * The single answer to "is anything being sent right now?". The old page had
 * six overlapping ways to stop things (activer, pause ajout, pause envoi, pause
 * par canal, pause et annuler de campagne) and no line that said what was
 * actually happening. Here there is one switch and one title.
 */
export function RelanceStatusCard({
  state, on, busy, onToggle, sentToday, maxPerDay, onRecharge, onChangeLimit,
}: {
  state: RelanceState;
  on: boolean;
  busy?: boolean;
  onToggle: (next: boolean) => void;
  sentToday: number;
  maxPerDay: number;
  onRecharge: () => void;
  onChangeLimit: () => void;
}) {
  const c = COPY[state];
  const share = Math.min(1, maxPerDay > 0 ? sentToday / maxPerDay : 0);

  return (
    <motion.section
      layout
      aria-label="État de la relance"
      className={`border rounded-card p-4 transition-colors ${c.tone}`}
    >
      <div className="flex items-start gap-3">
        <span className="relative mt-1.5 grid place-items-center size-3 shrink-0" aria-hidden>
          {state === 'running' && (
            <motion.span
              className="absolute inset-0 rounded-pill bg-success-dot"
              animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <span className={`relative size-3 rounded-pill ${c.dot}`} />
        </span>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="font-semibold text-ink" data-testid="relance-state">{c.title}</h2>
              {c.body && <p className="text-sm text-ink-2 mt-0.5">{c.body}</p>}
            </motion.div>
          </AnimatePresence>
        </div>

        <Switch checked={on} onChange={onToggle} disabled={busy} label="Relance des nouveaux" />
      </div>

      {(state === 'running' || state === 'daily_limit') && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs text-ink-2">
            <span>Envoyés aujourd'hui</span>
            <button onClick={onChangeLimit} className="text-ink font-semibold underline-offset-2 hover:underline">
              <CountUp value={sentToday} /> / {maxPerDay}
            </button>
          </div>
          <div className="mt-1.5 h-2 rounded-pill bg-surface/70 overflow-hidden">
            <motion.div
              className={`h-full rounded-pill ${state === 'daily_limit' ? 'bg-primary' : 'bg-success'}`}
              initial={{ width: 0 }}
              animate={{ width: `${share * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      )}

      {state === 'no_credits' && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onRecharge}
          className="mt-4 w-full h-11 rounded-tile bg-accent text-white font-semibold"
        >
          Recharger mes crédits
        </motion.button>
      )}
    </motion.section>
  );
}
