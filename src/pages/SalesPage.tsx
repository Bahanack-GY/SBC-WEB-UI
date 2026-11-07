import { HugeiconsIcon } from '@hugeicons/react';
import {
    ContactBookIcon,
    Crown02Icon,
    Money03Icon,
    Mortarboard01Icon,
    Tick02Icon,
    UserGroupIcon,
    WhatsappIcon,
} from '@hugeicons/core-free-icons';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import logo from '../assets/img/logo-sbc.png';
import Avatar from '../components/common/Avatar';
import PublicFooter from '../components/common/PublicFooter';
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import type { SalesPage as SalesPageData, SalesPagePack } from '../types/api';
import { handleApiResponse } from '../utils/apiHelpers';
import { cn, fcfa, flag } from '../lib/utils';

/**
 * A Pack Winner member's sales page (/p/<referralCode>), public: a prospect
 * opens the member's link and signs up under them.
 */

class PageNotFound extends Error {}

const AVATAR_PROXY = '/api/users/avatar/';

/**
 * The avatar as Avatar wants it. The proxy path carries the stored file id,
 * which the resize route takes as is; any other same-origin path is made
 * absolute so it is used untouched.
 */
const avatarSource = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith(AVATAR_PROXY)) return decodeURIComponent(url.slice(AVATAR_PROXY.length));
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return url;
};

const signupPath = (code?: string) => (code ? `/signup?affiliationCode=${encodeURIComponent(code)}` : '/signup');

const BENEFITS = [
    { icon: WhatsappIcon, title: 'Gagnez avec vos statuts WhatsApp', detail: 'SBC Ads Network' },
    { icon: UserGroupIcon, title: 'Commissions sur 3 niveaux de filleuls' },
    { icon: ContactBookIcon, title: 'Fichier de contacts SBC pour plus de vues' },
    { icon: Mortarboard01Icon, title: 'Formations offertes' },
] as const;

const primaryBtn = 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function PageHeader() {
    return (
        <header className="flex items-center justify-between py-3">
            {/* No link away: the page is there to convert. */}
            <div className="flex min-w-0 items-center gap-2">
                <img src={logo} alt="SBC" className="h-9 w-9 shrink-0 object-contain" />
                <span className="truncate text-sm font-bold text-ink">Sniper Business Center</span>
            </div>
            <Link to="/connexion" className="text-sm font-semibold text-primary hover:underline">
                Se connecter
            </Link>
        </header>
    );
}

function PackCard({ pack }: { pack: SalesPagePack }) {
    const winner = pack.id === 'WINNER';
    return (
        <article aria-labelledby={`sales-pack-${pack.id}`} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {winner && <HugeiconsIcon icon={Crown02Icon} size={18} className="shrink-0 text-accent" />}
                    <h3 id={`sales-pack-${pack.id}`} className="text-base font-bold text-ink">{pack.name}</h3>
                    {winner && (
                        <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-ink">Le plus complet</span>
                    )}
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-lg font-bold leading-tight text-ink tabular-nums">{fcfa(pack.price)}</p>
                    <p className="text-[11px] text-ink-2">une fois · à vie</p>
                </div>
            </div>
            {pack.features.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                    {pack.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-ink">
                            <HugeiconsIcon icon={Tick02Icon} size={16} className="mt-0.5 shrink-0 text-primary" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            )}
        </article>
    );
}

function Unavailable({ code, onRetry }: { code?: string; onRetry?: () => void }) {
    return (
        <div className="min-h-screen bg-bg">
            <div className="mx-auto w-full max-w-lg px-4 pb-6">
                <PageHeader />
                <div className="mt-8 flex flex-col items-center gap-4 rounded-card border border-border bg-surface px-4 py-10 text-center">
                    <p className="max-w-xs text-base font-semibold text-ink text-balance">
                        Cette page n'existe pas ou n'est plus disponible.
                    </p>
                    {/* Whoever shared the link still gets the sign-up, when the code is a real one. */}
                    <Link to={signupPath(code)} className={cn(primaryBtn, 'w-auto px-6 text-sm')}>
                        S'inscrire sur SBC
                    </Link>
                    {onRetry && (
                        <button type="button" onClick={onRetry} className="text-sm font-semibold text-primary">
                            Réessayer
                        </button>
                    )}
                </div>
                <PublicFooter />
            </div>
        </div>
    );
}

