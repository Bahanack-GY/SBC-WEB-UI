import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/img/logo-sbc.png';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

// Where we stash the full /sso/authorize URL while the user goes through
// /connexion or /signup. Connexion + OTP read this back after login.
const RETURN_TO_KEY = 'sso_return_to';

// Hardcoded v1 client display names. Replaced later by a backend
// /api/sso/clients/:clientId/public-info call.
const CLIENT_NAMES: Record<string, string> = {
  'sbc-live': 'SBC Live',
  'sbc-live-test': 'SBC Live (Test)',
};

// Map raw scope strings to user-facing French descriptions.
const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'profile.read': 'Lire votre profil (nom, email, abonnement, nombre de filleuls)',
  'payments.write': 'Effectuer des paiements en votre nom',
  'wallet.read': 'Voir le solde de votre portefeuille',
};

type Status = 'idle' | 'submitting' | 'serverError';

interface GrantCodeResponse {
  code?: string;
  expiresAt?: string;
  grantedScopes?: string[];
}

interface ParsedParams {
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  state: string | null;
}

function parseParams(search: string): ParsedParams | null {
  const params = new URLSearchParams(search);
  const client_id = params.get('client_id');
  const redirect_uri = params.get('redirect_uri');
  const scopeParam = params.get('scope');
  if (!client_id || !redirect_uri || !scopeParam) return null;
  const scopes = scopeParam
    .split(/[\s+]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (scopes.length === 0) return null;
  return {
    client_id,
    redirect_uri,
    scopes,
    state: params.get('state'),
  };
}

function buildRedirect(
  redirectUri: string,
  extra: Record<string, string>,
  state: string | null,
): string | null {
  try {
    const url = new URL(redirectUri);
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    if (state) url.searchParams.set('state', state);
    return url.toString();
  } catch {
    return null;
  }
}

export default function SsoAuthorize() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const parsed = useMemo(() => parseParams(location.search), [location.search]);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // Guard against double-clicks racing to fire two grant-code calls.
  const inFlightRef = useRef(false);

  // Save the full /sso/authorize URL and bounce unauthenticated users to
  // /connexion. Runs once after auth resolves.
  useEffect(() => {
    if (authLoading) return;
    if (!parsed) return; // malformed URL — handled by the render path below
    if (isAuthenticated) return;
    sessionStorage.setItem(RETURN_TO_KEY, location.pathname + location.search);
    navigate('/connexion', { replace: true });
  }, [authLoading, isAuthenticated, parsed, location.pathname, location.search, navigate]);

  if (!parsed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <img src={logo} alt="SBC" className="w-24 mb-6 object-contain" />
        <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h1 className="text-lg font-bold text-red-700 mb-2">Lien invalide</h1>
          <p className="text-sm text-red-600">
            Ce lien est mal formé. Veuillez retourner à l'application qui vous a envoyé ici.
          </p>
        </div>
      </div>
    );
  }

  // Hold the consent UI until auth is resolved. The redirect-on-unauth above
  // handles the "not logged in" case; this prevents flashing the consent
  // screen with no user.email while auth is still loading.
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#115CF6]" />
      </div>
    );
  }

  const { client_id, redirect_uri, scopes, state } = parsed;
  const clientName = CLIENT_NAMES[client_id] ?? client_id;

  const handleAllow = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus('submitting');
    setErrorMessage('');
    try {
      const response = await sbcApiService.ssoGrantCode({
        client_id,
        redirect_uri,
        scopes,
      });

      if (response.isSuccessByStatusCode) {
        const data = handleApiResponse(response) as GrantCodeResponse;
        const code = data?.code;
        if (!code) {
          inFlightRef.current = false;
          setStatus('serverError');
          setErrorMessage("Réponse invalide du serveur. Veuillez réessayer.");
          return;
        }
        const target = buildRedirect(redirect_uri, { code }, state);
        if (!target) {
          inFlightRef.current = false;
          setStatus('serverError');
          setErrorMessage("L'URL de redirection est invalide.");
          return;
        }
        window.location.replace(target);
        return;
      }

      // Backend explicitly rejected the request — surface as an OAuth error
      // redirect IF we trust the redirect_uri shape. The backend would have
      // 400'd if the redirect_uri wasn't whitelisted, so we never round-trip
      // an error to an arbitrary URL.
      if (response.statusCode === 400) {
        const message =
          response.body?.message ||
          response.body?.error ||
          "Demande rejetée par le serveur.";
        // Show inline error on our own page — we do NOT redirect to the
        // attacker-supplied redirect_uri with a server error. The backend
        // 400 means the redirect_uri (or client / scope) wasn't trusted in
        // the first place, so bouncing the user there is wrong.
        inFlightRef.current = false;
        setStatus('serverError');
        setErrorMessage(message);
        return;
      }

      // 401 should already be intercepted by the standard ApiService session
      // handler. If it slips through, treat as transient.
      inFlightRef.current = false;
      setStatus('serverError');
      setErrorMessage(
        response.body?.message ||
          "Échec temporaire. Veuillez réessayer.",
      );
    } catch (err: any) {
      inFlightRef.current = false;
      setStatus('serverError');
      setErrorMessage(err?.message || "Échec temporaire. Veuillez réessayer.");
    }
  };

  const handleDeny = () => {
    if (inFlightRef.current) return;
    const target = buildRedirect(
      redirect_uri,
      { error: 'access_denied', error_description: "L'utilisateur a refusé." },
      state,
    );
    if (!target) {
      setStatus('serverError');
      setErrorMessage("L'URL de redirection est invalide.");
      return;
    }
    window.location.replace(target);
  };

  const handleSwitchAccount = async () => {
    // AuthContext.logout() runs sessionStorage.clear(), so we must save the
    // return-to AFTER logout completes — otherwise the key gets wiped and
    // the user lands on /abonnement (their default post-login destination)
    // instead of back here.
    const returnTo = location.pathname + location.search;
    await logout();
    sessionStorage.setItem(RETURN_TO_KEY, returnTo);
    navigate('/connexion', { replace: true });
  };

  const submitting = status === 'submitting';

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-4 mt-4 sm:mt-0">
          <img src={logo} alt="SBC" className="w-20 sm:w-24 object-contain" />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">
            {clientName}
          </h1>
          <p className="text-sm text-gray-600 text-center mb-5">
            souhaite accéder à votre compte SBC
          </p>

          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-800 mb-2">
              Cette application demande :
            </p>
            <ul className="space-y-2">
              {scopes.map((scope) => {
                const known = SCOPE_DESCRIPTIONS[scope];
                return (
                  <li
                    key={scope}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-[#115CF6] mt-1">•</span>
                    <span>
                      {known ?? (
                        <>
                          {scope}{' '}
                          <span className="text-gray-400">(usage interne)</span>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5">
            <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
            <p className="text-sm font-medium text-gray-800 break-all">
              {user?.email}
            </p>
            <button
              type="button"
              onClick={handleSwitchAccount}
              disabled={submitting}
              className="mt-2 min-h-[44px] w-full sm:w-auto text-sm font-medium text-[#115CF6] hover:underline disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              Pas vous&nbsp;? Déconnexion
            </button>
          </div>

          {status === 'serverError' && errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleAllow}
              disabled={submitting}
              className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              <span>
                {submitting && status === 'submitting'
                  ? 'Autorisation…'
                  : 'Autoriser'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDeny}
              disabled={submitting}
              className="w-full min-h-[48px] bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 font-bold rounded-xl"
            >
              Refuser
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            En autorisant, vous acceptez que <strong>{clientName}</strong>{' '}
            reçoive ces informations. Vous pouvez révoquer l'accès à tout moment
            depuis votre profil SBC (à venir).
          </p>
        </div>
      </div>
    </div>
  );
}
