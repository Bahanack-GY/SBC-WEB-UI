import { HugeiconsIcon } from '@hugeicons/react';
import { SecurityCheckIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import AuthenticatorSetupSheet from './AuthenticatorSetupSheet';

interface Props {
  /** What the member was trying to do, e.g. « changer votre numéro Mobile Money ». */
  action: string;
  /** Called once the app is set up. */
  onReady: () => void;
}

/** Shown instead of a form while the member has no authenticator app. */
export default function AuthenticatorRequiredNotice({ action, onReady }: Props) {
  const [setupOpen, setSetupOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <HugeiconsIcon icon={SecurityCheckIcon} size={24} />
      </div>
      <p className="text-sm text-gray-700 text-center">
        Pour {action}, configurez d’abord l’application d’authentification (Google Authenticator, Microsoft Authenticator ou 2FAS).
        Elle protège votre argent : sans votre téléphone, personne ne peut retirer ni changer où vous recevez vos retraits.
      </p>
      <button type="button" onClick={() => setSetupOpen(true)} className="w-full bg-primary text-white rounded-xl py-3 font-medium">
        Configurer maintenant
      </button>
      <AuthenticatorSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} onDone={onReady} />
    </div>
  );
}
