import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { pageFade, headerDrop, listContainer, listItem } from '../utils/motion';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { SmsLink, SmsLinkType, SmsTemplate } from '../types/relance';

const dayLabel = (type: SmsLinkType, day: number) =>
  type === 'auto' && day === 0 ? 'J0 (15 min)' : `J${day}`;

export default function RelanceSmsLinks() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
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
        const links: SmsLink[] = linksData?.links || [];
        const valueMap: Record<string, string> = {};
        for (const l of links) valueMap[`${l.type}:${l.dayNumber}`] = l.link;
        setLinkValues(valueMap);

        // Templates response is { success, data: SmsTemplate[] } — handleApiResponse
        // unwraps to the array.
        const templatesData = handleApiResponse(templatesRes);
        const tpls: SmsTemplate[] = Array.isArray(templatesData)
          ? templatesData
          : templatesData?.data || [];
        setTemplates(tpls.filter(t => t.active));
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

  const sortedTemplates = useMemo(() => {
    const sorted = [...templates].sort((a, b) => a.dayNumber - b.dayNumber);
    return {
      auto: sorted.filter(t => t.type === 'auto'),
      manual: sorted.filter(t => t.type === 'manual'),
    };
  }, [templates]);

  const setValue = (type: SmsLinkType, day: number, value: string) => {
    setLinkValues(prev => ({ ...prev, [`${type}:${day}`]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const links: SmsLink[] = [];
      for (const t of templates) {
        const link = (linkValues[`${t.type}:${t.dayNumber}`] || '').trim();
        if (link) {
          links.push({ type: t.type, dayNumber: t.dayNumber, link });
        }
      }
      await sbcApiService.relanceUpdateSmsLinks(links);
      setSavedAt(new Date());
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (tpl: SmsTemplate) => {
    const key = `${tpl.type}:${tpl.dayNumber}`;
    const value = linkValues[key] || '';
    return (
      <motion.div variants={listItem} key={key} className="border border-border rounded-lg p-3 bg-gray-50">
        <div className="font-bold text-sm text-gray-700 mb-1">
          {dayLabel(tpl.type, tpl.dayNumber)}
        </div>
        {tpl.templateText && (
          <div className="text-xs text-gray-600 mb-2 whitespace-pre-wrap break-words">
            {tpl.templateText}
          </div>
        )}
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(tpl.type, tpl.dayNumber, e.target.value)}
          placeholder="https://..."
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#115CF6] bg-white"
        />
      </motion.div>
    );
  };

  return (
    <ProtectedRoute>
      <motion.div variants={pageFade} initial="hidden" animate="show" className="p-3 bg-white relative pb-24 min-h-screen">
        <motion.div variants={headerDrop} className="flex items-center mb-4">
          <BackButton />
          <h3 className="text-xl font-medium text-center flex-1">Mes liens SMS</h3>
        </motion.div>

        <p className="text-sm text-gray-600 mb-4">
          Définissez le lien à inclure dans chaque SMS. Numéros Cameroun (+237) uniquement.
        </p>

        {loading && <div className="text-center text-gray-500 py-8">Chargement…</div>}

        {error && (
          <div className="bg-red-50 border border-border text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Aucun template SMS actif pour le moment.
          </div>
        )}

        {!loading && templates.length > 0 && (
          <>
            {sortedTemplates.auto.length > 0 && (
              <section className="mb-6">
                <h4 className="font-bold text-gray-800 mb-3">SMS automatiques</h4>
                <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                  {sortedTemplates.auto.map(renderRow)}
                </motion.div>
              </section>
            )}

            {sortedTemplates.manual.length > 0 && (
              <section className="mb-6">
                <h4 className="font-bold text-gray-800 mb-3">SMS manuels</h4>
                <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                  {sortedTemplates.manual.map(renderRow)}
                </motion.div>
              </section>
            )}

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
      </motion.div>
    </ProtectedRoute>
  );
}
