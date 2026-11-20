import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Loading03Icon, LockPasswordIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { sbcApiService } from '../../services/SBCApiService';
import { getCountryByCode, getMomoOperatorDisplayName, momoCorrespondents } from '../../utils/countriesData';
import AuthenticatorCodeField, { codeLooksComplete } from '../security/AuthenticatorCodeField';
import AuthenticatorRequiredNotice from '../security/AuthenticatorRequiredNotice';
import { AuthenticatorRequired, unwrap, useAuthenticatorStatus } from '../security/authenticator';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called once the change is saved. `lockedUntil` is set when withdrawals are now blocked. */
  onDone: (result: { momoNumber: string; momoOperator: string; lockedUntil: string | null }) => void;
  /** The account's country (ISO code): it decides the dialling code and the operators. */
  countryCode: string;
  currentNumber?: string;
  currentOperator?: string;
}

/** The national part of a stored number (without the dialling code). */
const nationalPart = (stored: string | undefined, dial: string): string => {
  const digits = String(stored || '').replace(/\D/g, '');
  const code = dial.replace(/\D/g, '');
  return code && digits.startsWith(code) ? digits.slice(code.length) : digits;
};

/**
 * Changing (or setting) the Mobile Money number that receives withdrawals
 * (Security plan Phase 0 + 3): the account password and the code from the
 * authenticator app (or a backup code). A member without the app is asked to
 * set it up first. Replacing a number blocks withdrawals for 48 h; the window
 * says so before and after.
 */
export default function MomoChangeSheet({ open, onClose, onDone, countryCode, currentNumber, currentOperator }: Props) {
  const country = getCountryByCode(countryCode);
  const dial = country?.phoneCode || '';
  const operators = useMemo(() => momoCorrespondents[countryCode]?.operators || [], [countryCode]);
  const hasNumber = !!currentNumber;
  const { status, error: statusError, refresh } = useAuthenticatorStatus(open);

  const [done, setDone] = useState(false);
  const [number, setNumber] = useState('');
  const [operator, setOperator] = useState('');
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
    setNumber(nationalPart(currentNumber, dial));
    setOperator(currentOperator && operators.includes(currentOperator) ? currentOperator : '');
    setPassword('');
    setCode('');
    setError('');
    setLockedUntil(null);
  }, [open, currentNumber, currentOperator, dial, operators]);

  if (!open) return null;

  const fullNumber = () => {
    const digits = number.replace(/\D/g, '');
    const codeDigits = dial.replace(/\D/g, '');
    return codeDigits && !digits.startsWith(codeDigits) ? `${codeDigits}${digits}` : digits;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (number.replace(/\D/g, '').length < 6) return setError('Entrez votre numéro Mobile Money.');
    if (!operator) return setError('Choisissez votre opérateur.');
    if (!password) return setError('Entrez le mot de passe de votre compte.');
    if (!codeLooksComplete(code)) return setError('Entrez le code à 6 chiffres de l’application d’authentification.');
    setBusy(true);
    try {
      const data = unwrap(await sbcApiService.changeMomo(fullNumber(), operator, password, code.trim()));
      const until = data?.withdrawalsLockedUntil || null;
      setLockedUntil(until);
      setDone(true);
      onDone({ momoNumber: data?.momoNumber || fullNumber(), momoOperator: data?.momoOperator || operator, lockedUntil: until });
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
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="momo-change-title">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 id="momo-change-title" className="text-lg font-semibold text-gray-900">
            {hasNumber ? 'Changer de numéro Mobile Money' : 'Ajouter un numéro Mobile Money'}
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
          <AuthenticatorRequiredNotice action="changer votre numéro Mobile Money" onReady={() => void refresh()} />
        )}

        {!done && status?.enabled && (
          <form onSubmit={e => void submit(e)} className="space-y-4">
            {hasNumber && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Pour protéger votre argent, les retraits seront bloqués pendant 48 h après le changement, et un e-mail vous préviendra.
              </p>
            )}
            <div>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="momo-number">Numéro Mobile Money</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-500 font-medium">{dial}</span>
                <input id="momo-number" inputMode="tel" autoComplete="tel-national" value={number} onChange={e => setNumber(e.target.value)} className={`${input} pl-16`} placeholder="675080477" />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="momo-operator">Opérateur</label>
              <select id="momo-operator" value={operator} onChange={e => setOperator(e.target.value)} className={input}>
                <option value="">Choisir l’opérateur</option>
                {operators.map(op => <option key={op} value={op}>{getMomoOperatorDisplayName(op)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="momo-password">Mot de passe du compte</label>
              <input id="momo-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={input} data-openreplay-hidden="" />
            </div>
            <AuthenticatorCodeField id="momo-code" value={code} onChange={setCode} />
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
            <p className="text-gray-800">Votre numéro Mobile Money est enregistré.</p>
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
