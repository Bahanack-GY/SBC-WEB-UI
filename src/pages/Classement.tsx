import { useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, Globe02Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import BackButton from '../components/common/BackButton';
import Podium from '../components/leaderboard/Podium';
import LeaderboardRow from '../components/leaderboard/LeaderboardRow';
import { LeaderboardSkeleton, LeaderboardEmpty, LeaderboardError } from '../components/leaderboard/LeaderboardStates';
import RewardSystem from '../components/leaderboard/RewardSystem';
import MyRankRow from '../components/leaderboard/MyRankRow';
import CountryRanking, { CountryPicker, countryName } from '../components/leaderboard/CountryRanking';
import { useLeaderboard, useCountryLeaderboard, useMyFilleulsLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../contexts/AuthContext';
import { flag } from '../lib/utils';
import type { LeaderboardEntry } from '../types/api';

type Tab = 'general' | 'countries' | 'filleuls';

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'Général' },
  { key: 'countries', label: 'Par pays' },
  { key: 'filleuls', label: 'Mes filleuls' },
];

const HEADINGS: Record<Tab, { title: string; icon: typeof ChampionIcon }> = {
  general: { title: 'Classement Général', icon: ChampionIcon },
  countries: { title: 'Classement par pays', icon: Globe02Icon },
  filleuls: { title: 'Top de mes filleuls', icon: UserGroupIcon },
};

/** Podium for the first three, rows below. Shared by both views. */
function Board({ entries }: { entries: LeaderboardEntry[] }) {
  const rest = entries.slice(3);
  return (
    <>
      <Podium entries={entries} />
      {rest.length > 0 && (
        <ul className="flex flex-col gap-2 mt-2">
          {rest.map((entry, i) => (
            <LeaderboardRow key={entry.userId} entry={entry} leaderCount={entries[0].referralCount} index={i} />
          ))}
        </ul>
      )}
    </>
  );
}

