import { motion } from 'motion/react';
import { listContainer, listItem } from '../../utils/motion';
import { dayLabel, nextMessageLabel, RELANCE_DAYS } from '../../utils/relance';

export interface FilleulRow {
  _id: string;
  currentDay: number;
  nextMessageDue?: string;
  referralUser?: { name?: string; email?: string } | null;
}

const initial = (name?: string) => (name?.trim()?.[0] ?? '?').toUpperCase();

/**
 * Who is being relancé right now and where each one is. The old list showed
 * "Filleul #a1b2c3" — six characters of a database id — whenever a name was
 * missing. A filleul with no name here is just "Filleul".
 */
export function RelanceFilleulList({ filleuls, total, onSeeAll }: { filleuls: FilleulRow[]; total: number; onSeeAll?: () => void }) {
  return (
    <section aria-label="Vos filleuls en cours" className="bg-surface border border-border rounded-card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-semibold text-ink">Vos filleuls en cours</h2>
        {onSeeAll && total > filleuls.length && (
          <button onClick={onSeeAll} className="text-sm text-primary font-semibold">Tout voir ({total})</button>
        )}
      </div>

      {filleuls.length === 0 ? (
        <p className="text-sm text-ink-3 py-4">
          Personne pour l'instant. Dès qu'un filleul s'inscrit avec votre lien sans payer, il apparaît ici.
        </p>
      ) : (
        <motion.ul variants={listContainer} initial="hidden" animate="show" className="divide-y divide-border">
          {filleuls.map(f => {
            const name = f.referralUser?.name?.trim() || 'Filleul';
            const next = nextMessageLabel(f.nextMessageDue);
            return (
              <motion.li key={f._id} variants={listItem} className="flex items-center gap-3 py-3">
                <span className="size-9 grid place-items-center rounded-pill bg-primary-soft text-primary font-semibold shrink-0">
                  {initial(name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{name}</div>
                  <div className="text-xs text-ink-3">{dayLabel(f.currentDay)}{next ? ` · ${next}` : ''}</div>
                </div>
                <div className="flex gap-0.5 shrink-0" aria-label={dayLabel(f.currentDay)}>
                  {Array.from({ length: RELANCE_DAYS }, (_, i) => (
                    <span key={i} className={`h-4 w-1.5 rounded-pill ${i < f.currentDay ? 'bg-primary' : 'bg-surface-2'}`} />
                  ))}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </section>
  );
}
