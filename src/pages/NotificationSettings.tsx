import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BackButton from '../components/common/BackButton';
import { InstallAppCard } from '../components/pwa/InstallAppCard';
import { Switch } from '../components/relance/ui/Switch';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { disablePush, enablePush, isPushEnabled, pushSupport } from '../utils/push';
import { headerDrop, listContainer, listItem, pageFade, popIn } from '../utils/motion';

type Category = { key: string; label: string; urgent: boolean; enabled: boolean };
type Preferences = { categories: Category[]; quietHours: { from: number; until: number } };

const prefsKey = ['push', 'preferences'] as const;

/**
 * Where a member turns notifications on for this phone, and picks which kinds
 * they want. Applies to all their devices; the device switch is per phone.
 */
export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const support = pushSupport();
  const [deviceOn, setDeviceOn] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (support !== 'supported') return;
    setBlocked(Notification.permission === 'denied');
    isPushEnabled().then(setDeviceOn).catch(() => setDeviceOn(false));
  }, [support]);

  const prefs = useQuery({
    queryKey: prefsKey,
    queryFn: async (): Promise<Preferences> => handleApiResponse(await sbcApiService.pushGetPreferences()),
  });

  const toggleDevice = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        const result = await enablePush();
        setDeviceOn(result === 'enabled');
        setBlocked(result === 'denied');
      } else {
        await disablePush();
        setDeviceOn(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleCategory = async (key: string, enabled: boolean) => {
    const current = prefs.data;
    if (!current) return;
    const categories = current.categories.map(c => (c.key === key ? { ...c, enabled } : c));
    queryClient.setQueryData(prefsKey, { ...current, categories });
    try {
      handleApiResponse(await sbcApiService.pushSetPreferences(categories.filter(c => !c.enabled).map(c => c.key)));
    } catch {
      queryClient.setQueryData(prefsKey, current);
    }
  };

  return (
    <motion.div variants={pageFade} initial="hidden" animate="show" className="min-h-screen bg-bg pb-10">
      <motion.header variants={headerDrop} className="sticky top-0 z-20 bg-bg flex items-center gap-2 px-4 py-3">
        <BackButton />
        <h1 className="text-lg font-semibold text-ink">Notifications</h1>
      </motion.header>

      <div className="px-4 space-y-4">
        <InstallAppCard />
        <motion.section variants={popIn} aria-label="Ce téléphone" className="bg-surface border border-border rounded-card p-4">
          {support === 'supported' && !blocked && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold text-ink">Sur ce téléphone</div>
                <div className="text-xs text-ink-3">{deviceOn ? 'Activées' : 'Désactivées'}</div>
              </div>
              <Switch checked={!!deviceOn} onChange={toggleDevice} disabled={busy || deviceOn === null} label="Notifications sur ce téléphone" />
            </div>
          )}
          {support === 'supported' && blocked && (
            <p className="text-sm text-ink-2">
              Les notifications sont bloquées pour SBC dans ton navigateur. Autorise-les dans les réglages du site, puis reviens ici.
            </p>
          )}
          {support === 'ios-needs-install' && (
            <p className="text-sm text-ink-2">
              Sur iPhone : touche <b>Partager</b> puis <b>Sur l'écran d'accueil</b>, ouvre SBC depuis l'icône, et reviens ici.
            </p>
          )}
          {support === 'unsupported' && (
            <p className="text-sm text-ink-2">Ce navigateur ne peut pas recevoir de notifications. Essaie avec Chrome.</p>
          )}
        </motion.section>

        <section aria-label="Je veux être prévenu pour" className="bg-surface border border-border rounded-card p-4">
          <h2 className="font-semibold text-ink mb-1">Je veux être prévenu pour</h2>
          {prefs.isLoading ? (
            <div className="h-64 rounded-tile bg-surface-2 animate-pulse" />
          ) : prefs.isError || !prefs.data ? (
            <p className="text-sm text-ink-3 py-4">Réglages indisponibles pour le moment.</p>
          ) : (
            <>
              <motion.ul variants={listContainer} initial="hidden" animate="show" className="divide-y divide-border">
                {prefs.data.categories.map(c => (
                  <motion.li key={c.key} variants={listItem} className="flex items-center gap-3 py-3">
                    <span className="flex-1 text-sm text-ink">{c.label}</span>
                    <Switch checked={c.enabled} onChange={v => toggleCategory(c.key, v)} label={c.label} />
                  </motion.li>
                ))}
              </motion.ul>
              <p className="mt-2 text-xs text-ink-3">
                Entre {prefs.data.quietHours.from} h et {prefs.data.quietHours.until} h, seuls l'argent et les messages arrivent tout de suite ; le reste attend le matin.
              </p>
            </>
          )}
        </section>
      </div>
    </motion.div>
  );
}
