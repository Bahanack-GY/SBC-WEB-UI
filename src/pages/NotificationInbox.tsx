import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon, CreditCardIcon, GiftIcon, Mail01Icon, Megaphone01Icon, MoneyReceive02Icon,
  Notification01Icon, Settings02Icon, Ticket01Icon, UserAdd01Icon,
} from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import { ConfirmSheet } from '../components/relance/ui/ConfirmSheet';
import { SwipeToDismiss } from '../components/common/SwipeToDismiss';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { inboxKeys } from '../hooks/useInbox';
import { headerDrop, pageFade } from '../utils/motion';

type Item = { _id: string; category: string; title: string; body: string; url?: string; readAt?: string; createdAt: string };
type Page = { items: Item[]; unread: number; hasMore: boolean };

const ICONS: Record<string, { icon: typeof Notification01Icon; tone: string }> = {
  money: { icon: MoneyReceive02Icon, tone: 'bg-success-soft text-success' },
  filleuls: { icon: UserAdd01Icon, tone: 'bg-primary-soft text-primary' },
  relance: { icon: Mail01Icon, tone: 'bg-primary-soft text-primary' },
  events: { icon: Ticket01Icon, tone: 'bg-accent-soft text-accent' },
  tombola: { icon: GiftIcon, tone: 'bg-accent-soft text-accent' },
  ads: { icon: Megaphone01Icon, tone: 'bg-accent-soft text-accent' },
  subscription: { icon: CreditCardIcon, tone: 'bg-primary-soft text-primary' },
};
const iconFor = (c: string) => ICONS[c] ?? { icon: Notification01Icon, tone: 'bg-surface-2 text-ink-2' };

const TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "à l'instant", "il y a 5 min", "il y a 2 h", then the time or the date. */
export function when(iso: string, now: Date = new Date()): string {
  const t = new Date(iso);
  const min = Math.floor((now.getTime() - t.getTime()) / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 6 * 60) return `il y a ${Math.floor(min / 60)} h`;
  if (dayStart(t) === dayStart(now)) return TIME.format(t);
  return DATE.format(t);
}

export function groupOf(iso: string, now: Date = new Date()): string {
  const days = Math.round((dayStart(now) - dayStart(new Date(iso))) / 86_400_000);
  return days <= 0 ? "Aujourd'hui" : days === 1 ? 'Hier' : 'Plus tôt';
}

/**
 * Every notification the member received (chat aside), newest first. Opening
 * the list clears the bell; what was new stays highlighted for this visit.
 */
