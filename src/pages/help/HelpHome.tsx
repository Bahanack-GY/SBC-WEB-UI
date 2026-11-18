import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    AiChat02Icon, ArrowLeft01Icon, ArrowRight01Icon, BookOpen01Icon, CreditCardIcon, CustomerSupportIcon,
    Mail01Icon, MessageQuestionIcon, Search01Icon, Ticket01Icon, Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import {
    asList, guideTarget, isTicketClosed, unwrap,
    type ArticleRef, type GuideNode, type KbCategory, type Ticket,
} from './support';
import { Card, HelpPage, RichText, RowLink } from './ui';
import { inputCls, primaryBtn, secondaryBtn } from './styles';
import { useSupportLive } from './realtime';

/** The paths most members need, shown first whatever the help centre holds. */
const PATHS = [
    { to: '/aide/activation', icon: CreditCardIcon, tint: 'bg-accent-soft text-accent', title: 'Mon compte n’est pas activé', subtitle: 'J’ai payé mais mon compte n’est pas ouvert' },
    { to: '/aide/retraits', icon: Wallet01Icon, tint: 'bg-success-soft text-success', title: 'Mon retrait est bloqué', subtitle: 'Voir où en est chaque retrait' },
    { to: '/aide/contact', icon: Mail01Icon, tint: 'bg-primary-soft text-primary', title: 'Changer mon email ou mon téléphone', subtitle: 'Ou je n’y ai plus accès' },
    { to: '/aide/assistant', icon: AiChat02Icon, tint: 'bg-primary-soft text-primary', title: 'J’ai une autre question', subtitle: 'L’assistant vous répond tout de suite' },
];

function useDebounced<T>(value: T, ms: number) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

/**
 * « Aide » home: search the help centre, the common problems, the member's
 * own requests and the guided FAQ. Reachable without an active pack.
 */
