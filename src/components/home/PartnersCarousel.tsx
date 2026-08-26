import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkSquare01Icon, MagicWand01Icon } from '@hugeicons/core-free-icons';
import { cn } from '../../lib/utils';

interface Partner {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
}

/**
 * ponytail: static array. There is no partners endpoint — settings-service has
 * no such collection — and inventing an admin CRUD for one promo card is exactly
 * the speculative work to avoid. Wire this to an endpoint when one exists.
 */
const PARTNERS: Partner[] = [
  {
    id: 'formation-ia',
    title: 'Formation IA 2025',
    subtitle: 'Devenez Expert Certifié',
    cta: "S'inscrire",
    href: 'https://sniperbuisnesscenter.com',
  },
];

function PartnersCarousel() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // ponytail: scroll position -> dot index. Native CSS scroll-snap gives correct
  // momentum on mobile for free; a carousel library would add ~15kB to do less.
  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (!PARTNERS.length) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Nos partenaires</h2>
          <span className="bg-accent-soft text-accent text-[10px] font-semibold px-2 py-0.5 rounded-pill">
            Publicité
          </span>
        </div>
        {PARTNERS.length > 1 && (
          <div className="flex gap-1" aria-hidden>
            {PARTNERS.map((p, i) => (
              <span
                key={p.id}
                className={cn(
                  'h-1.5 rounded-pill transition-all',
                  i === active ? 'w-4 bg-primary' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}"
      >
        {PARTNERS.map((p) => (
          <article
            key={p.id}
            className="snap-center shrink-0 w-full bg-accent text-white rounded-card p-4 flex items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-bold truncate">{p.title}</h3>
              <p className="text-sm text-white/90 truncate">{p.subtitle}</p>
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 bg-white text-accent text-sm font-semibold rounded-pill px-3 py-1.5"
              >
                {p.cta}
                <HugeiconsIcon icon={LinkSquare01Icon} size={14} />
              </a>
            </div>
            <span className="shrink-0 size-12 grid place-items-center rounded-tile bg-white/15">
              <HugeiconsIcon icon={MagicWand01Icon} size={24} />
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PartnersCarousel;
