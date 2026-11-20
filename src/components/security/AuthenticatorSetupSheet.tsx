import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Copy01Icon, Loading03Icon, LockPasswordIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useEffect, useState, type FormEvent } from 'react';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called once the app is set up (after the backup codes were shown). */
  onDone: () => void;
}

type Step = 'password' | 'email' | 'scan' | 'backup';

/**
 * Setting up the authenticator app (Security plan Phase 3): required before
 * withdrawing or changing the MoMo number / crypto wallet.
 *   1. account password → a code to the account's e-mail (or WhatsApp)
 *   2. that code → QR code (and the key, for typing it in)
 *   3. the first code shown by the app → 10 backup codes, shown once
 */
export default function AuthenticatorSetupSheet({ open, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [appCode, setAppCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [qr, setQr] = useState<{ qrDataUrl: string; secret: string; otpauthUrl: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('password');
    setPassword('');
    setEmailCode('');
    setAppCode('');
    setQr(null);
    setBackupCodes([]);
    setSaved(false);
    setError('');
  }, [open]);

  if (!open) return null;

  const run = async (fn: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (e?: FormEvent, resend = false) => {
    e?.preventDefault();
    if (!resend && !password) return setError('Entrez le mot de passe de votre compte.');
    return run(async () => {
      const data = handleApiResponse(await sbcApiService.requestAuthenticatorSetup(resend ? undefined : password));
      setSentTo(data?.sentTo || 'votre adresse e-mail');
      setStep('email');
    });
  };

  const checkEmailCode = (e: FormEvent) => {
    e.preventDefault();
    if (emailCode.trim().length < 4) return setError('Entrez le code reçu.');
    return run(async () => {
      const data = handleApiResponse(await sbcApiService.startAuthenticatorSetup(emailCode.trim()));
      setQr(data);
      setStep('scan');
    });
  };

  const confirmApp = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(appCode)) return setError('Entrez le code à 6 chiffres affiché par l’application.');
    return run(async () => {
      const data = handleApiResponse(await sbcApiService.confirmAuthenticatorSetup(appCode));
      setBackupCodes(Array.isArray(data?.backupCodes) ? data.backupCodes : []);
      setStep('backup');
    });
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  };

  const finish = () => {
    onDone();
    onClose();
  };

  const input = 'w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white';
  const primary = 'w-full bg-primary text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-60';
  const groupedSecret = qr?.secret.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="auth-setup-title">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="auth-setup-title" className="text-lg font-semibold text-gray-900">Application d’authentification</h3>
          {step !== 'backup' && (
            <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-gray-500 hover:text-gray-800">
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>
          )}
        </div>

        {step === 'password' && (
          <form onSubmit={e => void sendCode(e)} className="space-y-4">
            <p className="text-sm text-gray-700">
              Pour protéger votre argent, un code de l’application d’authentification vous sera demandé pour chaque retrait
              et pour changer votre numéro Mobile Money ou votre portefeuille crypto.
            </p>
            <p className="text-sm text-gray-700">
              Installez d’abord <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> ou <strong>2FAS</strong> depuis
              le Play Store ou l’App Store, puis continuez.
            </p>
            <div>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="auth-password">Mot de passe du compte</label>
              <input id="auth-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={input} data-openreplay-hidden="" />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className={primary}>
              {busy ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} /> : <HugeiconsIcon icon={LockPasswordIcon} size={18} />}
              Continuer
            </button>
          </form>
        )}

        {step === 'email' && (
          <form onSubmit={e => void checkEmailCode(e)} className="space-y-4">
            <p className="text-sm text-gray-700">
              Un code a été envoyé à <strong>{sentTo}</strong>. Entrez-le pour prouver que c’est bien vous.
            </p>
            <input
              aria-label="Code reçu"
              autoComplete="one-time-code"
              maxLength={8}
              value={emailCode}
              onChange={e => setEmailCode(e.target.value)}
              className={`${input} text-center font-mono tracking-[0.3em] text-lg`}
              placeholder="Code"
              data-openreplay-hidden=""
            />
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className={primary}>
              {busy && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} />}
              Continuer
            </button>
            <div className="text-right text-sm">
              <button type="button" className="text-primary underline disabled:opacity-60" disabled={busy} onClick={() => void sendCode(undefined, true)}>Renvoyer le code</button>
            </div>
          </form>
        )}

        {step === 'scan' && qr && (
          <form onSubmit={e => void confirmApp(e)} className="space-y-4">
            <ol className="text-sm text-gray-700 list-decimal pl-5 space-y-1">
              <li>Dans l’application, touchez <strong>+</strong> puis <strong>Scanner un code QR</strong>.</li>
              <li>Scannez ce code. Sur ce même téléphone, utilisez plutôt la clé ci-dessous (« Saisir une clé »).</li>
              <li>Tapez le code à 6 chiffres que l’application affiche pour « SBC ».</li>
            </ol>
            <div className="flex justify-center">
              <img src={qr.qrDataUrl} alt="Code QR à scanner avec l’application d’authentification" className="w-48 h-48" />
            </div>
            <div className="bg-gray-50 border border-border rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Clé (à saisir dans l’application si vous ne pouvez pas scanner)</p>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-sm break-all" data-openreplay-hidden="">{groupedSecret}</code>
                <button type="button" onClick={() => void copy(qr.secret, 'key')} className="text-primary shrink-0" aria-label="Copier la clé">
                  <HugeiconsIcon icon={copied === 'key' ? Tick02Icon : Copy01Icon} size={18} />
                </button>
              </div>
              <a href={qr.otpauthUrl} className="text-xs text-primary underline mt-2 inline-block">Ouvrir directement dans l’application</a>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="auth-first-code">Code affiché par l’application</label>
              <input
                id="auth-first-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={appCode}
                onChange={e => setAppCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${input} text-center font-mono tracking-[0.4em] text-lg`}
                placeholder="000000"
                data-openreplay-hidden=""
              />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className={primary}>
              {busy && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} />}
              Activer
            </button>
          </form>
        )}

        {step === 'backup' && (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
              <HugeiconsIcon icon={Tick02Icon} size={24} />
            </div>
            <p className="text-center text-gray-800 font-medium">L’application d’authentification est activée.</p>
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Notez ces 10 codes de secours et gardez-les en lieu sûr (pas dans ce téléphone). Si vous perdez votre téléphone,
              chacun remplace une fois le code de l’application. Ils ne seront plus affichés.
            </p>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm" data-openreplay-hidden="">
              {backupCodes.map(c => <li key={c} className="bg-gray-50 border border-border rounded-lg px-2 py-1 text-center">{c}</li>)}
            </ul>
            <button type="button" onClick={() => void copy(backupCodes.join('\n'), 'codes')} className="w-full border border-primary text-primary rounded-xl py-2.5 font-medium flex items-center justify-center gap-2">
              <HugeiconsIcon icon={copied === 'codes' ? Tick02Icon : Copy01Icon} size={18} />
              {copied === 'codes' ? 'Codes copiés' : 'Copier les codes'}
            </button>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} className="mt-1" />
              J’ai noté mes codes de secours.
            </label>
            <button type="button" disabled={!saved} onClick={finish} className={primary}>Terminer</button>
          </div>
        )}
      </div>
    </div>
  );
}
