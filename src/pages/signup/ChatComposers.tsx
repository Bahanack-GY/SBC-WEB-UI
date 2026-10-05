import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon, EyeIcon, Search01Icon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { allAfricanCountries } from '../../utils/countriesData';

/** The inputs a question can ask for. One is shown at a time, above the keyboard. */

export interface Option { value: string; label: string; hint?: string }

const field = 'w-full min-w-0 bg-surface border border-border rounded-pill px-4 h-12 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary';
const sendBtn = 'shrink-0 size-12 rounded-full bg-primary text-white grid place-items-center disabled:opacity-40';
const chip = 'rounded-pill border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:border-primary active:bg-primary-soft disabled:opacity-50';

function SendButton({ disabled, label = 'Envoyer' }: { disabled?: boolean; label?: string }) {
    return (
        <button type="submit" className={sendBtn} disabled={disabled} aria-label={label}>
            <HugeiconsIcon icon={ArrowUp02Icon} size={22} />
        </button>
    );
}

/** Free text: name, e-mail, sponsor code. */
export function TextComposer({ label, placeholder, initial = '', inputMode, type = 'text', autoComplete, autoCapitalize, onSubmit, disabled }: {
    label: string; placeholder?: string; initial?: string; inputMode?: 'text' | 'email'; type?: string;
    autoComplete?: string; autoCapitalize?: string; onSubmit: (v: string) => void; disabled?: boolean;
}) {
    const [v, setV] = useState(initial);
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { ref.current?.focus(); }, []);
    const submit = (e: FormEvent) => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); };
    return (
        <form onSubmit={submit} className="flex gap-2">
            <input ref={ref} aria-label={label} className={field} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder}
                inputMode={inputMode} type={type} autoComplete={autoComplete} autoCapitalize={autoCapitalize} disabled={disabled} />
            <SendButton disabled={disabled || !v.trim()} />
        </form>
    );
}

/** A password, hidden by default, with an eye to show it. */
export function PasswordComposer({ label, autoComplete, onSubmit, disabled }: {
    label: string; autoComplete: string; onSubmit: (v: string) => void; disabled?: boolean;
}) {
    const [v, setV] = useState('');
    const [show, setShow] = useState(false);
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { ref.current?.focus(); }, []);
    return (
        <form onSubmit={(e) => { e.preventDefault(); if (v) onSubmit(v); }} className="flex gap-2">
            <div className="relative flex-1 min-w-0">
                <input ref={ref} aria-label={label} className={`${field} pr-12`} type={show ? 'text' : 'password'} value={v}
                    onChange={(e) => setV(e.target.value)} autoComplete={autoComplete} disabled={disabled} placeholder="••••••••" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 p-1">
                    <HugeiconsIcon icon={show ? ViewOffIcon : EyeIcon} size={20} />
                </button>
            </div>
            <SendButton disabled={disabled || !v} />
        </form>
    );
}

/** A choice among options, filtered as you type when the list is long (countries, professions). */
export function ListComposer({ label, options, placeholder = 'Rechercher…', onSubmit, onSkip, disabled }: {
    label: string; options: Option[]; placeholder?: string; onSubmit: (v: string) => void; onSkip?: () => void; disabled?: boolean;
}) {
    const [q, setQ] = useState('');
    const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const shown = useMemo(() => {
        const t = fold(q.trim());
        return t ? options.filter((o) => fold(`${o.label} ${o.hint ?? ''}`).includes(t)) : options;
    }, [q, options]);
    return (
        <div className="space-y-2">
            {options.length > 8 && (
                <div className="relative">
                    <HugeiconsIcon icon={Search01Icon} size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                    <input aria-label={label} className={`${field} pl-11`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoFocus />
                </div>
            )}
            <div role="listbox" aria-label={label} className="max-h-56 overflow-y-auto rounded-card border border-border bg-surface divide-y divide-border">
                {shown.map((o) => (
                    <button key={o.value} type="button" role="option" aria-selected={false} disabled={disabled} onClick={() => onSubmit(o.value)}
                        className="w-full text-left px-4 py-3 text-[15px] text-ink hover:bg-surface-2 active:bg-primary-soft flex items-center justify-between gap-3">
                        <span>{o.label}</span>{o.hint && <span className="text-xs text-ink-3">{o.hint}</span>}
                    </button>
                ))}
                {shown.length === 0 && <div className="px-4 py-3 text-sm text-ink-3">Aucun résultat pour « {q} ».</div>}
            </div>
            {onSkip && <button type="button" onClick={onSkip} className="text-sm text-ink-2 font-medium px-2">Passer cette question</button>}
        </div>
    );
}

/** A few quick replies (sex, language, yes/no). */
export function ChipsComposer({ options, onSubmit, disabled }: { options: Option[]; onSubmit: (v: string) => void; disabled?: boolean }) {
    return (
        <div className="flex flex-wrap gap-2 justify-end">
            {options.map((o) => (
                <button key={o.value} type="button" className={chip} disabled={disabled} onClick={() => onSubmit(o.value)}>{o.label}</button>
            ))}
        </div>
    );
}

/** Several picks (interests), then confirm. */
export function MultiComposer({ options, onSubmit, onSkip, disabled }: {
    options: Option[]; onSubmit: (v: string[]) => void; onSkip: () => void; disabled?: boolean;
}) {
    const [picked, setPicked] = useState<string[]>([]);
    const toggle = (v: string) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-0.5">
                {options.map((o) => {
                    const on = picked.includes(o.value);
                    return (
                        <button key={o.value} type="button" aria-pressed={on} onClick={() => toggle(o.value)} disabled={disabled}
                            className={`rounded-pill border px-3 py-1.5 text-sm ${on ? 'bg-primary text-white border-primary' : 'bg-surface text-ink border-border'}`}>
                            {o.label}
                        </button>
                    );
                })}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={onSkip} className="h-12 px-4 rounded-pill text-ink-2 font-semibold">Passer</button>
                <button type="button" disabled={disabled || picked.length === 0} onClick={() => onSubmit(picked)}
                    className="flex-1 h-12 rounded-pill bg-primary text-white font-semibold disabled:opacity-40">
                    {picked.length ? `Valider (${picked.length})` : 'Choisissez au moins un centre d’intérêt'}
                </button>
            </div>
        </div>
    );
}

