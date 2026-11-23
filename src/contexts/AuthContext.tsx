import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { clearAdsRolesCache } from '../hooks/useAdsRoles';
import { handleApiResponse, setToken, removeToken, getToken, getBaseUrl, hasSession } from '../utils/apiHelpers';
import { clearCookieSessionFlag, csrfToken, isCookieSession, markCookieSession, SESSION_ENDED_EVENT } from '../utils/session';
import { adoptSignInKey, clearSessionKey, ensureSessionKey, prepareSignInKey, retagKeyForCookieSession } from '../utils/requestSigning';
import { invalidateApiCache } from '../hooks/useApiCache';
import { clearPersonalStorage, type Consents } from '../utils/privacy';
import { ACCOUNT_BANNED_EVENT, AccountBannedError, isAccountBanned } from '../components/security/accountBanned';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
  avatarId?: string;
  referralCode?: string;
  momoNumber?: string;
  momoOperator?: string;
  whatsappGroupLink?: string;
  balance?: number;
  usdBalance?: number;
  cryptoWalletAddress?: string;
  cryptoWalletCurrency?: string;
  /** What the member accepted, and when (see utils/privacy). */
  consents?: Consents;
  /** Whether the member appears in the SBC contacts file. */
  shareContactInfo?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ requiresOtp: boolean; userId?: string; email?: string; otpRetryAfterSeconds?: number; hasNegativeBalance?: boolean; recoveryMessage?: string }>;
  register: (userData: any) => Promise<{ userId: string; signedIn: boolean }>;
  logout: () => Promise<void>;
  /** Signs out on this device only, without calling member routes (a suspended account). */
  forgetSession: () => void;
  verifyOtp: (userId: string, otp: string) => Promise<void>;
  updateProfile: (updates: Record<string, any>) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

/** The server granted a session: a token (as before) or HttpOnly cookies (Security plan Phase 9). */
const granted = (data: { token?: unknown; session?: unknown } | null | undefined) => !!data && (!!data.token || data.session === 'cookie');

