import type { Tone } from './support';

const TONES: Record<Tone, string> = {
    success: 'bg-success-soft text-success',
    warning: 'bg-accent-soft text-accent',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-primary-soft text-primary',
    neutral: 'bg-surface-2 text-ink-2',
};

export const toneClass = (tone: Tone) => TONES[tone];

export const primaryBtn = 'w-full h-11 rounded-pill bg-primary text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2';
export const secondaryBtn = 'w-full h-11 rounded-pill bg-surface border border-border text-ink text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2';
export const inputCls = 'w-full rounded-tile border border-border bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
