import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Loading03Icon, LockPasswordIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { getCountryByCode, getMomoOperatorDisplayName, momoCorrespondents } from '../../utils/countriesData';

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
 * (Security plan Phase 0): the account password, then the code sent (e-mail or WhatsApp, the member's code channel) to the
 * account address. Replacing a number blocks withdrawals for 48 h; the
 * window says so before and after.
 */
export default function MomoChangeSheet({ open, onClose, onDone, countryCode, currentNumber, currentOperator }: Props) {
  const country = getCountryByCode(countryCode);
  const dial = country?.phoneCode || '';
  const operators = useMemo(() => momoCorrespondents[countryCode]?.operators || [], [countryCode]);
  const hasNumber = !!currentNumber;

  const [step, setStep] = useState<'details' | 'code' | 'done'>('details');
  const [number, setNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('details');
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

  const request = async (e?: FormEvent, resend = false) => {
    e?.preventDefault();
    setError('');
    if (number.replace(/\D/g, '').length < 6) return setError('Entrez votre numéro Mobile Money.');
    if (!operator) return setError('Choisissez votre opérateur.');
    if (!resend && !password) return setError('Entrez le mot de passe de votre compte.');
    setBusy(true);
    try {
      const data = handleApiResponse(await sbcApiService.requestMomoChange(fullNumber(), operator, resend ? undefined : password));
      setSentTo(data?.sentTo || 'votre e-mail ou votre WhatsApp');
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le code n’a pas pu être envoyé. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.trim().length < 4) return setError('Entrez le code de confirmation reçu.');
    setBusy(true);
    try {
      const data = handleApiResponse(await sbcApiService.confirmMomoChange(fullNumber(), operator, code.trim()));
      const until = data?.withdrawalsLockedUntil || null;
      setLockedUntil(until);
      setStep('done');
      onDone({ momoNumber: data?.momoNumber || fullNumber(), momoOperator: data?.momoOperator || operator, lockedUntil: until });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le changement n’a pas pu être enregistré. Réessayez.');
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

        {step === 'details' && (
          <form onSubmit={e => void request(e)} className="space-y-4">
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
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-primary text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} /> : <HugeiconsIcon icon={LockPasswordIcon} size={18} />}
              Recevoir le code
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={e => void confirm(e)} className="space-y-4">
            <p className="text-sm text-gray-700">
              Un code a été envoyé à <strong>{sentTo}</strong>. Entrez-le pour confirmer le numéro {dial} {number.replace(/\D/g, '')} ({getMomoOperatorDisplayName(operator)}).
            </p>
            <input
              aria-label="Code de confirmation"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={e => setCode(e.target.value)}
              className={`${input} text-center font-mono tracking-[0.3em] text-lg`}
              placeholder="Code"
              data-openreplay-hidden=""
            />
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-primary text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {busy && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} />}
              Confirmer
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" className="text-gray-600 underline" onClick={() => { setStep('details'); setError(''); }}>Modifier le numéro</button>
              <button type="button" className="text-primary underline disabled:opacity-60" disabled={busy} onClick={() => void request(undefined, true)}>Renvoyer le code</button>
            </div>
          </form>
        )}

        {step === 'done' && (
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