export default function HelpHome() {
    useSupportLive(); // the open-requests count follows live updates
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const term = useDebounced(q.trim(), 300);

    const search = useQuery({
        queryKey: ['support', 'kb-search', term],
        queryFn: async () => asList<ArticleRef>(unwrap(await sbcApiService.supportKbSearch(term)), 'articles'),
        enabled: term.length >= 2,
        staleTime: 60_000,
    });
    const tickets = useQuery({
        queryKey: ['support', 'tickets'],
        queryFn: async () => asList<Ticket>(unwrap(await sbcApiService.supportTickets()), 'tickets'),
    });
    const guides = useQuery({
        queryKey: ['support', 'guides'],
        queryFn: async () => asList<GuideNode>(unwrap(await sbcApiService.supportGuides()), 'guides', 'nodes'),
        staleTime: 10 * 60_000,
    });
    const categories = useQuery({
        queryKey: ['support', 'kb-categories'],
        queryFn: async () => asList<KbCategory>(unwrap(await sbcApiService.supportKbCategories()), 'categories'),
        staleTime: 10 * 60_000,
    });

    const openCount = (tickets.data ?? []).filter((t) => !isTicketClosed(t.status)).length;
    const askAssistant = () => navigate(`/aide/assistant${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
    const categoriesWithArticles = (categories.data ?? []).filter((c) => (c.articles?.length ?? 0) > 0);

    return (
        <HelpPage title="Aide" back="/">
            <form role="search" onSubmit={(e) => { e.preventDefault(); askAssistant(); }}>
                <label htmlFor="help-search" className="sr-only">Rechercher dans l’aide</label>
                <div className="relative">
                    <HugeiconsIcon icon={Search01Icon} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                    <input
                        id="help-search"
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Rechercher : activation, retrait, parrainage…"
                        className={`${inputCls} h-12 pl-10`}
                        autoComplete="off"
                        enterKeyHint="search"
                    />
                </div>
            </form>

            {term.length >= 2 && (
                <section aria-label="Résultats de la recherche" aria-live="polite" className="space-y-2">
                    {search.isLoading ? (
                        <p className="text-sm text-ink-3">Recherche…</p>
                    ) : (search.data ?? []).length === 0 ? (
                        <p className="text-sm text-ink-2">{search.isError ? 'La recherche ne répond pas pour le moment.' : 'Aucun article ne correspond.'}</p>
                    ) : (
                        <ul className="space-y-2">
                            {(search.data ?? []).slice(0, 8).map((a) => (
                                <li key={a.slug}>
                                    <RowLink to={`/aide/articles/${encodeURIComponent(a.slug)}`} icon={BookOpen01Icon} tint="bg-surface-2 text-ink-2" title={a.title} subtitle={a.excerpt ?? a.summary} />
                                </li>
                            ))}
                        </ul>
                    )}
                    <button type="button" onClick={askAssistant} className={secondaryBtn}>
                        <HugeiconsIcon icon={AiChat02Icon} size={18} />
                        Poser la question à l’assistant
                    </button>
                </section>
            )}

            <section aria-labelledby="help-paths" className="space-y-2">
                <h2 id="help-paths" className="text-sm font-semibold text-ink-2">Que se passe-t-il ?</h2>
                <ul className="space-y-2">
                    {PATHS.map((p) => (
                        <li key={p.to}><RowLink {...p} /></li>
                    ))}
                </ul>
            </section>

            <section aria-labelledby="help-mine" className="space-y-2">
                <h2 id="help-mine" className="text-sm font-semibold text-ink-2">Mes demandes</h2>
                <RowLink
                    to="/aide/demandes"
                    icon={Ticket01Icon}
                    title="Voir mes demandes"
                    subtitle={tickets.isLoading ? 'Chargement…' : openCount > 0 ? `${openCount} demande${openCount > 1 ? 's' : ''} en cours` : 'Suivez les réponses de l’équipe SBC'}
                />
                <RowLink to="/aide/demandes/nouvelle" icon={CustomerSupportIcon} tint="bg-surface-2 text-ink-2" title="Écrire à un agent" subtitle="Une personne de l’équipe SBC vous répond" />
            </section>

            {(guides.data ?? []).length > 0 && <GuideBrowser roots={guides.data ?? []} />}

            {categoriesWithArticles.length > 0 && (
                <section aria-labelledby="help-topics" className="space-y-2">
                    <h2 id="help-topics" className="text-sm font-semibold text-ink-2">Tous les sujets</h2>
                    {categoriesWithArticles.map((c) => (
                        <details key={c.slug ?? c.name ?? c.title} className="group bg-surface border border-border rounded-card">
                            <summary className="flex items-center gap-2 p-3 cursor-pointer list-none text-sm font-semibold text-ink">
                                <HugeiconsIcon icon={BookOpen01Icon} size={18} className="text-primary" />
                                <span className="flex-1">{c.name ?? c.title}</span>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-ink-3 transition-transform group-open:rotate-90" />
                            </summary>
                            <ul className="px-3 pb-3 space-y-1">
                                {c.articles!.map((a) => (
                                    <li key={a.slug}>
                                        <Link to={`/aide/articles/${encodeURIComponent(a.slug)}`} className="block py-2 text-sm text-primary">{a.title}</Link>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    ))}
                </section>
            )}
        </HelpPage>
    );
}

const nodeTitle = (n: GuideNode) => n.label ?? n.title ?? '';

/** The guided FAQ: tap a question, then a more precise one, until an answer. */
function GuideBrowser({ roots }: { roots: GuideNode[] }) {
    const [path, setPath] = useState<GuideNode[]>([]);
    const current = path[path.length - 1];
    const options = current ? current.children ?? [] : roots;
    const target = current ? guideTarget(current) : null;
    const articles = current?.articles ?? [];

    return (
        <Card title="Questions fréquentes" icon={MessageQuestionIcon}>
            {current && (
                <button type="button" onClick={() => setPath(path.slice(0, -1))} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Retour aux questions
                </button>
            )}
            {current && <p className="text-sm font-semibold text-ink mb-2">{nodeTitle(current)}</p>}
            {current?.text && <RichText text={current.text} />}
            {(target || articles.length > 0) && (
                <div className="mt-3 flex flex-col gap-2">
                    {target && <Link to={target.to} className={primaryBtn}>{target.label}</Link>}
                    {articles.map((slug, i) => (
                        <Link key={slug} to={`/aide/articles/${encodeURIComponent(slug)}`} className="text-sm font-semibold text-primary underline">
                            {articles.length > 1 ? `Lire l’article ${i + 1}` : 'Lire l’article complet'}
                        </Link>
                    ))}
                </div>
            )}
            {options.length > 0 && (
                <ul className="divide-y divide-border">
                    {options.map((n, i) => (
                        <li key={n.id ?? i}>
                            <button type="button" onClick={() => setPath([...path, n])} className="w-full flex items-center gap-2 py-3 text-left text-sm text-ink">
                                <span className="flex-1">{nodeTitle(n)}</span>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-ink-3" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {current && options.length === 0 && current.action !== 'ticket' && (
                <Link to={`/aide/assistant?q=${encodeURIComponent(nodeTitle(current))}`} className="mt-3 block text-sm text-ink-2 underline">
                    Ça ne répond pas à ma question
                </Link>
            )}
        </Card>
    );
}
