import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Protects an edit form from losing work.
 *
 *  - Reload / tab close while dirty: the browser's own "leave the page?" prompt.
 *  - In-page exits (back button, links): `guard(fn)` asks first, in-app.
 *  - Everything else (browser back, a crash, the app killed on a phone): the
 *    draft is kept in localStorage under `storageKey` and offered back the next
 *    time the form opens — but only if the saved version it was based on is
 *    still the current one, so a stale draft never overwrites newer data.
 *
 * The app uses BrowserRouter, so react-router's useBlocker is not available.
 */
export function useUnsavedChanges<T>(opts: {
    dirty: boolean;
    storageKey: string;
    /** The saved version the draft is based on (any JSON-serialisable value). */
    base: unknown;
    draft: T | null;
}) {
    const { dirty, storageKey, base, draft } = opts;
    const [pending, setPending] = useState<(() => void) | null>(null);
    const baseKey = base === undefined ? '' : JSON.stringify(base);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    // First time the saved version is known: is there a draft left from an
    // earlier visit, based on that same version? Offer it back.
    const [restorable, setRestorable] = useState<T | null>(null);
    const checked = useRef(false);
    useEffect(() => {
        if (!baseKey) return;
        try {
            if (!checked.current) {
                checked.current = true;
                const raw = localStorage.getItem(storageKey);
                const saved = raw ? (JSON.parse(raw) as { base: string; draft: T }) : null;
                if (saved && saved.base === baseKey) setRestorable(saved.draft);
                else localStorage.removeItem(storageKey);
                return;
            }
            if (restorable) return; // leave it alone until the user decides
            // Keep (or clear) the stored draft as the user types.
            if (dirty && draft) localStorage.setItem(storageKey, JSON.stringify({ base: baseKey, draft, at: Date.now() }));
            else localStorage.removeItem(storageKey);
        } catch { /* storage unavailable: the in-page guards still apply */ }
    }, [dirty, draft, baseKey, storageKey, restorable]);

    const discardStoredDraft = useCallback(() => {
        setRestorable(null);
        try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    }, [storageKey]);

    /** Hands the earlier draft back to the form (and stops offering it). */
    const takeRestorable = useCallback(() => {
        const d = restorable;
        setRestorable(null);
        return d;
    }, [restorable]);

    const guard = useCallback((leave: () => void) => {
        if (dirty) setPending(() => leave);
        else leave();
    }, [dirty]);

    const dialog: ReactNode = pending ? (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-surface rounded-card p-4 w-full max-w-sm space-y-3">
                <div className="text-base font-semibold text-ink">Modifications non enregistrées</div>
                <p className="text-sm text-ink-2">Vous avez des modifications non enregistrées. Si vous quittez maintenant, elles seront perdues.</p>
                <div className="flex gap-2">
                    <button onClick={() => setPending(null)} className="flex-1 rounded-tile bg-primary text-white font-semibold py-2.5 text-sm">Rester</button>
                    <button
                        onClick={() => { const leave = pending; setPending(null); discardStoredDraft(); leave(); }}
                        className="flex-1 rounded-tile border border-danger text-danger font-semibold py-2.5 text-sm"
                    >
                        Quitter sans enregistrer
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return { guard, dialog, restorable: restorable !== null, takeRestorable, discardStoredDraft };
}
