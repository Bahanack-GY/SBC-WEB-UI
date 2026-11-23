import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { useBlockRemoteControl } from '../../services/remoteAssist';

/**
 * Email verified after payment (2026-11-23). Sign-up no longer asks for a code; once the
 * member has paid, the app stays on this screen until the code sent to the account's
 * e-mail is entered. A mistyped address can be corrected here (password required,
 * only while never verified). The server says when it applies
 * (`user.emailVerificationRequired`: paid, unverified, account from 2026-11-23).
 */
export default function VerifyEmailGate() {
  useBlockRemoteControl();
  const { user, refreshUser, logout } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [fixing, setFixing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const asked = useRef(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => Math.max(w - 1, 0)), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const onSent = (d: { alreadyVerified?: boolean; sent?: boolean; sentTo?: string | null; retryAfterSeconds?: number }) => {
    if (d?.alreadyVerified) { void refreshUser(); return; }
    if (d?.sentTo) setSentTo(d.sentTo);
    setWait(d?.retryAfterSeconds || 60);
    setInfo(d?.sent ? 'Code envoyé. Il est valable 10 minutes.' : 'Un code vous a déjà été envoyé : vérifiez votre boîte mail (et les spams).');
  };

  const send = async () => {
    if (busy || wait > 0) return;
    setBusy(true); setError('');
    try { onSent(handleApiResponse(await sbcApiService.requestEmailVerification())); }
    catch (e) { setError(e instanceof Error ? e.message : 'Le code n’a pas pu être envoyé.'); }
    finally { setBusy(false); }
  };

  // One code on arrival (the server sends the same one again if asked within its life).
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void send();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!/^[A-Za-z0-9]{6}$/.test(code.trim())) { setError('Entrez le code à 6 caractères reçu par e-mail.'); return; }
    setBusy(true); setError('');
    try {
      handleApiResponse(await sbcApiService.confirmEmailVerification(code.trim()));
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error && err.message && !/mot de passe ou email/i.test(err.message) ? err.message : 'Code invalide ou expiré.');
      setCode('');
    } finally { setBusy(false); }
  };

  const correct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      onSent(handleApiResponse(await sbcApiService.correctUnverifiedEmail(newEmail.trim(), password)));
      setFixing(false); setPassword(''); setNewEmail(''); setCode('');
      void refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L’adresse n’a pas pu être corrigée.');
    } finally { setBusy(false); }
  };

  const input = 'w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white';

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">Vérifiez votre adresse e-mail</h1>
          <p className="text-sm text-gray-600">
            Merci pour votre paiement ! Dernière étape : confirmez votre adresse e-mail. Elle sert à protéger votre compte
            et à vous envoyer vos codes de connexion.
          </p>
        </div>

        {!fixing ? (
          <form onSubmit={confirm} className="space-y-4" aria-label="Code de vérification">
            <p className="text-sm text-gray-700 text-center">
              Code envoyé à <strong>{sentTo || user?.email || 'votre adresse'}</strong>
            </p>
            <label className="block text-gray-700 text-sm" htmlFor="verify-email-code">Code reçu par e-mail</label>
            <input
              id="verify-email-code"
              autoComplete="one-time-code"
              data-openreplay-hidden=""
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase())}
              className={`${input} text-center font-mono tracking-[0.4em] text-lg`}
              placeholder="••••••"
            />
            {info && !error && <p className="text-xs text-gray-500 text-center">{info}</p>}
            {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-primary text-white rounded-xl py-3 font-medium disabled:opacity-60">
              {busy ? 'Vérification…' : 'Vérifier'}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => void send()} disabled={busy || wait > 0} className="text-primary underline disabled:text-gray-400 disabled:no-underline">
                {wait > 0 ? `Renvoyer dans ${wait} s` : 'Renvoyer le code'}
              </button>
              <button type="button" onClick={() => { setFixing(true); setError(''); }} className="text-primary underline">
                Mauvaise adresse ?
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">Pas reçu ? Regardez dans les spams ou le courrier indésirable.</p>
          </form>
        ) : (
          <form onSubmit={correct} className="space-y-4" aria-label="Corriger l’adresse e-mail">
            <p className="text-sm text-gray-700">Tapez la bonne adresse et le mot de passe de votre compte : le code partira à la nouvelle adresse.</p>
            <label className="block text-gray-700 text-sm" htmlFor="verify-email-new">Bonne adresse e-mail</label>
            <input id="verify-email-new" type="email" autoComplete="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={input} />
            <label className="block text-gray-700 text-sm" htmlFor="verify-email-password">Mot de passe</label>
            <input id="verify-email-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={input} data-openreplay-hidden="" />
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy || !newEmail || !password} className="w-full bg-primary text-white rounded-xl py-3 font-medium disabled:opacity-60">
              {busy ? 'Envoi…' : 'Corriger et recevoir le code'}
            </button>
            <button type="button" onClick={() => { setFixing(false); setError(''); }} className="w-full text-sm text-gray-600 underline">Annuler</button>
          </form>
        )}

        <button type="button" onClick={() => void logout()} className="w-full text-sm text-gray-500 underline">Se déconnecter</button>
      </div>
    </div>
  );
}
