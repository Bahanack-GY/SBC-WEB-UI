import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile (anti-robot check), for forms open without an account.
 * Shown only when VITE_TURNSTILE_SITE_KEY is set at build time; the server then
 * needs TURNSTILE_SECRET too (support-service refuses a missing token only when
 * it has a secret).
 */
type TurnstileApi = {
    render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    remove: (id: string) => void;
    reset: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

const SITE_KEY = (import.meta.env as Record<string, string | undefined>).VITE_TURNSTILE_SITE_KEY ?? '';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const turnstileEnabled = () => Boolean(SITE_KEY);

let loading: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    loading ??= new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SCRIPT;
        s.async = true;
        s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
        s.onerror = () => { loading = null; reject(new Error('turnstile blocked')); };
        document.head.appendChild(s);
    });
    return loading;
}

export default function TurnstileWidget({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey?: number }) {
    const box = useRef<HTMLDivElement>(null);
    const widget = useRef<string | null>(null);
    const cb = useRef(onToken);
    cb.current = onToken;

    useEffect(() => {
        if (!SITE_KEY || !box.current) return;
        let cancelled = false;
        loadTurnstile().then((t) => {
            if (cancelled || !box.current) return;
            widget.current = t.render(box.current, {
                sitekey: SITE_KEY, language: 'fr', appearance: 'interaction-only',
                callback: (token: string) => cb.current(token),
                'expired-callback': () => cb.current(null),
                'error-callback': () => cb.current(null),
            });
        }).catch(() => cb.current(null));
        return () => {
            cancelled = true;
            if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
            widget.current = null;
        };
    }, []);

    // A refused request needs a fresh token.
    useEffect(() => {
        if (resetKey && widget.current && window.turnstile) { window.turnstile.reset(widget.current); cb.current(null); }
    }, [resetKey]);

    if (!SITE_KEY) return null;
    return <div ref={box} className="min-h-[1px]" />;
}
