import { useState } from 'react';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * The code from the authenticator app (6 digits), or a backup code
 * (XXXX-XXXX-XXXX) when the phone is not at hand.
 */
export default function AuthenticatorCodeField({ id, value, onChange }: Props) {
  const [backup, setBackup] = useState(false);
  const input = 'w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white';

  return (
    <div>
      <label className="block text-gray-700 text-sm mb-1" htmlFor={id}>
        {backup ? 'Code de secours' : 'Code de l’application d’authentification'}
      </label>
      {backup ? (
        <input
          id={id}
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={16}
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase())}
          className={`${input} text-center font-mono tracking-widest`}
          placeholder="XXXX-XXXX-XXXX"
          data-openreplay-hidden=""
        />
      ) : (
        <input
          id={id}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className={`${input} text-center font-mono tracking-[0.4em] text-lg`}
          placeholder="000000"
          data-openreplay-hidden=""
        />
      )}
      <div className="flex justify-between items-center mt-1">
        <p className="text-xs text-gray-500">
          {backup ? 'Chaque code de secours ne sert qu’une fois.' : 'Ouvrez Google Authenticator (ou 2FAS…) : le code change toutes les 30 secondes.'}
        </p>
        <button type="button" className="text-xs text-primary underline shrink-0 ml-2" onClick={() => { setBackup(b => !b); onChange(''); }}>
          {backup ? 'Utiliser l’application' : 'Code de secours'}
        </button>
      </div>
    </div>
  );
}

/** Whether the field holds something worth sending. */
export const codeLooksComplete = (code: string) => /^\d{6}$/.test(code) || code.replace(/[^A-Z0-9]/gi, '').length === 12;