function Classement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // ?tab=filleuls deep-links a tab (e.g. from Mes filleuls); unknown values fall back.
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = params.get('tab');
    return t === 'countries' || t === 'filleuls' ? t : 'general';
  });
  const [pickedCountry, setPickedCountry] = useState<string | null>(null);
  const countryBoardRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const general = useLeaderboard();
  const byCountry = useCountryLeaderboard(tab === 'countries');
  const myFilleuls = useMyFilleulsLeaderboard(tab === 'filleuls');

  const entries = general.data?.top ?? [];
  const me = general.data?.me ?? null;

  const countries = byCountry.data?.countries ?? [];
  // Open on the viewer's own country when it is ranked, otherwise on the leader.
  const selectedCountry = useMemo(() => {
    if (pickedCountry) return pickedCountry;
    const own = (user?.country ?? '').trim().toUpperCase();
    return countries.some((c) => c.country === own) ? own : countries[0]?.country ?? null;
  }, [pickedCountry, user?.country, countries]);
  const countryEntries = selectedCountry ? byCountry.data?.byCountry[selectedCountry] ?? [] : [];
  const leader = countries[0];
  const runnerUp = countries[1];

  // Tapping a country in the ranking picks it AND brings its top 10 into view —
  // the board sits below the whole ranking, so picking alone looked like nothing happened.
  const revealCountry = (code: string) => {
    setPickedCountry(code);
    countryBoardRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <ProtectedRoute>
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2">
              {HEADINGS[tab].title}
              <HugeiconsIcon icon={HEADINGS[tab].icon} size={20} className="text-accent" />
            </h1>
            <p className="text-xs text-ink-2">Filleuls directs qui ont payé ce mois-ci</p>
          </div>
        </div>

        <div role="tablist" aria-label="Type de classement" className="flex gap-1 bg-surface-2 rounded-pill p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-pill py-2 text-sm font-medium transition-colors duration-150 ${
                tab === t.key ? 'bg-surface text-ink' : 'text-ink-2'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'filleuls' ? (
          myFilleuls.isLoading ? (
            <LeaderboardSkeleton rows={5} />
          ) : myFilleuls.error ? (
            <LeaderboardError onRetry={() => myFilleuls.refetch()} />
          ) : (myFilleuls.data?.top.length ?? 0) === 0 ? (
            <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
              <HugeiconsIcon icon={UserGroupIcon} size={32} className="text-ink-3" />
              <p className="text-sm font-semibold text-ink">Aucun de vos filleuls n'a encore parrainé ce mois-ci</p>
              <p className="text-xs text-ink-2 max-w-xs text-pretty">
                Dès qu'un filleul direct fait payer un de ses propres filleuls, il apparaît ici. Encouragez-les à partager leur lien.
              </p>
              <button
                onClick={() => navigate('/filleuls')}
                className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Voir mes filleuls
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink bg-primary-soft rounded-card p-3 text-pretty">
                Vos filleuls directs les plus actifs ce mois, classés par leurs propres filleuls payés.{' '}
                <strong className="font-semibold tabular-nums">{myFilleuls.data!.totalRanked}</strong>{' '}
                {myFilleuls.data!.totalRanked > 1 ? 'sont classés' : 'est classé'}.
              </p>
              <Board entries={myFilleuls.data!.top} />
            </>
          )
        ) : tab === 'general' ? (
          general.isLoading ? (
            <LeaderboardSkeleton rows={7} />
          ) : general.error ? (
            <LeaderboardError onRetry={() => general.refetch()} />
          ) : entries.length === 0 ? (
            <LeaderboardEmpty referralCode={user?.referralCode} />
          ) : (
            <>
              <Board entries={entries} />
              {me && <MyRankRow me={me} name={user?.name} />}
            </>
          )
        ) : byCountry.isLoading ? (
          <LeaderboardSkeleton rows={5} />
        ) : byCountry.error ? (
          <LeaderboardError onRetry={() => byCountry.refetch()} />
        ) : countries.length === 0 ? (
          <LeaderboardEmpty referralCode={user?.referralCode} />
        ) : (
          <>
            {leader && (
              <p className="text-sm text-ink bg-accent-soft rounded-card p-3">
                <span className="mr-1" aria-hidden>{flag(leader.country)}</span>
                <strong className="font-semibold">{countryName(leader.country)}</strong> mène le classement ce mois
                avec <strong className="font-semibold tabular-nums">{leader.referralCount.toLocaleString('fr-FR')}</strong> filleuls
                {runnerUp && (
                  <>
                    , <span className="tabular-nums">{(leader.referralCount - runnerUp.referralCount).toLocaleString('fr-FR')}</span> de plus
                    que {countryName(runnerUp.country)}
                  </>
                )}
                .
              </p>
            )}

            <CountryRanking countries={countries} selected={selectedCountry} onSelect={revealCountry} />

            {selectedCountry && (
              <section ref={countryBoardRef} className="flex flex-col gap-3 mt-2 scroll-mt-24">
                <div>
                  <h2 className="text-base font-bold text-ink">Les meilleurs par pays</h2>
                  <p className="text-xs text-ink-2">Choisissez un pays pour voir ses 10 meilleurs affiliés du mois.</p>
                </div>

                <CountryPicker countries={countries} selected={selectedCountry} onSelect={setPickedCountry} />

                <div className="flex flex-col gap-1" aria-live="polite">
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                    <span aria-hidden>{flag(selectedCountry)}</span>
                    Top 10 · {countryName(selectedCountry)}
                  </h3>
                  {countryEntries.length > 0
                    ? <Board key={selectedCountry} entries={countryEntries} />
                    : <p className="text-sm text-ink-2 mt-2">Aucun affilié classé dans ce pays ce mois-ci.</p>}
                </div>
              </section>
            )}
          </>
        )}

        <RewardSystem mySales={me?.referralCount} />

        <p className="text-[11px] text-ink-2 text-center">
          Classement mis à jour chaque heure, remis à zéro le 1<sup>er</sup> de chaque mois.
          Les montants affichés sont une estimation.
        </p>
      </div>
    </ProtectedRoute>
  );
}

export default Classement;
