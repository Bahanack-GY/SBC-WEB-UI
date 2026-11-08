import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import TermsLink from '../common/TermsLink';
import { dismissCookieNotice, isConsentFreePath, isCookieNoticeDue, needsConsent } from '../../utils/privacy';

/**
 * The two privacy messages every page can show, one at a time:
 *  - the consent window, for a logged-in member who has not accepted the
 *    current policy and the transfer of data outside Benin (blocking);
 *  - the cookie notice, for everyone, until dismissed (back after 60 days).
 * `whenClear` (the install prompt) shows only when neither is on screen, so
 * nothing stacks at the bottom of the page. `raised` lifts the cookie notice
 * above a bar fixed at the bottom (the nav, a sales page's sign-up button).
 */
export default function PrivacyNotices({ raised, whenClear }: { raised: boolean; whenClear?: ReactNode }) {
    const consentOpen = useConsentWindowOpen();
    const [cookieDue, setCookieDue] = useState(() => isCookieNoticeDue());

    if (consentOpen) return <ConsentWindow />;
    if (cookieDue) {
        return <CookieBanner raised={raised} onDismiss={() => { dismissCookieNotice(); setCookieDue(false); }} />;
    }
    return <>{whenClear}</>;
}

/**
 * True when the logged-in member must (re)consent. The user object from the
 * login or code screen may not carry the consents, so before asking we reload
 * the profile once (GET /users/me) and decide on that answer.
 */
function useConsentWindowOpen(): boolean {
    const { isAuthenticated, user, refreshUser } = useAuth();
    const { pathname } = useLocation();
    const userId: string | null = user ? String(user._id ?? user.id ?? 'me') : null;
    const missing = isAuthenticated && !!user && needsConsent(user);

    const [checkedFor, setCheckedFor] = useState<string | null>(null);
    const asked = useRef<string | null>(null);
    // refreshUser changes identity on every AuthProvider render; read it through a ref.
    const refresh = useRef(refreshUser);
    refresh.current = refreshUser;

    useEffect(() => {
        if (!missing || !userId || asked.current === userId) return;
        asked.current = userId;
        void refresh.current()
            .catch(() => undefined)
            .finally(() => setCheckedFor(userId));
    }, [missing, userId]);

    return missing && checkedFor === userId && !isConsentFreePath(pathname);
}

function ConsentWindow() {
    const { refreshUser, logout } = useAuth();
    const [privacy, setPrivacy] = useState(false);
    const [transfer, setTransfer] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refusing, setRefusing] = useState(false);
    const titleId = useId();

    const accept = async () => {
        if (!privacy || !transfer || busy) return;
        setBusy(true);
        setError(null);
        try {
            handleApiResponse(await sbcApiService.recordConsents({ privacy: true, dataTransfer: true }));
            await refreshUser();
        } catch {
            setError('Votre accord n’a pas pu être enregistré. Vérifiez votre connexion, puis touchez « J’accepte » pour réessayer.');
        } finally {
            setBusy(false);
        }
    };

    const leave = async () => {
        await logout();
        window.location.replace('/connexion');
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-ink/60 p-3">
            <div role="dialog" aria-modal="true" aria-labelledby={titleId}
                className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-surface border border-border rounded-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <h2 id={titleId} className="text-lg font-bold text-ink">Vos données personnelles</h2>

                {!refusing ? (
                    <>
                        <p className="mt-2 text-sm text-ink-2">
                            Pour continuer à utiliser SBC, nous avons besoin de votre accord sur la façon dont nous
                            traitons vos données. Lisez la <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>,
                            puis cochez les deux cases.
                        </p>

                        <div className="mt-4 space-y-3">
                            <ConsentCheckbox checked={privacy} onChange={setPrivacy}>
                                J’accepte les <TermsLink className="text-primary underline">conditions d’utilisation</TermsLink> et
                                la <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>
                            </ConsentCheckbox>
                            <ConsentCheckbox checked={transfer} onChange={setTransfer}>
                                J’accepte que mes données soient hébergées et traitées hors du Bénin (serveurs en Allemagne)
                            </ConsentCheckbox>
                        </div>

                        {error && <p role="alert" className="mt-3 rounded-tile bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

                        <button type="button" onClick={accept} disabled={!privacy || !transfer || busy}
                            className="mt-5 w-full h-12 rounded-pill bg-primary text-white font-semibold disabled:opacity-50">
                            {busy ? 'Enregistrement…' : 'J’accepte'}
                        </button>
                        <button type="button" onClick={() => setRefusing(true)} disabled={busy}
                            className="mt-2 w-full h-11 rounded-pill text-ink-2 text-sm font-semibold">
                            Je refuse
                        </button>
                    </>
                ) : (
                    <>
                        <p className="mt-2 text-sm text-ink-2">
                            Sans cet accord, SBC ne peut pas conserver votre compte : vous pouvez le supprimer depuis la
                            page <Link to="/mes-donnees" className="text-primary underline">Mes données personnelles</Link>.
                        </p>
                        <button type="button" onClick={() => setRefusing(false)}
                            className="mt-5 w-full h-12 rounded-pill bg-primary text-white font-semibold">
                            Revenir à l’accord
                        </button>
                        <button type="button" onClick={leave}
                            className="mt-2 w-full h-11 rounded-pill text-ink-2 text-sm font-semibold">
                            Se déconnecter
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function ConsentCheckbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
    return (
        <label className="flex items-start gap-3 rounded-tile border border-border bg-bg px-3 py-3 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[#115CF6]" />
            <span>{children}</span>
        </label>
    );
}

function CookieBanner({ raised, onDismiss }: { raised: boolean; onDismiss: () => void }) {
    return (
        <div role="region" aria-label="Cookies"
            className={`fixed inset-x-3 z-40 mx-auto max-w-lg bg-surface border border-border rounded-card p-3 ${raised ? 'bottom-24' : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'}`}>
            <p className="text-xs text-ink-2">
                SBC n’utilise pas de cookies publicitaires ni de mesure d’audience. Le site garde seulement sur votre
                appareil ce qu’il faut pour fonctionner (connexion, langue, préférences), 60 jours au plus.
            </p>
            <div className="mt-2 flex items-center justify-end gap-2">
                <Link to="/confidentialite#cookies" className="rounded-pill px-3 py-2 text-sm font-semibold text-primary">En savoir plus</Link>
                <button type="button" onClick={onDismiss} className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                    J’ai compris
                </button>
            </div>
        </div>
    );
}
