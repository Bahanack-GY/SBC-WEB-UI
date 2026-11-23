import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Loading03Icon, LockPasswordIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { sbcApiService } from '../../services/SBCApiService';
import { cryptoCurrencyName, normalizeCryptoAddress, supportedCryptoCurrencies } from '../../utils/cryptoWallet';
import AuthenticatorCodeField, { codeLooksComplete } from '../security/AuthenticatorCodeField';
import AuthenticatorRequiredNotice from '../security/AuthenticatorRequiredNotice';
import { AuthenticatorRequired, unwrap, useAuthenticatorStatus } from '../security/authenticator';
import { useBlockRemoteControl } from '../../services/remoteAssist';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called once the change is saved. `lockedUntil` is set when withdrawals are now blocked. */
  onDone: (result: { cryptoWalletAddress: string; cryptoWalletCurrency: string; lockedUntil: string | null }) => void;
  currentAddress?: string;
  currentCurrency?: string;
}

/**
 * Setting or changing the crypto wallet that receives crypto withdrawals
 * (Security plan Phase 0 + 3, same rule as the Mobile Money number): the
 * account password and the code from the authenticator app (or a backup
 * code). A member without the app is asked to set it up first. Replacing a
 * wallet blocks withdrawals for 48 h; the window says so before and after.
 */
export default function CryptoWalletChangeSheet({ open, onClose, onDone, currentAddress, currentCurrency }: Props) {
  useBlockRemoteControl(open);
  const hasWallet = !!currentAddress;
  const { status, error: statusError, refresh } = useAuthenticatorStatus(open);

  const [done, setDone] = useState(false);
  const [currency, setCurrency] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  // Reset only when the sheet opens: after a save the parent reloads the member,
  // which changes the current details, and must not wipe the success screen.
  const wasOpen = useRef(false);
  useEffect(() => {
    const opening = open && !wasOpen.current;
    wasOpen.current = open;
    if (!opening) return;
    setDone(false);
    setCurrency(currentCurrency && supportedCryptoCurrencies.some(c => c.code === currentCurrency) ? currentCurrency : '');
    setAddress('');
    setPassword('');
    setCode('');
    setError('');
    setLockedUntil(null);
  }, [open, currentCurrency]);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currency) return setError('Choisissez la cryptomonnaie.');
    const wallet = normalizeCryptoAddress(address, currency);
    if (!wallet) return setError(`Cette adresse n’est pas une adresse ${cryptoCurrencyName(currency)} valide. Vérifiez-la : une erreur ferait perdre l’argent.`);
    if (!password) return setError('Entrez le mot de passe de votre compte.');
    if (!codeLooksComplete(code)) return setError('Entrez le code à 6 chiffres de l’application d’authentification.');
    setBusy(true);
    try {
      const data = unwrap(await sbcApiService.changeCryptoWallet(currency, wallet, password, code.trim()));
      const until = data?.withdrawalsLockedUntil || null;
      setLockedUntil(until);
      setDone(true);
      onDone({ cryptoWalletAddress: data?.cryptoWalletAddress || wallet, cryptoWalletCurrency: data?.cryptoWalletCurrency || currency, lockedUntil: until });
    } catch (err) {
      if (err instanceof AuthenticatorRequired) {
        void refresh();
      } else {
        setError(err instanceof Error ? err.message : 'Le changement n’a pas pu être enregistré. Réessayez.');
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white';

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="crypto-change-title">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="crypto-change-title" className="text-lg font-semibold text-gray-900">
            {hasWallet ? 'Changer de portefeuille crypto' : 'Ajouter un portefeuille crypto'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-gray-500 hover:text-gray-800">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>

        {!done && !status && (
          statusError
            ? <p className="text-sm text-red-600" role="alert">{statusError}</p>
            : <div className="flex justify-center py-8"><HugeiconsIcon icon={Loading03Icon} className="animate-spin text-primary" size={24} /></div>
        )}

        {!done && status && !status.enabled && (
          <AuthenticatorRequiredNotice action="changer votre portefeuille crypto" onReady={() => void refresh()} />
        )}

        {!done && status?.enabled && (
          <form onSubmit={e => void submit(e)} className="space-y-4">
            {hasWallet && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Pour protéger votre argent, les retraits seront bloqués pendant 48 h après le changement, et un e-mail vous préviendra.
              </p>
            )}
            <div>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="crypto-currency">Cryptomonnaie</label>
              <select id="crypto-currency" value={currency} onChange={e => setCurrency(e.target.value)} className={input}>
                <option value="">Choisir la cryptomonnaie</option>
                {supportedCryptoCurrencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="crypto-address">Adresse du portefeuille</label>
              <input
                id="crypto-address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className={`${input} font-mono text-sm`}
                placeholder={currency ? `Adresse ${cryptoCurrencyName(currency)}` : 'Choisissez d’abord la cryptomonnaie'}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-gray-500 mt-1">Copiez-collez l’adresse depuis votre portefeuille : une erreur ferait perdre l’argent.</p>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="crypto-password">Mot de passe du compte</label>
              <input id="crypto-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={input} data-openreplay-hidden="" />
            </div>
            <AuthenticatorCodeField id="crypto-code" value={code} onChange={setCode} />
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-primary text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} /> : <HugeiconsIcon icon={LockPasswordIcon} size={18} />}
              Confirmer
            </button>
          </form>
        )}

        {done && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
              <HugeiconsIcon icon={Tick02Icon} size={24} />
            </div>
            <p className="text-gray-800">Votre portefeuille crypto est enregistré.</p>
            {lockedUntil && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Les retraits sont bloqués jusqu’au {new Date(lockedUntil).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.
              </p>
            )}
            <button type="button" onClick={onClose} className="w-full bg-primary text-white rounded-xl py-3 font-medium">Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}