/** A token kept from an earlier sign-in becomes a cookie session (the server answers `bearer` while its switch is off). */
async function adoptCookieSession(token: string): Promise<void> {
  try {
    const r = await fetch(`${getBaseUrl()}/users/session/adopt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}',
    });
    if (!r.ok) return;
    const data = (await r.json())?.data;
    if (data?.session !== 'cookie') return;
    if (data.keyKept) await retagKeyForCookieSession(token);
    markCookieSession();
    removeToken();
  } catch { /* keep the token: it still works */ }
}

/** Ends the cookie session even when the access cookie has already expired (reads the refresh cookie). */
async function endCookieSession(): Promise<void> {
  try {
    const csrf = csrfToken();
    await fetch(`${getBaseUrl()}/users/session/logout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: '{}',
    });
  } catch { /* the cookies expire by themselves */ }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && hasSession();

  // Load user on app start
  useEffect(() => {
    const initAuth = async () => {
      // Security plan Phase 9: an app still holding a token moves it to a cookie session once.
      const token = getToken();
      if (token) await adoptCookieSession(token);
      if (hasSession()) {
        try {
          await refreshUser();
        } catch (error) {
          removeToken();
          clearCookieSessionFlag();
        }
      }
      if (hasSession()) void ensureSessionKey(getToken(), getBaseUrl(), fetch, isCookieSession());
      setLoading(false);
    };

    initAuth();
  }, []);

  /** A granted session (code step, or sign-up / password-only sign-in): token, browser key, cached fields. */
  type SessionUser = { id?: string; _id?: string; email?: string; name?: string; firstName?: string; lastName?: string;
    balance?: number; usdBalance?: number; avatar?: string; momoNumber?: string; momoOperator?: string };
  /**
   * Security plan Phase 9: `session: 'cookie'` = the server set HttpOnly cookies and sent no token
   * (utils/session.ts); otherwise the token is kept as before.
   */
  const storeSession = async (data: { token?: string; session?: string; user?: SessionUser }, userId: string) => {
    if (data.session === 'cookie') {
      removeToken();
      markCookieSession();
      await adoptSignInKey(null);
    } else if (data.token) {
      setToken(data.token);
      await adoptSignInKey(data.token);
    }
    localStorage.setItem('userId', data.user?.id || data.user?._id || userId);
    localStorage.setItem('userEmail', data.user?.email || '');
    localStorage.setItem('userName', data.user?.name || `${data.user?.firstName || ''} ${data.user?.lastName || ''}`.trim());
    localStorage.setItem('balance', data.user?.balance?.toString() || '0');
    localStorage.setItem('usdBalance', data.user?.usdBalance?.toString() || '0');
    if (data.user?.avatar) {
      localStorage.setItem('avatar', data.user.avatar);
    }
    if (data.user?.momoNumber) {
      localStorage.setItem('momo', data.user.momoNumber);
      localStorage.setItem('momoCorrespondent', data.user.momoOperator || '');
    }
  };

  const login = async (identifier: string, password: string): Promise<{ requiresOtp: boolean; userId?: string; email?: string; otpRetryAfterSeconds?: number; hasNegativeBalance?: boolean; recoveryMessage?: string }> => {
    try {
      const devicePublicKey = await prepareSignInKey();
      const response = await sbcApiService.loginUser(identifier, password, devicePublicKey);
      // Suspended account (403 ACCOUNT_BANNED after a correct password): the login page shows /compte-suspendu.
      if (isAccountBanned(response)) throw new AccountBannedError(response.body?.message);

      const data = handleApiResponse(response);

      // Check if the response indicates OTP verification is required
      // This handles various possible response formats from the API
      const needsOtp = data.requiresOtp || data.otpRequired || data.needsVerification ||
        (!data.token && data.session !== 'cookie' && (data.userId || data.id)) ||
        data.status === 'pending_verification';


      if (needsOtp) {
        // OTP verification required - don't set token or user yet
        const userId = data.userId || data.id || data.user?.id;
        const userEmail = data.email || identifier;

        // Store userId temporarily for OTP verification (as per documentation)
        sessionStorage.setItem('tempUserId', userId);

        const result = {
          requiresOtp: true,
          userId: userId,
          email: userEmail,
          // How long before another code may be sent — the server may not have sent
          // one at all if the user was sent a code moments ago.
          otpRetryAfterSeconds: typeof data.otpRetryAfterSeconds === 'number' ? data.otpRetryAfterSeconds : undefined,
        };
        return result;
      }

      // Direct login success (no OTP required): an unpaid, unverified account (password only).
      if (granted(data)) {
        await storeSession(data, data.userId);
        sessionStorage.removeItem('tempUserId');
      }

      if (data.user) {
        setUser(data.user);
        
        // Check for negative balance and recovery options
        if (data.user.balance && data.user.balance < 0) {
          try {
            const recoveryResponse = await sbcApiService.checkRecoveryLogin(identifier);
            
            if (recoveryResponse) {
              const recoveryData = handleApiResponse(recoveryResponse);
              
              if (recoveryData?.data?.hasRecoverableTransactions) {
                const recoveryInfo = recoveryData.data;
                const recoveryMessage = `Votre compte a un solde négatif car vous avez probablement des filleuls qui ont payé mais leurs comptes n'ont pas encore été restaurés. Veuillez leur demander de s'inscrire avec l'email ou le numéro de téléphone qu'ils ont utilisé précédemment. Ils n'auront pas à payer à nouveau si le compte peut vraiment être récupéré. ${recoveryInfo.totalTransactions || 0} transactions récupérables trouvées d'une valeur de ${recoveryInfo.totalAmount || 0} XAF.`;
                
                return { 
                  requiresOtp: false, 
                  hasNegativeBalance: true, 
                  recoveryMessage 
                };
              }
            }
            
            // If no recoverable transactions found but balance is still negative, show generic message
            const genericMessage = `Votre compte a un solde négatif. Cela peut être dû à des transactions de vos filleuls qui n'ont pas encore été restaurées. Veuillez contacter le support si vous pensez qu'il s'agit d'une erreur.`;
            return { 
              requiresOtp: false, 
              hasNegativeBalance: true, 
              recoveryMessage: genericMessage 
            };
          } catch (recoveryError) {
            
            // Fallback message when recovery endpoints are not available
            const fallbackMessage = `Votre compte a un solde négatif. Si vous avez des filleuls qui ont effectué des paiements récemment, demandez-leur de s'inscrire avec le même email ou numéro de téléphone qu'ils ont utilisé précédemment pour restaurer leurs comptes.`;
            return { 
              requiresOtp: false, 
              hasNegativeBalance: true, 
              recoveryMessage: fallbackMessage 
            };
          }
        }
      } else if (granted(data)) {
        // If user data not returned but token exists, fetch it
        await refreshUser();
      }

      return { requiresOtp: false };
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: any): Promise<{ userId: string; signedIn: boolean }> => {
    try {
      const devicePublicKey = await prepareSignInKey();
      const response = await sbcApiService.registerUser({ ...userData, devicePublicKey });
      const data = handleApiResponse(response);

      const userId = data.userId || data.id;

      // Email verified after payment (2026-11-23): a member sign-up opens the session at once.
      if (granted(data)) {
        await storeSession(data, userId);
        if (data.user) setUser(data.user);
        else await refreshUser();
        sessionStorage.removeItem('tempUserId');
        return { userId, signedIn: true };
      }

      // Store userId for OTP verification (as per documentation)
      sessionStorage.setItem('tempUserId', userId);

      return { userId, signedIn: false };
    } catch (error) {
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout API
      await sbcApiService.logoutUser();
    } catch (error) {
      // Continue with local logout even if API call fails
    } finally {
      // A cookie session: the cookies are cleared server-side even if the call above failed.
      if (isCookieSession()) await endCookieSession();
      // Always clear local state
      removeToken();
      clearCookieSessionFlag();
      void clearSessionKey();
      setUser(null);

      // Clear sessionStorage to reset modal display logic for next login
      sessionStorage.clear();

      // Clear profile completion flags so new users get prompted
      localStorage.removeItem('profileCompletionDone');
      localStorage.removeItem('profileCompletionSkipped');

      // Name, e-mail, balance, Mobile Money number and sign-up drafts copied
      // to the device: none of it may outlive the session (APDP).
      clearPersonalStorage();

      // Ads Network role cache. Left behind, the next account to log in on this
      // device is routed by the previous account's roles.
      clearAdsRolesCache();

      // Drop the legacy permanent splash-viewed flag if a previous build wrote
      // it: we only want logout to redirect to /connexion *briefly*, never to
      // permanently suppress the onboarding splash on cold opens.
      localStorage.removeItem('splashViewed');

      // Timestamp the logout so ProtectedRoute can route the user to
      // /connexion during the short window where auth state has cleared but
      // the explicit navigate('/connexion') hasn't taken effect yet. Any later
      // unauthenticated visit (refresh, reopen) lands on /splash-screen.
      sessionStorage.setItem('justLoggedOutAt', String(Date.now()));
    }
  };

  /**
   * A suspended account (components/security/accountBanned.ts): the server already ended its
   * sessions, so nothing here calls a member route (each would be refused again). Only the
   * cookie logout, once, so the browser drops the cookies too.
   */
  const forgetSession = useCallback((): void => {
    const hadCookieSession = isCookieSession();
    removeToken();
    clearCookieSessionFlag();
    void clearSessionKey();
    setUser(null);
    try { sessionStorage.removeItem('tempUserId'); } catch { /* ignore */ }
    clearPersonalStorage();
    clearAdsRolesCache();
    if (hadCookieSession) void endCookieSession();
  }, []);

  const verifyOtp = useCallback(async (userId: string, otp: string): Promise<void> => {
    try {
      const devicePublicKey = await prepareSignInKey();
      const response = await sbcApiService.verifyOtp(userId, otp, devicePublicKey);
      const data = handleApiResponse(response);

      // Store authentication data as per documentation
      if (granted(data)) await storeSession(data, userId);

      if (data.user) {
        setUser(data.user);
      } else if (granted(data)) {
        await refreshUser();
      }

      // Clean up temporary data
      sessionStorage.removeItem('tempUserId');

      // Invalidate specific caches used by Home.tsx after user data is refreshed
      invalidateApiCache(['transaction-stats', 'referral-stats', 'current-subscription', 'formations']);
    } catch (error) {
      throw error;
    }
  }, [setUser]);

  const updateProfile = async (updates: Record<string, any>): Promise<void> => {
    try {
      const response = await sbcApiService.updateUserProfile(updates);
      const data = handleApiResponse(response);

      if (data.user) {
        setUser(data.user);
      } else {
        // Refresh user data to get updated info
        await refreshUser();
      }
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await sbcApiService.getUserProfile();
      const userData = handleApiResponse(response);
      setUser(userData);
      // Invalidate specific caches used by Home.tsx after user data is refreshed
      invalidateApiCache(['transaction-stats', 'referral-stats', 'current-subscription', 'formations']);
    } catch (error: any) {
      // If unauthorized, log out and set session expired flag
      if (error?.status === 401 || (error?.message && error.message.toLowerCase().includes('unauthorized'))) {
        await logout();
        localStorage.setItem('sessionExpired', '1');
      }
      throw error;
    }
  }, [setUser, logout]);

  // Security plan Phase 9: the cookie session could not be refreshed (expired, revoked, reused):
  // signed out, with the same "session expired" notice as a refused profile read.
  useEffect(() => {
    const onEnded = () => {
      if (!user) return;
      void logout().then(() => localStorage.setItem('sessionExpired', '1'));
    };
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, [user, logout]);

  // The server refused a call with ACCOUNT_BANNED: forget the session here (App shows /compte-suspendu).
  useEffect(() => {
    const onBanned = () => forgetSession();
    window.addEventListener(ACCOUNT_BANNED_EVENT, onBanned);
    return () => window.removeEventListener(ACCOUNT_BANNED_EVENT, onBanned);
  }, [forgetSession]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    forgetSession,
    verifyOtp,
    updateProfile,
    refreshUser,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
