import { useEffect, useState } from 'react';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { SmsLink, SmsLinkType, SmsTemplate } from '../types/relance';

// Auto SMS days: J0 through J7 (J0 sent ~15 min after enrollment)
const AUTO_DAYS = [0, 1, 2, 3, 4, 5, 6, 7];
// Manual SMS days: J1 through J7 (no J0 — exists in auto only)
const MANUAL_DAYS = [1, 2, 3, 4, 5, 6, 7];

const dayLabel = (type: SmsLinkType, day: number) =>
  type === 'auto' && day === 0 ? 'J0 (15 min)' : `J${day}`;

const indexLinks = (links: SmsLink[]) => {
  const map: Record<string, string> = {};
  for (const l of links) map[`${l.type}:${l.dayNumber}`] = l.link;
  return map;
};

const indexTemplates = (templates: SmsTemplate[]) => {
  const map: Record<string, string> = {};
  for (const t of templates) map[`${t.type}:${t.dayNumber}`] = t.template;
  return map;
};

export default function RelanceSmsLinks() {
  const [autoLinks, setAutoLinks] = useState<Record<number, string>>({});
  const [manualLinks, setManualLinks] = useState<Record<number, string>>({});
  const [autoTemplates, setAutoTemplates] = useState<Record<number, string>>({});
  const [manualTemplates, setManualTemplates] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      sbcApiService.relanceGetSmsLinks(),
      sbcApiService.relanceGetSmsTemplates(),
    ])
      .then(([linksRes, templatesRes]) => {
        if (cancelled) return;

        const linksData = handleApiResponse(linksRes);
        const linkIdx = indexLinks(linksData?.links || []);
        const auto: Record<number, string> = {};
        const manual: Record<number, string> = {};
        for (const day of AUTO_DAYS) auto[day] = linkIdx[`auto:${day}`] || '';
        for (const day of MANUAL_DAYS) manual[day] = linkIdx[`manual:${day}`] || '';
        setAutoLinks(auto);
        setManualLinks(manual);

        const templatesData = handleApiResponse(templatesRes);
        const tplIdx = indexTemplates(templatesData?.templates || []);
        const autoTpl: Record<number, string> = {};
        const manualTpl: Record<number, string> = {};
        for (const day of AUTO_DAYS) autoTpl[day] = tplIdx[`auto:${day}`] || '';
        for (const day of MANUAL_DAYS) manualTpl[day] = tplIdx[`manual:${day}`] || '';
        setAutoTemplates(autoTpl);
        setManualTemplates(manualTpl);
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
    type: SmsLinkType,
    day: number,
    template: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-1">
        <div className="font-bold text-sm text-gray-700">{dayLabel(type, day)}</div>
      </div>
      {template && (
        <div className="text-xs text-gray-600 mb-2 whitespace-pre-wrap break-words">
          {template}
        </div>
      )}
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#115CF6] bg-white"
      />
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="p-3 bg-white relative pb-24 min-h-screen">
        <div className="flex items-center mb-4">
          <BackButton />
          <h3 className="text-xl font-medium text-center flex-1">Mes liens SMS</h3>
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
              <h4 className="font-bold text-gray-800 mb-3">SMS automatiques</h4>
              <div className="space-y-2">
                {AUTO_DAYS.map(day => (
                  <div key={`auto-${day}`}>
                    {renderRow(
                      'auto',
                      day,
                      autoTemplates[day] || '',
                      autoLinks[day] || '',
                      (v) => setAutoLinks(prev => ({ ...prev, [day]: v }))
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-6">
              <h4 className="font-bold text-gray-800 mb-3">SMS manuels</h4>
              <div className="space-y-2">
                {MANUAL_DAYS.map(day => (
                  <div key={`manual-${day}`}>
                    {renderRow(
                      'manual',
                      day,
                      manualTemplates[day] || '',
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
