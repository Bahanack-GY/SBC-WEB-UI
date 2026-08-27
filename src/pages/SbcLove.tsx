import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock01Icon, LockIcon } from '@hugeicons/core-free-icons';
import { AdsScreen } from '../components/ads/AdsScreen';
import LoveBrowse from '../components/love/LoveBrowse';
import LoveMatches from '../components/love/LoveMatches';
import LoveProfileForm from '../components/love/LoveProfileForm';
import { useLoveStatus, loveWindowLabel, type LoveProfile } from '../hooks/useSbcLove';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import sbcloveImg from '../assets/icon/sbclove.png';

type Tab = 'browse' | 'matches' | 'profile';

const TABS: { key: Tab; label: string }[] = [
  { key: 'browse', label: 'Découvrir' },
  { key: 'matches', label: 'Mes matchs' },
  { key: 'profile', label: 'Mon profil' },
];

/**
 * SBC Love — the weekly rendez-vous (spec §2).
 *
 * The three tabs mirror the module's rules rather than its data: « Découvrir »
 * only lives during the session window, « Mon profil » is available any day so
 * members can prepare and be validated before it opens.
 */
function SbcLove() {
  // The page polls; the Home tile deliberately does not (see useLoveStatus).
  const { data: status, isLoading: statusLoading } = useLoveStatus({ poll: true });

  const { data: profile, isLoading: profileLoading } = useQuery<LoveProfile | null>({
    queryKey: ['sbclove-my-profile'],
    queryFn: async () => {
      const response = await sbcApiService.getMyLoveProfile();
      // 404 is the normal "you have not created one yet" answer, not an error.
      if (response.statusCode === 404) return null;
      return handleApiResponse(response);
    },
  });

  const [tab, setTab] = useState<Tab>('browse');

  // The kill-switch (spec §14) closes the whole module, window or not.
  if (status?.enabled === false) {
    return (
      <AdsScreen title="SBC Love" subtitle="Rencontres SBC" illustration={sbcloveImg}>
        <div className="bg-surface border border-border rounded-card p-6 text-center">
          <span className="inline-grid place-items-center size-12 rounded-pill bg-surface-2 text-ink-3 mb-3">
            <HugeiconsIcon icon={LockIcon} size={24} />
          </span>
          <h3 className="font-semibold text-ink">Module indisponible</h3>
          <p className="text-sm text-ink-2 mt-1">SBC Love est temporairement désactivé. Revenez bientôt.</p>
        </div>
      </AdsScreen>
    );
  }

  return (
    <AdsScreen
      title="SBC Love"
      subtitle="Une session par semaine, des rencontres sérieuses et modérées."
      illustration={sbcloveImg}
    >
      <div
        className={`flex items-center gap-2 rounded-card p-3 mb-4 text-sm ${
          status?.isOpen ? 'bg-success-soft text-success' : 'bg-surface border border-border text-ink-2'
        }`}
      >
        <HugeiconsIcon icon={Clock01Icon} size={18} />
        {statusLoading ? 'Vérification de la session…' : loveWindowLabel(status)}
      </div>

      <div className="flex gap-1 bg-surface-2 rounded-pill p-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-pill py-2 text-sm font-medium ${
              tab === t.key ? 'bg-surface text-ink' : 'text-ink-3'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <LoveBrowse status={status} myProfile={profile ?? null} onGoToMatches={() => setTab('matches')} />
      )}
      {tab === 'matches' && <LoveMatches />}
      {tab === 'profile' && (
        profileLoading
          ? <p className="text-sm text-ink-3">Chargement de votre profil…</p>
          : <LoveProfileForm profile={profile ?? null} status={status} />
      )}
    </AdsScreen>
  );
}

export default SbcLove;