export default function NotificationInbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const newThisVisit = useRef<Set<string> | null>(null);

  const list = useInfiniteQuery({
    queryKey: inboxKeys.list,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<Page> => handleApiResponse(await sbcApiService.inboxList(pageParam)),
    getNextPageParam: (last) => (last.hasMore ? last.items[last.items.length - 1]?.createdAt : undefined),
  });

  const items = useMemo(() => list.data?.pages.flatMap(p => p.items) ?? [], [list.data]);

  // The bell clears on opening; the items that were new keep their highlight.
  useEffect(() => {
    if (!list.data || newThisVisit.current) return;
    newThisVisit.current = new Set(items.filter(i => !i.readAt).map(i => i._id));
    if (newThisVisit.current.size === 0) return;
    sbcApiService.inboxMarkRead({ all: true })
      .then(() => queryClient.setQueryData(inboxKeys.unread, 0))
      .catch(() => undefined);
  }, [list.data, items, queryClient]);

  const setItems = (keep: (i: Item) => boolean) =>
    queryClient.setQueryData<InfiniteData<Page>>(inboxKeys.list, old => old && {
      ...old,
      pages: old.pages.map(p => ({ ...p, items: p.items.filter(keep) })),
    });

  const remove = async (id: string) => {
    setItems(i => i._id !== id);
    try { await sbcApiService.inboxDelete(id); } catch { list.refetch(); }
  };

  const clearAll = async () => {
    setBusy(true);
    try {
      handleApiResponse(await sbcApiService.inboxClear());
      setItems(() => false);
      queryClient.setQueryData(inboxKeys.unread, 0);
      setConfirmClear(false);
    } finally {
      setBusy(false);
    }
  };

  const open = (i: Item) => { if (i.url) navigate(i.url); };

  let lastGroup = '';

  return (
    <motion.div variants={pageFade} initial="hidden" animate="show" className="min-h-screen bg-bg pb-10">
      <motion.header variants={headerDrop} className="sticky top-0 z-20 bg-bg flex items-center gap-2 px-4 py-3">
        <BackButton />
        <h1 className="flex-1 text-lg font-semibold text-ink">Notifications</h1>
        {items.length > 0 && (
          <button onClick={() => setConfirmClear(true)} className="h-9 px-3 rounded-pill text-sm font-semibold text-danger hover:bg-danger-soft">
            Tout effacer
          </button>
        )}
        <button
          onClick={() => navigate('/notifications/reglages')}
          aria-label="Réglages des notifications"
          className="size-10 grid place-items-center rounded-pill text-ink-2 hover:bg-surface-2"
        >
          <HugeiconsIcon icon={Settings02Icon} size={22} />
        </button>
      </motion.header>

      <div className="px-4">
        {list.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-card bg-surface-2 animate-pulse" />)}
          </div>
        ) : list.isError ? (
          <div className="p-5 rounded-card bg-surface border border-border text-center">
            <p className="text-ink font-medium">Impossible de charger les notifications.</p>
            <button onClick={() => list.refetch()} className="mt-3 h-10 px-5 rounded-pill bg-primary text-white font-semibold">Réessayer</button>
          </div>
        ) : items.length === 0 ? (
          <div className="pt-16 text-center">
            <span className="mx-auto size-16 grid place-items-center rounded-pill bg-surface-2 text-ink-3">
              <HugeiconsIcon icon={Notification01Icon} size={30} />
            </span>
            <p className="mt-3 font-semibold text-ink">Aucune notification</p>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map(i => {
                const group = groupOf(i.createdAt);
                const heading = group !== lastGroup ? group : null;
                lastGroup = group;
                const isNew = !!newThisVisit.current?.has(i._id) || !i.readAt;
                const { icon, tone } = iconFor(i.category);
                return (
                  <motion.li
                    key={i._id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40, height: 0, marginTop: 0 }}
                  >
                    {heading && <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wide mt-4 mb-2">{heading}</h2>}
                    <SwipeToDismiss onDismiss={() => remove(i._id)}>
                    <div className={`flex items-start gap-3 p-3 rounded-card border ${isNew ? 'bg-primary-soft border-primary/20' : 'bg-surface border-border'}`}>
                      <button onClick={() => open(i)} className="flex-1 min-w-0 flex items-start gap-3 text-left">
                        <span className={`size-10 grid place-items-center rounded-pill shrink-0 ${tone}`}>
                          <HugeiconsIcon icon={icon} size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={`flex-1 min-w-0 truncate text-sm ${isNew ? 'font-bold' : 'font-semibold'} text-ink`}>{i.title}</span>
                            <span className="text-xs text-ink-3 shrink-0">{when(i.createdAt)}</span>
                          </span>
                          <span className="block text-sm text-ink-2 line-clamp-2">{i.body}</span>
                        </span>
                      </button>
                      <button
                        onClick={() => remove(i._id)}
                        aria-label={`Supprimer « ${i.title} »`}
                        className="size-7 grid place-items-center rounded-pill text-ink-3 hover:bg-surface-2 shrink-0"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={14} />
                      </button>
                    </div>
                    </SwipeToDismiss>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {list.hasNextPage && (
          <button
            onClick={() => list.fetchNextPage()}
            disabled={list.isFetchingNextPage}
            className="mt-4 w-full h-11 rounded-tile bg-surface border border-border text-sm font-semibold text-ink disabled:opacity-50"
          >
            {list.isFetchingNextPage ? 'Chargement…' : 'Voir plus'}
          </button>
        )}
      </div>

      <ConfirmSheet
        open={confirmClear}
        danger
        busy={busy}
        title="Effacer toutes les notifications ?"
        message="Elles disparaissent de cette liste."
        confirmLabel="Tout effacer"
        onConfirm={clearAll}
        onCancel={() => setConfirmClear(false)}
      />
    </motion.div>
  );
}
