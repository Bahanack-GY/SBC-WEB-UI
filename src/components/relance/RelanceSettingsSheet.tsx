import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Sheet } from './ui/Sheet';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { frenchErrorFrom } from '../../utils/relance';

const STEP = 50;
const MIN = 50;
const MAX = 5000;

/**
 * The one setting worth having: how many emails may go out per day. It used to
 * sit in an accordion called "Paramètres d'envoi", saved itself on every tap,
 * and was never actually enforced. It is now, so it gets a sentence saying why.
 */
export function RelanceSettingsSheet({
  open, onClose, maxPerDay, showSmsLinks, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  maxPerDay: number;
  showSmsLinks: boolean;
  onSaved: (value: number) => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState(maxPerDay);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setValue(maxPerDay); setError(null); }
  }, [open, maxPerDay]);

  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      handleApiResponse(await sbcApiService.relanceUpdateConfig({ maxMessagesPerDay: value }));
      await onSaved(value);
      onClose();
    } catch (err) {
      setError(frenchErrorFrom(err, "L'enregistrement a échoué. Réessayez."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Réglages"
      footer={
        <button
          onClick={save}
          disabled={saving || value === maxPerDay}
          className="w-full h-12 rounded-tile bg-primary text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      }
    >
      <h3 className="text-sm font-semibold text-ink">Emails maximum par jour</h3>
      <p className="text-sm text-ink-2 mt-1">
        Au-delà, les filleuls suivants reçoivent leur message le lendemain. Rien n'est perdu :
        un plafond raisonnable évite que vos emails finissent en spam.
      </p>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => setValue(v => clamp(v - STEP))}
          disabled={value <= MIN}
          aria-label="Moins"
          className="size-12 rounded-pill bg-surface-2 text-ink text-2xl font-semibold disabled:opacity-40"
        >−</button>
        <label className="text-center">
          <input
            type="number"
            inputMode="numeric"
            aria-label="Emails maximum par jour"
            value={value}
            min={MIN}
            max={MAX}
            step={STEP}
            onChange={e => setValue(clamp(Number(e.target.value) || MIN))}
            className="w-28 text-center text-3xl font-bold text-ink bg-transparent tabular-nums outline-none"
          />
          <span className="block text-xs text-ink-3">emails / jour</span>
        </label>
        <button
          onClick={() => setValue(v => clamp(v + STEP))}
          disabled={value >= MAX}
          aria-label="Plus"
          className="size-12 rounded-pill bg-surface-2 text-ink text-2xl font-semibold disabled:opacity-40"
        >+</button>
      </div>
      <p className="text-center text-xs text-ink-3 mt-2">Conseillé : 500</p>

      {error && <p role="alert" className="mt-4 text-sm text-danger text-center">{error}</p>}

      {showSmsLinks && (
        <button
          onClick={() => navigate('/relance/sms-links')}
          className="mt-6 w-full flex items-center gap-3 p-4 rounded-tile bg-surface-2 text-left"
        >
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink">Liens dans vos SMS</span>
            <span className="block text-xs text-ink-3">Le lien ajouté à chaque SMS de relance (Cameroun)</span>
          </span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3" />
        </button>
      )}
    </Sheet>
  );
}
