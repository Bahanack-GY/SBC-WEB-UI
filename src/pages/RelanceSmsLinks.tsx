import { useEffect, useState } from 'react';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { SmsLink } from '../types/relance';

// Auto SMS days: J0 through J7 (system-sent)
const AUTO_DAYS = [0, 1, 2, 3, 4, 5, 6, 7];
// Manual SMS days: Day 1 through Day 7 (user shares manually)
const MANUAL_DAYS = [1, 2, 3, 4, 5, 6, 7];

const indexBy = (links: SmsLink[]) => {
  const map: Record<string, string> = {};
  for (const l of links) map[`${l.type}:${l.dayNumber}`] = l.link;
  return map;
};

export default function RelanceSmsLinks() {
  const [autoLinks, setAutoLinks] = useState<Record<number, string>>({});
  const [manualLinks, setManualLinks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    sbcApiService.relanceGetSmsLinks()
      .then(res => {
        if (cancelled) return;
        const data = handleApiResponse(res);
        const links: SmsLink[] = data?.links || [];
        const idx = indexBy(links);
        const auto: Record<number, string> = {};
        const manual: Record<number, string> = {};
        for (const day of AUTO_DAYS) auto[day] = idx[`auto:${day}`] || '';
        for (const day of MANUAL_DAYS) manual[day] = idx[`manual:${day}`] || '';
        setAutoLinks(auto);
        setManualLinks(manual);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'Impossible de charger les liens SMS.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const links: SmsLink[] = [];
      for (const day of AUTO_DAYS) {
        const link = (autoLinks[day] || '').trim();
        if (link) links.push({ type: 'auto', dayNumber: day, link });
      }
      for (const day of MANUAL_DAYS) {
        const link = (manualLinks[day] || '').trim();
        if (link) links.push({ type: 'manual', dayNumber: day, link });
      }
      await sbcApiService.relanceUpdateSmsLinks(links);
      setSavedAt(new Date());
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="flex items-center gap-2">
      <div className="w-16 text-sm font-bold text-gray-700 shrink-0">{label}</div>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
      />
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="p-3 bg-white relative pb-24 min-h-screen">
        <div className="flex items-center mb-4">
          <BackButton />
          <h3 className="text-xl font-medium text-center flex-1">Liens SMS</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Définissez le lien à inclure dans chaque SMS. Numéros Cameroun (+237) uniquement.
        </p>

        {loading && <div className="text-center text-gray-500 py-8">Chargement…</div>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        {!loading && (
          <>
            <section className="mb-6">
              <h4 className="font-bold text-gray-800 mb-3">SMS automatiques (J0 – J7)</h4>
              <div className="space-y-2">
                {AUTO_DAYS.map(day => (
                  <div key={`auto-${day}`}>
                    {renderRow(
                      `J${day}`,
                      autoLinks[day] || '',
                      (v) => setAutoLinks(prev => ({ ...prev, [day]: v }))
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-6">
              <h4 className="font-bold text-gray-800 mb-3">SMS manuels (Jour 1 – Jour 7)</h4>
              <div className="space-y-2">
                {MANUAL_DAYS.map(day => (
                  <div key={`manual-${day}`}>
                    {renderRow(
                      `Jour ${day}`,
                      manualLinks[day] || '',
                      (v) => setManualLinks(prev => ({ ...prev, [day]: v }))
                    )}
                  </div>
                ))}
              </div>
            </section>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#115CF6] text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Sauvegarde…' : 'Enregistrer les liens'}
            </button>

            {savedAt && (
              <div className="text-green-600 text-sm text-center mt-2">
                ✓ Liens enregistrés à {savedAt.toLocaleTimeString('fr-FR')}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
