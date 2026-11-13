/**
 * Advertisers without an SBC pack (Rufus, 2026-11-13: requiring the pack was
 * costing campaigns). An account opened from /signup?annonceur=1 is registered
 * with signupIntent 'annonceur': the parrain code is optional, and the account
 * may use the advertiser pages without a pack. Everything else stays paywalled.
 */

/** The advertiser's home: their campaigns. Reachable without a pack. */
export const ANNONCEUR_HOME = '/ads-network/annonceur';

/** Where the public pages send someone who only wants to advertise. */
export const ANNONCEUR_SIGNUP = '/signup?annonceur=1';

/** True for an account opened to advertise (GET /users/me carries signupIntent). */
export const isAnnonceurAccount = (user: unknown): boolean =>
    (user as { signupIntent?: string } | null | undefined)?.signupIntent === 'annonceur';

/** True when the sign-up URL asks for an advertiser account (?annonceur=1). */
export const isAnnonceurSignup = (search: string): boolean => {
    const value = new URLSearchParams(search).get('annonceur');
    return value === '1' || value === 'true';
};
