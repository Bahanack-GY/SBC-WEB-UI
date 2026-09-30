import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CrownIcon } from '@hugeicons/core-free-icons';
import { flag, cn } from '../../lib/utils';
import type { CountryStanding } from '../../types/api';

const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });

/** "CM" -> "Cameroun". Falls back to the raw code for anything Intl cannot name. */
export const countryName = (code: string) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

/**
 * Countries ranked by their affiliates' paid direct filleuls this month.
 * Each line is a button: choosing a country shows its own top 10 below.
 */
function CountryRanking({ countries, selected, onSelect }: {
  countries: CountryStanding[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const leaderCount = countries[0]?.referralCount ?? 0;

  return (
    <ul className="flex flex-col gap-2" aria-label="Classement des pays">
      {countries.map((c, i) => {
        const isLeader = c.rank === 1;
        const isSelected = c.country === selected;
        const pct = leaderCount > 0 ? Math.max(4, Math.round((c.referralCount / leaderCount) * 100)) : 0;

        return (
          <motion.li
            key={c.country}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.24) }}
          >
            <button
              type="button"
              onClick={() => onSelect(c.country)}
              aria-pressed={isSelected}
              className={cn(
                'w-full text-left rounded-card border p-3 flex items-center gap-3 transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                isLeader ? 'bg-primary-soft' : 'bg-surface',
                isSelected ? 'border-primary' : 'border-border',
              )}
            >
              <span
                className={cn(
                  'shrink-0 size-7 rounded-pill grid place-items-center text-xs font-bold tabular-nums',
                  isLeader ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2',
                )}
              >
                {isLeader ? <HugeiconsIcon icon={CrownIcon} size={14} /> : c.rank}
              </span>

              <span className="text-2xl leading-none shrink-0" aria-hidden>{flag(c.country)}</span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink truncate">{countryName(c.country)}</span>
                  <span className="text-sm font-bold text-ink shrink-0 tabular-nums">
                    {c.referralCount.toLocaleString('fr-FR')}
                    <span className="ml-1 text-[11px] font-normal text-ink-2">filleuls</span>
                  </span>
                </span>

                <span className="mt-1.5 block h-1.5 rounded-pill bg-surface-2 overflow-hidden">
                  <motion.span
                    className={cn('block h-full rounded-pill', isLeader ? 'bg-accent' : 'bg-primary')}
                    initial={{ width: reduceMotion ? `${pct}%` : 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.25, 1, 0.5, 1] }}
                  />
                </span>

                <span className="mt-1 block text-[11px] text-ink-2">
                  {c.affiliates.toLocaleString('fr-FR')} affilié{c.affiliates > 1 ? 's' : ''} classé{c.affiliates > 1 ? 's' : ''}
                </span>
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

/**
 * Country selector for "who is the best in that country". A horizontal chip
 * strip rather than a <select>: every ranked country stays visible with its
 * flag, one tap switches. The chosen chip scrolls itself into view.
 */
export function CountryPicker({ countries, selected, onSelect }: {
  countries: CountryStanding[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const strip = useRef<HTMLDivElement>(null);
  const chips = useRef(new Map<string, HTMLButtonElement>());

  // Centre the chosen chip by scrolling the STRIP only. scrollIntoView would also
  // scroll the page, and that second smooth scroll cancelled the page scroll a
  // tap in the country ranking starts — the board never came into view.
  useEffect(() => {
    const box = strip.current;
    const chip = selected ? chips.current.get(selected) : undefined;
    if (!box || !chip) return;
    box.scrollTo({
      left: chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [selected, reduceMotion]);

  return (
    <div ref={strip} role="radiogroup" aria-label="Choisir un pays" className="no-scrollbar relative -mx-4 px-4 flex gap-2 overflow-x-auto">
      {countries.map((c) => {
        const isSelected = c.country === selected;
        return (
          <button
            key={c.country}
            ref={(el) => {
              if (el) chips.current.set(c.country, el);
              else chips.current.delete(c.country);
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(c.country)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm whitespace-nowrap',
              'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isSelected
                ? 'bg-primary border-primary text-white font-semibold'
                : 'bg-surface border-border text-ink hover:bg-surface-2',
            )}
          >
            <span aria-hidden>{flag(c.country)}</span>
            {countryName(c.country)}
          </button>
        );
      })}
    </div>
  );
}

export default CountryRanking;
