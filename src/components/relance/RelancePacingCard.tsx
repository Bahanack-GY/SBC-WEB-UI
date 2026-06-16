import { useEffect, useRef, useState } from 'react';
import { FaCog, FaChevronRight, FaMinus, FaPlus } from 'react-icons/fa';
import { sbcApiService } from '../../services/SBCApiService';

interface RelancePacingCardProps {
  initialValue?: number;
  onSaved?: (value: number) => void;
}

const STEP = 50;
const MIN = 0;
const MAX = 5000;
const DEBOUNCE_MS = 800;

export default function RelancePacingCard({ initialValue, onSaved }: RelancePacingCardProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number>(initialValue ?? 500);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<number>(initialValue ?? 500);

  // Sync from prop when the parent first hydrates with /relance/status
  useEffect(() => {
    if (typeof initialValue === 'number') {
      setValue(initialValue);
      lastSavedRef.current = initialValue;
    }
  }, [initialValue]);

  const persist = (next: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (next === lastSavedRef.current) return;
      setStatus('saving');
      setErrorMessage('');
      try {
        const response = await sbcApiService.relanceUpdateConfig({ maxMessagesPerDay: next });
        if (response.isSuccessByStatusCode) {
          lastSavedRef.current = next;
          setStatus('saved');
          onSaved?.(next);
        } else {
          throw new Error(response.body?.message || 'Échec de l\'enregistrement');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Échec de l\'enregistrement');
      }
    }, DEBOUNCE_MS);
  };

  const clamp = (n: number) => Math.max(MIN, Math.min(MAX, Math.round(n)));

  const setAndPersist = (next: number) => {
    const clamped = clamp(next);
    setValue(clamped);
    persist(clamped);
  };

  return (
    <div className="relance-pacing-card bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 min-h-[56px] hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FaCog className="text-gray-600" />
          <span className="font-bold text-sm text-gray-800">Paramètres d'envoi</span>
        </div>
        <FaChevronRight className={`text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="p-4 pt-0 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-800 mb-1 mt-3" htmlFor="relance-pacing-input">
            Vitesse d'envoi par jour
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Vos crédits restent la limite finale. Recommandé : 500.
          </p>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setAndPersist(value - STEP)}
              aria-label="Diminuer"
              className="w-11 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-lg"
            >
              <FaMinus />
            </button>
            <input
              id="relance-pacing-input"
              type="number"
              inputMode="numeric"
              min={MIN}
              max={MAX}
              value={value}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setValue(0);
                  return;
                }
                const n = Number(raw);
                if (Number.isNaN(n)) return;
                setAndPersist(n);
              }}
              className="flex-1 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
            />
            <button
              type="button"
              onClick={() => setAndPersist(value + STEP)}
              aria-label="Augmenter"
              className="w-11 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-lg"
            >
              <FaPlus />
            </button>
          </div>

          <div className="mt-2 min-h-[20px] text-xs" role="status" aria-live="polite">
            {status === 'saving' && <span className="text-gray-500">Enregistrement…</span>}
            {status === 'saved' && <span className="text-green-600">✓ Enregistré</span>}
            {status === 'error' && <span className="text-red-600">{errorMessage || 'Échec de l\'enregistrement'}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
