import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sbcApiService } from '../../services/SBCApiService';
import { isConsentFreePath } from '../../utils/privacy';

import { isAnnouncement, readSession, writeSession, type Announcement } from './announcementSession';

/** Never let a tracking call disturb the member. */
const track = (id: string, type: 'shown' | 'closed' | 'clicked') => {
    void sbcApiService.announcementEvent(id, type).catch(() => undefined);
};

/**
 * Shows the admin's pop-up announcement for this member, once per app open,
 * and its children (the install prompt) only when none is on screen, so the
 * two never stack. Sits after the consent window and the cookie notice in
 * PrivacyNotices' chain.
 */
export default function AnnouncementGate({ children, delayMs = 1500 }: { children?: ReactNode; delayMs?: number }) {
    const { isAuthenticated, user } = useAuth();
    const { pathname } = useLocation();
    const userId: string | null = isAuthenticated && user ? String(user._id ?? user.id ?? 'me') : null;
    const [announcement, setAnnouncement] = useState<Announcement | null>(() =>
        userId ? readSession(userId) ?? null : null);

    useEffect(() => {
        if (!userId) return;
        const known = readSession(userId);
        if (known !== undefined) { setAnnouncement(known); return; }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            let next: Announcement | null = null;
            try {
                const res = await sbcApiService.nextAnnouncement();
                const data = res?.body?.data;
                next = res?.isSuccessByStatusCode && isAnnouncement(data) ? data : null;
            } catch { next = null; }
            if (cancelled) return;
            writeSession(userId, next);
            setAnnouncement(next);
        }, delayMs);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [userId, delayMs]);

    const dismiss = useCallback(() => {
        if (userId) writeSession(userId, null);
        setAnnouncement(null);
    }, [userId]);

    if (announcement && userId && !isConsentFreePath(pathname)) {
        return <AnnouncementPopup announcement={announcement} onDone={dismiss} />;
    }
    return <>{children}</>;
}

export function AnnouncementPopup({ announcement, onDone }: { announcement: Announcement; onDone: () => void }) {
    const navigate = useNavigate();
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const { id, title, message, imageUrl, buttonLabel, buttonUrl } = announcement;

    useEffect(() => {
        track(id, 'shown');
        dialogRef.current?.focus();
    }, [id]);

    const close = useCallback(() => {
        track(id, 'closed');
        onDone();
    }, [id, onDone]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    const follow = () => {
        if (!buttonUrl) return;
        track(id, 'clicked');
        onDone();
        if (/^https:\/\//i.test(buttonUrl)) window.open(buttonUrl, '_blank', 'noopener');
        else if (buttonUrl.startsWith('/') && !buttonUrl.startsWith('//')) navigate(buttonUrl);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-ink/60 p-3"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
                className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-surface border border-border rounded-card outline-none pb-[env(safe-area-inset-bottom)]">
                <button type="button" onClick={close} aria-label="Fermer l’annonce"
                    className="absolute right-2 top-2 z-10 flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink-2">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                </button>
                {imageUrl && (
                    <img src={imageUrl} alt="" className="block w-full max-h-[40vh] object-cover rounded-t-card" />
                )}
                <div className="p-5">
                    <h2 id={titleId} className={`text-lg font-bold text-ink ${imageUrl ? '' : 'pr-10'}`}>{title}</h2>
                    <p className="mt-2 text-sm text-ink-2 whitespace-pre-line break-words">{message}</p>
                    {buttonLabel && buttonUrl && (
                        <button type="button" onClick={follow}
                            className="mt-5 w-full h-12 rounded-pill bg-primary text-white font-semibold">
                            {buttonLabel}
                        </button>
                    )}
                    <button type="button" onClick={close}
                        className={`${buttonLabel && buttonUrl ? 'mt-2' : 'mt-5'} w-full h-11 rounded-pill text-ink-2 text-sm font-semibold`}>
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
