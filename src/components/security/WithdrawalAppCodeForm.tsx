import { useState } from 'react';
import AuthenticatorCodeField, { codeLooksComplete } from './AuthenticatorCodeField';
import { RiskHoldLink } from './RiskHoldLink';
import { isRiskHold } from './riskHold';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { useBlockRemoteControl } from '../../services/remoteAssist';

interface Props {
  transactionId: string;
  amount?: number;
  currency?: string;
  /** Called once the withdrawal is confirmed. */
  onConfirmed: () => void;
}

/**
 * Confirms a pending withdrawal with the authenticator app's code (or a backup
 * code). With the app set up, no code is e-mailed (Security plan Phase 3): the
 * /otp page used to ask for one anyway when reached from the Wallet form or the
 * transaction history, and the member waited for an e-mail that never came.
 */
export default function WithdrawalAppCodeForm({ transactionId, amount, currency, onConfirmed }: Props) {
  useBlockRemoteControl();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [held, setHeld] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!codeLooksComplete(code)) {
      setError('Entrez le code à 6 chiffres de l’application d’authentification.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const verified = await sbcApiService.verifyWithdrawal({ transactionId, verificationCode: code.trim() });
      setHeld(isRiskHold(verified));
      handleApiResponse(verified);
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le retrait n’a pas pu être confirmé.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-xs space-y-4">
      <div className="text-center font-semibold text-lg text-gray-800">Confirmer le retrait</div>
      <p className="text-sm text-gray-700 text-center">
        {amount !== undefined && <>Retrait de <strong>{amount} {currency || ''}</strong>. </>}
        Tapez le code affiché par votre application d’authentification. Aucun code n’est envoyé par e-mail.
      </p>
      <AuthenticatorCodeField id="withdrawal-app-code" value={code} onChange={setCode} />
      {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}
      {error && held && <RiskHoldLink />}
      <button type="submit" disabled={loading} className="w-full bg-primary text-white rounded-xl py-3 font-medium disabled:opacity-60">
        {loading ? 'Vérification…' : 'Confirmer le retrait'}
      </button>
    </form>
  );
}
