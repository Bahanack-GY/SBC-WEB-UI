import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, ArrowLeft01Icon, ArrowRight01Icon, HelpCircleIcon } from '@hugeicons/core-free-icons';
import { headerDrop, pageFade } from '../../utils/motion';
import { cn } from '../../lib/utils';
import type { Tone } from './support';
import { toneClass } from './styles';

type Icon = typeof HelpCircleIcon;

/**
 * The frame of every « Aide » screen: a back button and a title. Back goes to
 * the previous screen, or to `back` when the screen was opened directly (a
 * notification, a shared link) and there is nothing to go back to.
 */
export function HelpPage({ title, back = '/aide', children, actions }: { title: string; back?: string; children: ReactNode; actions?: ReactNode }) {
    const navigate = useNavigate();
    const goBack = () => {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) navigate(-1);
        else navigate(back, { replace: true });
    };
    return (
        <motion.div variants={pageFade} initial="hidden" animate="show" className="min-h-screen bg-bg pb-10">
            <motion.header variants={headerDrop} className="sticky top-0 z-20 bg-bg flex items-center gap-2 px-4 py-3">
                {/* Same look as components/common/BackButton, with an accessible name. */}
                <button type="button" onClick={goBack} aria-label="Retour" className="bg-[#94B027] p-2 rounded-xl text-white shrink-0">
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={25} />
                </button>
                <h1 className="flex-1 min-w-0 truncate text-lg font-semibold text-ink">{title}</h1>
                {actions}
            </motion.header>
            <div className="px-4 max-w-xl mx-auto space-y-4">{children}</div>
        </motion.div>
    );
}

export function Card({ title, icon, children, className }: { title?: string; icon?: Icon; children: ReactNode; className?: string }) {
    return (
        <section aria-label={title} className={cn('bg-surface border border-border rounded-card p-4', className)}>
            {title && (
                <h2 className="flex items-center gap-2 font-semibold text-ink mb-2">
                    {icon && <HugeiconsIcon icon={icon} size={20} className="text-primary shrink-0" />}
                    {title}
                </h2>
            )}
            {children}
        </section>
    );
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
    return <span className={cn('inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-semibold', toneClass(tone))}>{children}</span>;
}

export function ErrorNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
    return (
        <div role="alert" className="flex items-start gap-2 rounded-tile bg-danger-soft p-3 text-sm text-danger">
            <HugeiconsIcon icon={AlertCircleIcon} size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
                <p>{children}</p>
                {onRetry && (
                    <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Réessayer</button>
                )}
            </div>
        </div>
    );
}

export function Skeletons({ count = 3, height = 'h-16' }: { count?: number; height?: string }) {
    return (
        <div className="space-y-2" aria-busy="true" aria-label="Chargement">
            {Array.from({ length: count }, (_, i) => <div key={i} className={cn('rounded-card bg-surface-2 animate-pulse', height)} />)}
        </div>
    );
}

/** A tappable row with an icon, a title, an optional subtitle and a chevron. */
export function RowLink({ to, icon, tint = 'bg-primary-soft text-primary', title, subtitle, right }: {
    to: string; icon: Icon; tint?: string; title: ReactNode; subtitle?: ReactNode; right?: ReactNode;
}) {
    return (
        <Link to={to} className="flex items-center gap-3 p-3 rounded-card bg-surface border border-border text-left focus-visible:outline-2 focus-visible:outline-primary">
            <span className={cn('size-10 grid place-items-center rounded-pill shrink-0', tint)}>
                <HugeiconsIcon icon={icon} size={20} />
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink">{title}</span>
                {subtitle && <span className="block text-xs text-ink-2 mt-0.5">{subtitle}</span>}
            </span>
            {right}
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3 shrink-0" />
        </Link>
    );
}

/** Plain-text article or answer: paragraphs on blank lines, « - » lines as a list. Never HTML. */
export function RichText({ text }: { text: string }) {
    const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    return (
        <div className="space-y-2 text-sm text-ink-2 leading-relaxed">
            {blocks.map((b, i) => {
                const lines = b.split('\n');
                if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
                    return (
                        <ul key={i} className="list-disc pl-5 space-y-1">
                            {lines.map((l, j) => <li key={j}>{l.replace(/^\s*[-*•]\s+/, '')}</li>)}
                        </ul>
                    );
                }
                return <p key={i} className="whitespace-pre-line">{b}</p>;
            })}
        </div>
    );
}
