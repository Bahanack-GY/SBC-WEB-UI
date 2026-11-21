import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { AiChat02Icon, CustomerSupportIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { SupportError, supportErrorText, unwrap, type Article, type ArticleMedia } from './support';
import { Card, ErrorNote, HelpPage, RichText, Skeletons } from './ui';
import { secondaryBtn } from './styles';

/** One published help article, with a way out when it does not help. */
export default function HelpArticle() {
    const { slug = '' } = useParams();
    const article = useQuery({
        queryKey: ['support', 'article', slug],
        queryFn: async () => unwrap<Article>(await sbcApiService.supportKbArticle(slug)),
        staleTime: 5 * 60_000,
    });
    const a = article.data;
    const media = a?.media ?? [];
    const videos = [...(a?.videoUrl ? [{ type: 'video' as const, url: a.videoUrl }] : []), ...media.filter((m) => m.type === 'video')]
        .filter((m): m is ArticleMedia & { title?: string } => /^https:\/\//.test(m.url));
    const links = media.filter((m) => m.type !== 'video' && /^https:\/\//.test(m.url));

    return (
        <HelpPage title={a?.title ?? 'Article'}>
            {article.isLoading ? (
                <Skeletons count={1} height="h-48" />
            ) : article.isError || !a ? (
                <ErrorNote onRetry={() => article.refetch()}>
                    {article.error instanceof SupportError && article.error.status === 404
                        ? 'Cet article n’existe plus ou n’est plus publié.'
                        : supportErrorText(article.error)}
                </ErrorNote>
            ) : (
                <Card>
                    <h2 className="text-base font-semibold text-ink mb-3">{a.title}</h2>
                    {a.summary && <p className="text-sm font-medium text-ink mb-3">{a.summary}</p>}
                    {videos.map((m) => (
                        <video key={m.url} src={m.url} controls preload="metadata" playsInline className="w-full rounded-tile mb-3 bg-ink" aria-label={`Vidéo : ${m.title ?? a.title}`} />
                    ))}
                    <RichText text={a.body ?? a.content ?? ''} />
                    {links.length > 0 && (
                        <ul className="mt-3 space-y-1">
                            {links.map((m) => (
                                <li key={m.url}>
                                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                                        {m.title ?? (m.type === 'pdf' ? 'Document PDF' : 'Lien utile')}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            )}
            <div className="space-y-2">
                <p className="text-sm text-ink-2 text-center">Ça ne répond pas à votre question ?</p>
                <Link to={`/aide/assistant${a?.title ? `?q=${encodeURIComponent(a.title)}` : ''}`} className={secondaryBtn}>
                    <HugeiconsIcon icon={AiChat02Icon} size={18} /> Demander à l’assistant
                </Link>
                <Link to="/aide/demandes/nouvelle" className={secondaryBtn}>
                    <HugeiconsIcon icon={CustomerSupportIcon} size={18} /> Écrire à un agent
                </Link>
            </div>
        </HelpPage>
    );
}
