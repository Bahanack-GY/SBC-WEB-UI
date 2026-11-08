/**
 * Personal-data rules the app applies on the member's side, set by the
 * authorisation of Benin's data-protection authority (APDP, Délibération
 * n° 2026-523/AT/APDP/DST/SC du 27 août 2026). Applied to every member,
 * whatever their country.
 */

/** Version of the privacy policy a member's consent must match. */
export const PRIVACY_POLICY_VERSION = '2026-11';

export const APDP_DELIBERATION = 'Délibération n° 2026-523/AT/APDP/DST/SC du 27 août 2026';

export interface ConsentRecord { acceptedAt: string; version: string }
export interface Consents { privacy?: ConsentRecord; dataTransfer?: ConsentRecord }

/** Benin members only: the APDP consent applies to them (Rufus, 2026-11-08). */
export const isBenin = (country?: string | null): boolean =>
    ['BJ', 'BENIN', 'BÉNIN'].includes(String(country ?? '').trim().toUpperCase());

/**
 * True when a Benin member has not accepted the current policy, or never
 * accepted that their data is hosted and processed outside Benin. Members of
 * other countries are never asked (Rufus, 2026-11-08).
 */
export const needsConsent = (user: { consents?: Consents | null; country?: string | null } | null | undefined): boolean =>
    isBenin(user?.country) &&
    (user?.consents?.privacy?.version !== PRIVACY_POLICY_VERSION || !user?.consents?.dataTransfer);

/**
 * Pages the consent window never covers: the texts it links to, the sign-up
 * and code screens, the SSO consent screen, the public sales pages, and the
 * page where a member who refuses can delete the account.
 */
const CONSENT_FREE_PATHS = ['/confidentialite', '/conditions', '/mentions-legales', '/otp', '/sso/authorize', '/mes-donnees'];

export const isConsentFreePath = (pathname: string): boolean =>
    CONSENT_FREE_PATHS.includes(pathname) || pathname.startsWith('/signup') || pathname.startsWith('/p/');

// ---------- cookie notice ----------

/** Nothing the site keeps on the device lives longer than this, and the notice comes back after it. */
export const STORAGE_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;

export const COOKIE_NOTICE_KEY = 'sbc.cookieNotice.dismissedAt';

/** The notice shows until dismissed, then again 60 days later. */
export const isCookieNoticeDue = (now = Date.now()): boolean => {
    try {
        const at = Number(localStorage.getItem(COOKIE_NOTICE_KEY) || 0);
        return !at || now - at >= STORAGE_MAX_AGE_MS;
    } catch {
        return true;
    }
};

export const dismissCookieNotice = (now = Date.now()) => {
    try { localStorage.setItem(COOKIE_NOTICE_KEY, String(now)); } catch { /* private mode: shown again next visit */ }
};

// ---------- nothing kept more than 60 days ----------

const STORAGE_SINCE_KEY = 'sbc.storage.since';

/**
 * What the site keeps on the device (preferences, dismissed messages, drafts)
 * is wiped once it is 60 days old, then the count restarts. The login token
 * stays: the server already makes it expire (JWT_EXPIRATION, a day by default).
 * Called once at start-up.
 */
export const sweepExpiredStorage = (now = Date.now()) => {
    try {
        const since = Number(localStorage.getItem(STORAGE_SINCE_KEY) || 0);
        if (since && now - since < STORAGE_MAX_AGE_MS) return;
        if (since) {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k !== 'token') keys.push(k);
            }
            keys.forEach((k) => localStorage.removeItem(k));
        }
        localStorage.setItem(STORAGE_SINCE_KEY, String(now));
    } catch { /* storage unavailable: nothing is kept anyway */ }
};

// ---------- what logout leaves behind ----------

/**
 * Personal values earlier builds copied to localStorage at login or during
 * sign-up. Logout removes them so the next person on a shared phone does not
 * find them. Language and pure display flags stay.
 */
export const PERSONAL_STORAGE_KEYS = [
    'userId', 'userEmail', 'userName', 'balance', 'usdBalance', 'avatar', 'momo', 'momoCorrespondent',
    'signupFormData', 'signupFormStep', 'signupChatDraft',
];

export const clearPersonalStorage = () => {
    for (const key of PERSONAL_STORAGE_KEYS) {
        try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
    }
};
