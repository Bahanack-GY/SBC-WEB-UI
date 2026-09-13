import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, letting later Tailwind utilities win. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** "Jean Kamga" -> "JK". Used for avatar fallbacks. */
export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();

/** 1500000 -> "1 500 000 FCFA" */
export const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/**
 * ISO-3166 alpha-2 -> flag emoji.
 *
 * `country` is a free-form trimmed String on the user model with no enum, so
 * anything can be in there. Only a clean 2-letter code produces a flag;
 * everything else renders nothing rather than mojibake.
 */
export const flag = (code?: string) =>
  /^[A-Za-z]{2}$/.test(code ?? '')
    ? String.fromCodePoint(...[...code!.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '';
