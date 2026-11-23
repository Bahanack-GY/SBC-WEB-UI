import { HugeiconsIcon } from '@hugeicons/react';
import { Call02Icon, Mail01Icon, SquareLock02Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cleanBanMessage, forgetBanMessage, storedBanMessage } from '../components/security/accountBanned';
import logo from '../assets/img/logo-sbc.png';

/** The contacts SBC already publishes (PublicLanding « Nous contacter », PublicLegal). */
const SUPPORT_EMAIL = 'reseautage.sbc@gmail.com';
const SUPPORT_PHONES = [
  { href: 'tel:+237682903535', label: '+237 6 82 90 35 35', city: 'Yaoundé' },
  { href: 'tel:+237697470426', label: '+237 6 97 47 04 26', city: 'Douala' },
];

/**
 * `/compte-suspendu`: the server refused a call with 403 ACCOUNT_BANNED
 * (components/security/accountBanned.ts). Public on purpose and calls no member route:
 * the session is already forgotten on this device, and any member call would be refused
 * again. No member data here. Support is reached without an account: « Signaler un
 * problème » (support-service guest request), e-mail or phone.
 */
export default function AccountSuspended() {
  const navigate = useNavigate();
  const location = useLocation();
  const { forgetSession } = useAuth();
  const [message] = useState(() => cleanBanMessage((location.state as { message?: unknown } | null)?.message) || storedBanMessage());

  const backToLogin = () => {
    // Local only (no member route): the server already ended this account's sessions.
    forgetSession?.();
    forgetBanMessage();
    try { sessionStorage.setItem('justLoggedOutAt', String(Date.now())); } catch { /* ignore */ }
    navigate('/connexion', { replace: true });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <img src={logo} alt="SBC" className="h-10 mx-auto object-contain" />

        <section className="bg-surface border border-border rounded-2xl p-6 space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary-soft text-primary flex items-center justify-center">
            <HugeiconsIcon icon={SquareLock02Icon} size={28} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Compte suspendu</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Votre compte a été suspendu à la suite d’une demande de retrait signalée par les contrôles de sécurité de SBC.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Tant que l’équipe support examine votre dossier, les retraits et l’accès au compte sont bloqués.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Inutile de créer un nouveau compte : il serait suspendu lui aussi.
          </p>
          {message && (
            <div className="text-left bg-surface-2 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Message de SBC</p>
              <p className="text-sm text-gray-800 whitespace-pre-line break-words" data-testid="ban-message">{message}</p>
            </div>
          )}
        </section>

        <section className="bg-surface border border-border rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Contacter le support</h2>
          <p className="text-sm text-gray-600">
            Expliquez votre situation au support : il vous répondra après examen de votre compte.
          </p>
          <button
            type="button"
            onClick={() => navigate('/signaler-un-probleme')}
            className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl py-3 font-medium"
          >
            Écrire au support
          </button>
          <ul className="space-y-2 text-sm text-gray-700 pt-1">
            <li className="flex items-center gap-3">
              <HugeiconsIcon icon={Mail01Icon} size={18} className="text-primary shrink-0" />
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline break-all">{SUPPORT_EMAIL}</a>
            </li>
            {SUPPORT_PHONES.map((p) => (
              <li key={p.href} className="flex items-center gap-3">
                <HugeiconsIcon icon={Call02Icon} size={18} className="text-primary shrink-0" />
                <span><a href={p.href} className="hover:underline">{p.label}</a> ({p.city})</span>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          onClick={backToLogin}
          className="w-full border border-border bg-surface rounded-xl py-3 font-medium text-gray-700"
        >
          Retour à la connexion
        </button>
      </div>
    </main>
  );
}