export default function SalesPage() {
    const { code } = useParams<{ code: string }>();

    const query = useQuery<SalesPageData>({
        queryKey: ['sales-page', code],
        enabled: !!code,
        queryFn: async () => {
            const response = await sbcApiService.getSalesPage(code!);
            if (response.statusCode === 404) throw new PageNotFound('Page introuvable.');
            const data = handleApiResponse(response) as SalesPageData;
            if (!data || typeof data !== 'object' || !data.referralCode) throw new Error('Réponse inattendue.');
            return data;
        },
        // A missing page stays missing; a network hiccup is worth one more try.
        retry: (failures, err) => !(err instanceof PageNotFound) && failures < 1,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
    const data = query.data;

    useEffect(() => {
        const previous = document.title;
        document.title = data?.firstName ? `${data.firstName} vous invite — SBC` : 'Sniper Business Center';
        return () => { document.title = previous; };
    }, [data?.firstName]);

    if (!code) return <Unavailable />;

    if (query.isLoading) {
        return (
            <div className="min-h-screen bg-bg">
                <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-6" aria-busy="true">
                    <PageHeader />
                    <div className="flex flex-col items-center gap-3 pt-6">
                        <Skeleton width="w-24" height="h-24" rounded="rounded-pill" />
                        <Skeleton width="w-3/4" height="h-7" rounded="rounded-tile" />
                        <Skeleton width="w-2/3" height="h-4" rounded="rounded-tile" />
                    </div>
                    <Skeleton height="h-14" rounded="rounded-xl" />
                    <Skeleton height="h-40" rounded="rounded-card" />
                </div>
            </div>
        );
    }

    if (query.isError || !data) {
        const notFound = query.error instanceof PageNotFound;
        return <Unavailable code={code} onRetry={notFound ? undefined : () => query.refetch()} />;
    }

    const firstName = data.firstName.trim();
    const signupTo = signupPath(data.referralCode);
    const signupLabel = firstName ? `Je m'inscris avec ${firstName}` : 'Je m\'inscris';
    const whatsapp = data.whatsappNumber?.replace(/\D/g, '');
    const whatsappHref = whatsapp
        ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
            `Bonjour ${firstName || ''}, je viens de votre page SBC et j'aimerais en savoir plus.`.replace(/\s+,/, ','),
        )}`
        : null;

    return (
        <div className="min-h-screen bg-bg">
            <div className="mx-auto w-full max-w-lg px-4 pb-28 sm:pb-8">
                <PageHeader />

                <motion.section
                    aria-labelledby="sales-hero-title"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                    className="flex flex-col items-center gap-3 pt-6 pb-8 text-center"
                >
                    <Avatar
                        src={avatarSource(data.avatarUrl)}
                        alt={data.name}
                        size={96}
                        className="size-24 rounded-pill bg-surface-2"
                    />
                    {data.name && (
                        <p className="text-sm font-medium text-ink-2">
                            {data.name}
                            {flag(data.country ?? undefined) && <span className="ml-1.5" aria-hidden>{flag(data.country ?? undefined)}</span>}
                        </p>
                    )}
                    <h1 id="sales-hero-title" className="text-2xl font-bold leading-tight text-ink text-balance">
                        {firstName || 'Un membre SBC'} vous invite à rejoindre Sniper Business Center
                    </h1>
                    <p className="max-w-sm text-base text-ink-2 text-pretty">
                        La plateforme africaine pour gagner avec vos statuts WhatsApp, vos contacts et votre réseau.
                    </p>
                    <div className="mt-2 flex w-full flex-col gap-2">
                        <Link to={signupTo} className={primaryBtn}>{signupLabel}</Link>
                        {whatsappHref && (
                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                            >
                                <HugeiconsIcon icon={WhatsappIcon} size={18} className="text-whatsapp" />
                                Poser une question sur WhatsApp
                            </a>
                        )}
                    </div>
                </motion.section>

                <section aria-labelledby="sales-benefits-title" className="mb-8">
                    <h2 id="sales-benefits-title" className="mb-3 text-lg font-bold text-ink">Ce que vous obtenez</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {BENEFITS.map((b) => (
                            <li key={b.title} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-primary-soft text-primary">
                                    <HugeiconsIcon icon={b.icon} size={20} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-ink text-pretty">{b.title}</span>
                                    {'detail' in b && <span className="block text-xs text-ink-2">{b.detail}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section aria-labelledby="sales-steps-title" className="mb-8">
                    <h2 id="sales-steps-title" className="mb-3 text-lg font-bold text-ink">Comment ça marche</h2>
                    <ol className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
                        {[
                            firstName ? `Inscrivez-vous avec le lien de ${firstName}.` : 'Inscrivez-vous avec ce lien.',
                            'Choisissez votre pack, payé une seule fois.',
                            'Commencez à gagner.',
                        ].map((step, i) => (
                            <li key={step} className="flex items-center gap-3">
                                <span className="grid size-8 shrink-0 place-items-center rounded-pill bg-primary text-sm font-bold text-white tabular-nums" aria-hidden>
                                    {i + 1}
                                </span>
                                <span className="text-sm text-ink">{step}</span>
                            </li>
                        ))}
                    </ol>
                </section>

                {data.packs.length > 0 && (
                    <section aria-labelledby="sales-packs-title" className="mb-6">
                        <h2 id="sales-packs-title" className="text-lg font-bold text-ink">Les packs</h2>
                        <p className="mb-3 flex items-center gap-1.5 text-sm text-ink-2">
                            <HugeiconsIcon icon={Money03Icon} size={16} className="shrink-0 text-success" />
                            Vous payez une seule fois, il est à vie.
                        </p>
                        <div className="flex flex-col gap-3">
                            {data.packs.map((pack) => <PackCard key={pack.id} pack={pack} />)}
                        </div>
                    </section>
                )}

                <Link to={signupTo} className={primaryBtn}>{signupLabel}</Link>

                <PublicFooter />
            </div>

            {/* Mobile: the sign-up stays within thumb reach while the page scrolls. */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
                <Link to={signupTo} className={primaryBtn}>{signupLabel}</Link>
            </div>
        </div>
    );
}