/** WhatsApp number with its dial code; the code follows the chosen country and can be changed. */
export function PhoneComposer({ dialCountry, onDialChange, onSubmit, disabled }: {
    dialCountry: string; onDialChange: (v: string) => void; onSubmit: (raw: string) => void; disabled?: boolean;
}) {
    const [v, setV] = useState('');
    const [picking, setPicking] = useState(false);
    const dial = allAfricanCountries.find((c) => c.value === dialCountry);
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { if (!picking) ref.current?.focus(); }, [picking]);
    if (picking) {
        return (
            <ListComposer label="Indicatif du pays" placeholder="Pays ou indicatif (ex. 237)"
                options={allAfricanCountries.map((c) => ({ value: c.value, label: `${c.flag} ${c.value}`, hint: c.phoneCode }))}
                onSubmit={(val) => { onDialChange(val); setPicking(false); }} />
        );
    }
    return (
        <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v); }} className="flex gap-2">
            <button type="button" onClick={() => setPicking(true)} aria-label="Changer l’indicatif"
                className="shrink-0 h-12 px-3 rounded-pill border border-border bg-surface text-[15px] text-ink font-medium">
                {dial ? `${dial.flag} ${dial.phoneCode}` : 'Indicatif'}
            </button>
            <input ref={ref} aria-label="Numéro WhatsApp" className={field} type="tel" inputMode="tel" autoComplete="tel-national"
                value={v} onChange={(e) => setV(e.target.value)} placeholder="Ex. 675090755" disabled={disabled} />
            <SendButton disabled={disabled || !v.trim()} />
        </form>
    );
}

/** A date (birth date), with the phone's own picker. */
export function DateComposer({ label, onSubmit, onSkip, disabled }: { label: string; onSubmit: (v: string) => void; onSkip: () => void; disabled?: boolean }) {
    const [v, setV] = useState('');
    const today = new Date().toISOString().slice(0, 10);
    return (
        <div className="space-y-2">
            <form onSubmit={(e) => { e.preventDefault(); if (v) onSubmit(v); }} className="flex gap-2">
                <input aria-label={label} type="date" max={today} min="1900-01-01" className={field} value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} />
                <SendButton disabled={disabled || !v} />
            </form>
            <button type="button" onClick={onSkip} className="text-sm text-ink-2 font-medium px-2">Passer cette question</button>
        </div>
    );
}

/** The 6-character code. Letters and digits; case doesn't matter (the server folds it). */
export function OtpComposer({ onSubmit, disabled, footer }: { onSubmit: (code: string) => void; disabled?: boolean; footer?: ReactNode }) {
    const [v, setV] = useState('');
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { ref.current?.focus(); }, []);
    const clean = (s: string) => s.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6);
    return (
        <div className="space-y-2">
            <form onSubmit={(e) => { e.preventDefault(); if (v.length === 6) onSubmit(v); }} className="flex gap-2">
                <input ref={ref} aria-label="Code de vérification" className={`${field} text-center tracking-[0.5em] font-semibold uppercase`}
                    value={v} onChange={(e) => setV(clean(e.target.value))} autoComplete="one-time-code" autoCapitalize="characters"
                    spellCheck={false} placeholder="••••••" disabled={disabled} />
                <SendButton disabled={disabled || v.length !== 6} label="Valider le code" />
            </form>
            {footer}
        </div>
    );
}
