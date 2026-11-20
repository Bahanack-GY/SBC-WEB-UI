import { useState } from 'react';
import AuthenticatorSetupSheet from './AuthenticatorSetupSheet';
import { useAuthenticatorStatus } from './authenticator';

/**
 * Profile card: whether the authenticator app is set up (required to withdraw
 * and to change the MoMo number or crypto wallet), and the setup button.
 */
export default function AuthenticatorCard() {
  const { status, refresh } = useAuthenticatorStatus(true);
  const [setupOpen, setSetupOpen] = useState(false);

  return (
    <div className="bg-blue-50 border border-border rounded-xl p-4">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">🔐 Application d’authentification</h3>
      {!status ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : status.enabled ? (
        <div className="text-sm text-gray-700 space-y-1">
          <p><span className="text-green-700 font-medium">Activée</span>{status.enrolledAt ? ` depuis le ${new Date(status.enrolledAt).toLocaleDateString('fr-FR')}` : ''}.</p>
          <p>Codes de secours restants : {status.backupCodesRemaining}.</p>
          <p className="text-xs text-gray-500">Téléphone perdu : utilisez un code de secours, sinon contactez le support (menu Aide).</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Obligatoire pour retirer et pour changer votre numéro Mobile Money ou votre portefeuille crypto.
            Installez Google Authenticator, Microsoft Authenticator ou 2FAS, puis configurez-la ici.
          </p>
          <button type="button" onClick={() => setSetupOpen(true)} className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-medium">
            Configurer
          </button>
        </div>
      )}
      <AuthenticatorSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} onDone={() => void refresh()} />
    </div>
  );
}
