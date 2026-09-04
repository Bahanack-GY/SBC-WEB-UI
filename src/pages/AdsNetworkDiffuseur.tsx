import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, Cancel01Icon, CheckmarkCircle02Icon, Download01Icon, HourglassIcon, KeyboardIcon, Loading03Icon, QrCodeIcon, Share08Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
// The manual (video) verification UI still uses react-icons; the rest of the file
// was migrated to hugeicons. Both packages are present, so this is safe.
import { FaCheckCircle, FaSpinner, FaVideo, FaClock } from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import {
  AdsCardSkeleton, AdsStatCard, AdsDayPips, relativeDate, adsItemMotion, adsHeaderMotion,
} from '../components/ads/AdsScreen';
import { useAdsRoles } from '../hooks/useAdsRoles';
import illustrationShare from '../assets/icon/ads-share.jpg';
import illustrationVerify from '../assets/icon/ads-verify.jpg';
import illustrationEmpty from '../assets/icon/ads-empty.jpg';
import { allAfricanCountries } from '../utils/countriesData';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';

interface DaySchedule {
  day: number;
  status: string;
  windowOpensAt?: string;
  dueAt?: string;
}

interface Participation {
  _id: string;
  campaignId: string;
  status: 'offered' | 'declined' | 'expired' | 'in_progress' | 'completed' | 'forfeited';
  trackingCode: string;
  trackingUrl?: string;
  shareCaption?: string;
  totalViews: number;
  totalEarned: number;
  expectedViews?: number;
  ratePerView?: number;
  campaign: {
    _id: string;
    title: string;
    description?: string;
    mediaFileId: string;
    mediaType: 'image' | 'video';
    suggestedCaption?: string;
    isTestCampaign?: boolean;
  } | null;
  schedule?: {
    currentDay?: DaySchedule;
    /** Present when a day is posted and waiting for the diffuseur to verify it. */
    awaitingVerification?: { day: number; postedAt?: string };
    daysCompleted?: number;
    canPostNow?: boolean;
    completionDeadline?: string;
    day1Deadline?: string;
  };
}

interface Verdict {
  day: number;
  accepted: boolean;
  reason?: string;
  viewCount: number;
  earnedAmount: number;
}

const formatFCFA = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

/**
 * Diffuseur dashboard: offers, the campaign in progress, and earnings.
 *
 * The two screens that carry real risk are the share sheet and the verification
 * modal. A caption posted without its tracking link cannot be verified, and a
 * status that expires before verification loses its views permanently — neither
 * is recoverable, so both are warned about at the moment of action rather than
 * only in onboarding.
 */
function AdsNetworkDiffuseur() {
  const { roles, isResolved } = useAdsRoles();
  const { user } = useAuth();
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [sharing, setSharing] = useState<Participation | null>(null);
  const [verifying, setVerifying] = useState<Participation | null>(null);
  const [offerDetail, setOfferDetail] = useState<Participation | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [historyTab, setHistoryTab] = useState<'wallet' | 'campaigns'>('wallet');

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['ads-diffuseur-profile'],
    queryFn: async () => {
      const res = await sbcApiService.getMyDiffuseurProfile();
      return res.isSuccessByStatusCode ? res.body?.data : null;
    },
    retry: false,
  });

  const { data: participations, isLoading: partsLoading, refetch: refetchParts } = useQuery({
    queryKey: ['ads-participations'],
    queryFn: async () => {
      const res = await sbcApiService.getMyParticipations({ limit: 50 });
      return (res.body?.data ?? []) as Participation[];
    },
  });

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['ads-balance'],
    queryFn: async () => {
      const res = await sbcApiService.getAdvertisingBalance();
      // user-service answers { advertisingBalance, minTransferAmount } — reading
      // { balance, minimumTransfer } showed 0 F over a credited balance.
      return res.body?.data as { advertisingBalance: number; minTransferAmount: number } | undefined;
    },
  });

  // Money in (campaign credits, commissions) and out (transfers), one tab
  // each, loading 10 at a time as the list is scrolled.
  const {
    data: walletPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchHistory,
  } = useInfiniteQuery({
    queryKey: ['ads-wallet-history'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      // includeActivation: the endpoint excludes advertising_earnings from the
      // default (main-wallet) view; without it the credits never show.
      // Both directions fetched page-by-page and merged: the movements list is
      // one chronological story, in and out together.
      const [ins, outs] = await Promise.all([
        sbcApiService.getTransactionHistory({ type: 'advertising_earnings', limit: 10, page: pageParam, includeActivation: 'true' }),
        sbcApiService.getTransactionHistory({ type: 'advertising_transfer_out', limit: 10, page: pageParam, includeActivation: 'true' }),
      ]);
      // The endpoint answers { transactions }, not { data }.
      const parse = (r: any) => (Array.isArray(r.body?.transactions) ? r.body.transactions : []) as any[];
      const rows = [...parse(ins), ...parse(outs)]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { rows, exhausted: parse(ins).length < 10 && parse(outs).length < 10 };
    },
    getNextPageParam: (last, all) => (last.exhausted ? undefined : all.length + 1),
  });
  const walletHistory = walletPages?.pages.flatMap(p => p.rows) ?? [];

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, historyTab]);

  const refreshAll = useCallback(() => {
    refetchParts();
    refetchProfile();
    refetchBalance();
    refetchHistory();
  }, [refetchParts, refetchProfile, refetchBalance, refetchHistory]);

  // Redirect during render rather than from an effect, so the dashboard is never
  // painted for someone who is not a diffuseur.
  if (isResolved && !roles.isDiffuseur && !profileLoading && !profile) {
    return <Navigate to="/ads-network/diffuseur/onboarding" replace />;
  }

  const handleTransfer = async () => {
    const amount = Number(transferAmount);
    setTransferring(true);
    setMessage(null);
    try {
      const res = await sbcApiService.transferAdvertisingBalance(amount);
      if (!res.isSuccessByStatusCode) {
        setMessage({ type: 'err', text: res.body?.message || 'Le transfert a échoué.' });
        return;
      }
      setMessage({ type: 'ok', text: `${formatFCFA(amount)} transférés vers votre solde principal.` });
      setTransferOpen(false);
      refreshAll();
    } finally {
      setTransferring(false);
    }
  };

  const handleAccept = async (p: Participation) => {
    setActing(p._id);
    setMessage(null);
    try {
      const res = await sbcApiService.acceptParticipation(p._id);
      if (!res.isSuccessByStatusCode) {
        // Offers go to several diffuseurs at once; losing the race is normal.
        setMessage({ type: 'err', text: res.body?.message || "Cette offre n'est plus disponible." });
        refreshAll();
        return;
      }
      setMessage({ type: 'ok', text: 'Campagne acceptée. Publiez le jour 1 dans les 24 heures.' });
      refreshAll();
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (p: Participation) => {
    setActing(p._id);
    try {
      await sbcApiService.declineParticipation(p._id);
      refreshAll();
    } finally {
      setActing(null);
    }
  };

  const offers = (participations ?? []).filter((p) => p.status === 'offered');
  const active = (participations ?? []).filter((p) => p.status === 'in_progress');
  const past = (participations ?? []).filter((p) => p.status === 'completed' || p.status === 'forfeited');

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <BackButton />

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Espace diffuseur</h1>

        {message && (
          <div className={`rounded-xl p-3 mt-3 text-sm ${message.type === 'ok' ? 'bg-green-50 text-green-800 border border-border' : 'bg-red-50 text-red-800 border border-border'}`}>
            {message.text}
          </div>
        )}

        {/* Earnings */}
        <motion.div {...adsHeaderMotion} className="bg-primary text-white rounded-2xl p-5 mt-4">
          <div className="flex items-center gap-2 text-blue-100 text-sm">
            <HugeiconsIcon icon={Wallet01Icon} /> Solde publicitaire
          </div>
          <p className="text-3xl font-bold mt-1">{formatFCFA(balance?.advertisingBalance ?? 0)}</p>
          <p className="text-xs text-blue-100 mt-1">
            Transfert possible dès {formatFCFA(balance?.minTransferAmount ?? 0)}.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setTransferAmount(String(Math.floor(balance?.advertisingBalance ?? 0)));
              setTransferOpen(true);
            }}
            className="w-full bg-white text-primary rounded-xl py-2.5 text-sm font-semibold mt-3"
          >
            Transférer vers mon solde principal
          </motion.button>
          {profile && (
            <div className="mt-3 pt-3 border-t border-white/20">
              {/* Whether they are measured or still on their own estimate. A
                  diffuseur who receives nothing needs to know it is because the
                  test campaign is still outstanding, not because SBC forgot them. */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${profile.verification?.verified ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}>
                  {profile.verification?.verified ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} /> : <HugeiconsIcon icon={HourglassIcon} size={11} />}
                  {profile.verification?.label ?? 'Statut inconnu'}
                </span>
              </div>
              {!profile.verification?.verified && (
                <p className="text-xs text-blue-100 mb-2">
                  Terminez la campagne test pour débloquer les campagnes rémunérées.
                </p>
              )}
            </div>
          )}
        </motion.div>

        {profile && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <AdsStatCard index={0} label="Campagnes terminées" value={profile.campaignsCompleted ?? 0} />
            <AdsStatCard
              index={1}
              label="Vues par publication"
              value={profile.effectiveAverageViews ?? 0}
              hint={profile.hasCompletedTestCampaign ? 'mesurée' : 'déclarée'}
              tone={profile.hasCompletedTestCampaign ? 'green' : 'amber'}
            />
            <AdsStatCard index={2} label="Score de confiance" value={profile.trustScore ?? 0} />
          </div>
        )}

        {/* Referral commission programme — the 100-campaign carrot, and its
            state once earned. Backend pays 20% of SBC's margin on every
            campaign launched by a direct filleul; the money lands in this same
            solde publicitaire and shows as 💎 in the movements below. */}
        {profile?.referral && (
          <motion.div {...adsItemMotion(3)} className={`rounded-2xl p-4 mt-3 border ${profile.referral.tier === 'unlocked' ? 'bg-green-50 border-border' : profile.referral.suspended ? 'bg-amber-50 border-border' : 'bg-white border-border '}`}>
            {profile.referral.tier === 'unlocked' ? (
              <>
                <p className="font-semibold text-green-900">💎 Commission parrainage active</p>
                <p className="text-sm text-green-800 mt-1">
                  Vous gagnez {Math.round((profile.referral.commissionRate ?? 0.2) * 100)}% de la marge SBC sur
                  chaque campagne lancée par vos filleuls directs. Les gains arrivent
                  automatiquement dans votre solde publicitaire.
                </p>
              </>
            ) : profile.referral.suspended ? (
              <>
                <p className="font-semibold text-amber-900">⚠️ Commission parrainage suspendue</p>
                <p className="text-sm text-amber-800 mt-1">
                  Terminez une campagne pour la réactiver — inutile de refaire les {profile.referral.campaignsToUnlock}.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-900">💎 Programme parrainage</p>
                <p className="text-sm text-gray-600 mt-1">
                  Atteignez {profile.referral.campaignsToUnlock} campagnes terminées et gagnez{' '}
                  <strong>{Math.round((profile.referral.commissionRate ?? 0.2) * 100)}% de la marge SBC</strong>{' '}
                  sur chaque campagne lancée par vos filleuls directs — à vie.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex-1">
                    <motion.div
                      className="bg-primary h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (profile.referral.campaignsCompleted / Math.max(1, profile.referral.campaignsToUnlock)) * 100)}%` }}
                      transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 tabular-nums">
                    {profile.referral.campaignsCompleted}/{profile.referral.campaignsToUnlock}
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}

        {partsLoading ? (
          <div className="mt-6"><AdsCardSkeleton rows={2} /></div>
        ) : (
          <>
            {/* Offers */}
            {offers.length > 0 && (
              <section className="mt-6">
                <h2 className="font-semibold text-gray-900 mb-1">Campagnes proposées</h2>
                <p className="text-xs text-gray-500 mb-3">
                  {offers.some(o => o.campaign?.isTestCampaign)
                    ? 'La campagne test mesure votre audience : elle est obligatoire et reste proposée tant qu\'elle n\'est pas terminée.'
                    : 'Proposées à plusieurs diffuseurs. Les premiers à accepter les obtiennent.'}
                </p>
                <div className="space-y-3">
                  {offers.map((p, i) => (
                    <motion.div key={p._id} {...adsItemMotion(i)} className="border border-border rounded-2xl p-4">
                      {/* The card is the summary; the sheet is where the decision
                          is made — accepting commits 3 days of posting, nobody
                          should do that off a two-line blurb. */}
                      <div
                        className="flex gap-3 cursor-pointer"
                        onClick={() => setOfferDetail(p)}
                        role="button"
                        aria-label="Voir les détails de la campagne"
                      >
                        {p.campaign && (
                          <img
                            src={sbcApiService.generateThumbnailUrl(p.campaign.mediaFileId, 160)}
                            alt={p.campaign.title}
                            loading="lazy"
                            decoding="async"
                            className="w-20 h-20 object-cover rounded-xl bg-gray-100 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">{p.campaign?.title ?? 'Campagne'}</p>
                          {p.campaign?.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{p.campaign.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            3 jours de publication · environ {p.expectedViews ?? profile?.effectiveAverageViews ?? 0} vues
                          </p>
                          <p className="text-xs text-primary font-medium mt-1">Voir les détails →</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAccept(p)}
                          disabled={acting === p._id}
                          className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:bg-gray-400"
                        >
                          {acting === p._id ? 'Traitement…' : 'Accepter'}
                        </button>
                        {/* The test campaign is not optional: it is the only
                            way to be measured, and measurement is what unlocks
                            paid work. Offering Refuser on it promised a choice
                            that does not exist. */}
                        {!p.campaign?.isTestCampaign && (
                          <button
                            onClick={() => handleDecline(p)}
                            disabled={acting === p._id}
                            className="px-4 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm"
                          >
                            Refuser
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* In progress */}
            {active.length > 0 && (
              <section className="mt-6">
                <h2 className="font-semibold text-gray-900 mb-3">Campagne en cours</h2>
                <div className="space-y-3">
                  {active.map((p, i) => {
                    const day = p.schedule?.currentDay;
                    // canPostNow is decided by the service: it knows a day with no
                    // window is closed, not unrestricted. Recomputing it here is
                    // how the screen ended up offering "Publier" for a day that
                    // had never opened.
                    const windowOpen = p.schedule?.canPostNow === true;
                    const awaiting = p.schedule?.awaitingVerification;
                    return (
                      <motion.div key={p._id} {...adsItemMotion(i)} className="border border-border rounded-2xl p-4">
                        {/* The creative being published — the diffuseur should see
                            what is on their status without opening anything. */}
                        {p.campaign && (
                          <img
                            src={sbcApiService.generateThumbnailUrl(p.campaign.mediaFileId, 640)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-32 rounded-xl object-cover bg-gray-100 mb-3"
                          />
                        )}
                        <p className="font-medium text-gray-900">{p.campaign?.title ?? 'Campagne'}</p>
                        {/* Three lines of prose about where they stand became a
                            progress bar and two short labels. */}
                        <div className="mt-2">
                          <AdsDayPips
                            total={3}
                            completed={p.schedule?.daysCompleted ?? 0}
                            awaitingDay={awaiting?.day}
                          />
                          <div className="flex items-center justify-between text-xs mt-1.5">
                            <span className={awaiting ? 'text-amber-700 font-medium' : 'text-gray-500'}>
                              {awaiting
                                ? `Jour ${awaiting.day} à vérifier`
                                : !windowOpen && day?.windowOpensAt
                                  ? `Jour ${day.day} · ${relativeDate(day.windowOpensAt)}`
                                  : `Jour ${day?.day ?? '—'} sur 3`}
                            </span>
                            <span className="text-gray-400">
                              Fin {relativeDate(p.schedule?.completionDeadline)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-3">
                          {windowOpen && !awaiting && (
                            <button
                              onClick={() => setSharing(p)}
                              className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <HugeiconsIcon icon={Share08Icon} /> Publier le jour {day?.day}
                            </button>
                          )}
                          {!windowOpen && !awaiting && (
                            <button
                              onClick={() => setVerifying(p)}
                              className="w-full border border-border text-gray-700 rounded-xl py-2.5 text-sm font-medium"
                            >
                              Revérifier mes publications
                            </button>
                          )}
                          {awaiting && (
                            <>
                              <button
                                onClick={() => setVerifying(p)}
                                className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <HugeiconsIcon icon={QrCodeIcon} /> Vérifier le jour {awaiting.day}
                              </button>
                              {/* Escape hatch for a premature « J'ai publié » —
                                  without it the day is stuck in verification
                                  mode with nothing to verify. */}
                              <button
                                onClick={async () => {
                                  setActing(p._id);
                                  try {
                                    const res = await sbcApiService.unmarkParticipationPosted(p._id);
                                    if (!res.isSuccessByStatusCode) {
                                      setMessage({ type: 'err', text: res.body?.message || "L'annulation a échoué." });
                                      return;
                                    }
                                    setMessage({ type: 'ok', text: `Jour ${awaiting.day} annulé — publiez-le quand vous êtes prêt.` });
                                    refreshAll();
                                  } finally {
                                    setActing(null);
                                  }
                                }}
                                disabled={acting === p._id}
                                className="w-full text-xs text-gray-500 underline underline-offset-2 py-1"
                              >
                                Je n'ai pas encore publié — annuler le jour {awaiting.day}
                              </button>
                            </>
                          )}

                          <p className="text-xs text-gray-500">
                            {p.totalViews} vues · {formatFCFA(p.totalEarned)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {offers.length === 0 && active.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <img src={illustrationEmpty} alt="" aria-hidden="true" className="w-44 mx-auto" />
                <p className="font-medium text-gray-700">Aucune campagne pour le moment.</p>
                <p className="text-xs mt-2 max-w-xs mx-auto">
                  Les campagnes vous sont proposées selon votre profil et votre audience.
                  Vous serez prévenu par email.
                </p>
              </div>
            )}

            {/* History */}
            <section className="mt-6">
              <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
                <button
                  onClick={() => setHistoryTab('wallet')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${historyTab === 'wallet' ? 'bg-white text-gray-900 ' : 'text-gray-500'} border border-border`}
                >
                  Mouvements du portefeuille
                </button>
                <button
                  onClick={() => setHistoryTab('campaigns')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${historyTab === 'campaigns' ? 'bg-white text-gray-900 ' : 'text-gray-500'} border border-border`}
                >
                  Historique
                </button>
              </div>

              {historyTab === 'wallet' ? (
                walletHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Aucun mouvement pour le moment — vos gains crédités et transferts apparaîtront ici.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {walletHistory.map((t: any, i: number) => {
                      const isIn = t.type === 'advertising_earnings';
                      const isCommission = isIn && /commission parrainage/i.test(t.description ?? '');
                      return (
                        <motion.div
                          key={t.transactionId ?? t._id ?? i}
                          {...adsItemMotion(Math.min(i, 6), 0.02)}
                          className="flex items-center gap-3 border border-border rounded-xl p-3 text-sm"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isIn ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-primary'}`}>
                            {isIn ? '↓' : '↑'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 truncate">
                              {isCommission ? '💎 Commission parrainage' : isIn ? 'Gains de campagne' : 'Transfert vers solde principal'}
                            </p>
                            <p className="text-xs text-gray-500">{relativeDate(t.createdAt)}</p>
                          </div>
                          <p className={`font-semibold shrink-0 ${isIn ? 'text-green-700' : 'text-gray-900'}`}>
                            {isIn ? '+' : '−'}{formatFCFA(Math.abs(t.amount))}
                          </p>
                        </motion.div>
                      );
                    })}
                    {/* Scroll sentinel: crossing it loads the next page. */}
                    <div ref={loadMoreRef} className="h-1" />
                    {isFetchingNextPage && (
                      <div className="flex justify-center py-3"><HugeiconsIcon icon={Loading03Icon} className="animate-spin text-primary" /></div>
                    )}
                  </div>
                )
              ) : past.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Aucune campagne terminée pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {past.map((p) => (
                    <div key={p._id} className="flex items-center justify-between border border-border rounded-xl p-3 text-sm">
                      <div>
                        <p className="text-gray-900">{p.campaign?.title ?? 'Campagne'}</p>
                        <p className="text-xs text-gray-500">
                          {p.status === 'completed' ? `${p.totalViews} vues` : 'Non terminée'}
                        </p>
                      </div>
                      <span className={p.status === 'completed' ? 'text-green-700 font-medium' : 'text-gray-400'}>
                        {p.status === 'completed' ? formatFCFA(p.totalEarned) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <AnimatePresence>
        {transferOpen && (
          /* Centered, not a bottom sheet: the sheet form sits exactly where the
             keyboard lands, and typing an amount is the whole point here. */
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !transferring && setTransferOpen(false)}
          >
            <motion.div
              className="bg-white w-full max-w-md rounded-3xl p-5"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const available = balance?.advertisingBalance ?? 0;
                const minimum = balance?.minTransferAmount ?? 0;
                const amount = Number(transferAmount);
                const aboveBalance = Number.isFinite(amount) && amount > available;
                const belowMinimum = Number.isFinite(amount) && amount > 0 && amount < minimum;
                const valid = Number.isFinite(amount) && amount > 0 && !aboveBalance && !belowMinimum;
                return (
                  <>
                    <h2 className="font-bold text-lg text-gray-900">Transférer vers mon solde principal</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Disponible : <strong>{formatFCFA(available)}</strong> · minimum {formatFCFA(minimum)}
                    </p>

                    <label className="text-sm font-semibold text-gray-800 mt-4 block">Montant à transférer</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className={`w-full rounded-xl border px-3 py-3 text-gray-900 text-center font-bold mt-2 ${aboveBalance ? 'border-danger bg-red-50' : belowMinimum ? 'border-accent bg-amber-50' : 'border-border'}`}
                      placeholder="Montant en F"
                    />

                    {aboveBalance && (
                      <p className="text-xs text-red-700 bg-red-50 border border-border rounded-lg p-2 mt-2">
                        ⚠️ Montant supérieur à votre solde publicitaire ({formatFCFA(available)} disponibles).
                      </p>
                    )}
                    {!aboveBalance && belowMinimum && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-border rounded-lg p-2 mt-2">
                        Le minimum est de {formatFCFA(minimum)} — il manque {formatFCFA(Math.max(0, minimum - amount))}.
                        {available < minimum && ' Terminez d\'autres campagnes pour compléter vos gains.'}
                      </p>
                    )}

                    <div className="flex gap-2 mt-5">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setTransferOpen(false)}
                        disabled={transferring}
                        className="flex-1 border border-border text-gray-700 rounded-xl py-3 text-sm font-medium"
                      >
                        Annuler
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleTransfer}
                        disabled={transferring || !valid}
                        className="flex-1 bg-primary text-white rounded-xl py-3 text-sm font-medium disabled:bg-gray-300"
                      >
                        {transferring ? 'Transfert…' : 'Confirmer le transfert'}
                      </motion.button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
        {offerDetail && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOfferDetail(null)}
          >
            <motion.div
              className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-auto"
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden" />
              {offerDetail.campaign && (
                offerDetail.campaign.mediaType === 'video' ? (
                  <video
                    src={sbcApiService.generateSettingsFileUrl(offerDetail.campaign.mediaFileId)}
                    controls playsInline
                    className="w-full max-h-72 object-contain bg-black sm:rounded-t-3xl mt-2"
                  />
                ) : (
                  <img
                    src={sbcApiService.generateSettingsFileUrl(offerDetail.campaign.mediaFileId)}
                    alt={offerDetail.campaign.title}
                    className="w-full max-h-72 object-contain bg-gray-50 sm:rounded-t-3xl mt-2"
                  />
                )
              )}
              <div className="p-5">
                <h2 className="font-bold text-lg text-gray-900">{offerDetail.campaign?.title ?? 'Campagne'}</h2>
                {offerDetail.campaign?.description && (
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{offerDetail.campaign.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-gray-50 border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">3</p>
                    <p className="text-[11px] text-gray-500">jours de publication</p>
                  </div>
                  <div className="bg-blue-50 border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">
                      ~{offerDetail.expectedViews ?? profile?.effectiveAverageViews ?? 0}
                    </p>
                    <p className="text-[11px] text-gray-500">vues estimées</p>
                  </div>
                  <div className="bg-green-50 border border-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-green-700">
                      {offerDetail.ratePerView
                        ? `~${formatFCFA((offerDetail.expectedViews ?? profile?.effectiveAverageViews ?? 0) * offerDetail.ratePerView)}`
                        : '—'}
                    </p>
                    <p className="text-[11px] text-gray-500">gain estimé jour 1</p>
                  </div>
                </div>

                {offerDetail.campaign?.suggestedCaption && (
                  <div className="bg-gray-50 border border-border rounded-xl p-3 mt-3">
                    <p className="text-[11px] text-gray-500 mb-1">Légende suggérée</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{offerDetail.campaign.suggestedCaption}</p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                  {offerDetail.campaign?.isTestCampaign
                    ? "Campagne test obligatoire : elle ne rapporte rien, mais elle mesure votre audience réelle et débloque les campagnes rémunérées. Publiez le statut 3 jours de suite et vérifiez chaque publication."
                    : "En acceptant, vous vous engagez à publier le statut 3 jours de suite, à raison d'une publication par jour, et à vérifier chaque publication."}
                </p>

                <div className="flex gap-2 mt-4">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={async () => { await handleAccept(offerDetail); setOfferDetail(null); }}
                    disabled={acting === offerDetail._id}
                    className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-medium disabled:bg-gray-400"
                  >
                    {acting === offerDetail._id ? 'Traitement…' : 'Accepter la campagne'}
                  </motion.button>
                  {!offerDetail.campaign?.isTestCampaign && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => { await handleDecline(offerDetail); setOfferDetail(null); }}
                      disabled={acting === offerDetail._id}
                      className="px-4 bg-gray-100 text-gray-700 rounded-xl py-3 text-sm"
                    >
                      Refuser
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {sharing && (
          <ShareSheet
            participation={sharing}
            onClose={() => setSharing(null)}
            onPosted={() => { setSharing(null); refreshAll(); }}
          />
        )}
        {verifying && (
          <VerifySheet
            participation={verifying}
            defaultPhone={profile?.whatsappPhone || user?.phoneNumber}
            onClose={() => { setVerifying(null); refreshAll(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Share sheet.
 *
 * The caption warning sits above everything else because editing it out is the
 * single most likely way a diffuseur loses a day's earnings without meaning to.
 */
function ShareSheet({
  participation,
  onClose,
  onPosted,
}: {
  participation: Participation;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const caption = participation.shareCaption ?? participation.trackingUrl ?? '';
  // Displayed from the CDN (free bandwidth), but fetched through our own origin:
  // the bucket sends no CORS headers, so reading the bytes for the share sheet
  // fails against the CDN URL however it is requested.
  const mediaUrl = participation.campaign
    ? sbcApiService.generateSettingsFileUrl(participation.campaign.mediaFileId)
    : '';
  const mediaBytesUrl = participation.campaign
    ? sbcApiService.generateStreamedFileUrl(participation.campaign.mediaFileId)
    : '';
  const mediaDownloadUrl = participation.campaign
    ? sbcApiService.generateStreamedFileUrl(participation.campaign.mediaFileId, { download: true })
    : '';

  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const share = async () => {
    setError(null);
    setBusy(true);
    try {
      const blob = await fetch(mediaBytesUrl).then((r) => r.blob());
      const file = new File([blob], `campagne.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type });

      // Level 2 Web Share carries files; older browsers only take text, and some
      // take neither. Each fallback still leaves the caption on the clipboard,
      // because the caption is the part that must survive.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
      } else if (navigator.share) {
        await navigator.share({ text: caption });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
        await navigator.clipboard.writeText(caption);
        setError('Image téléchargée et texte copié. Publiez-les depuis WhatsApp.');
      }
    } catch (err) {
      // A user cancelling the share sheet lands here too; not worth an error.
      if ((err as Error)?.name !== 'AbortError') {
        setError("Le partage n'a pas pu s'ouvrir. Téléchargez l'image et copiez le texte.");
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmPosted = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await sbcApiService.markParticipationPosted(participation._id);
      if (!res.isSuccessByStatusCode) {
        setError(res.body?.message || "Impossible d'enregistrer la publication.");
        return;
      }
      onPosted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-auto"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-gray-900">Publier sur votre statut</h2>
          <button onClick={onClose} className="text-gray-400"><HugeiconsIcon icon={Cancel01Icon} /></button>
        </div>

        <img src={illustrationShare} alt="" aria-hidden="true" className="w-40 mx-auto -mt-2 mb-1" />

        <div className="bg-amber-50 border border-accent rounded-xl p-3 text-sm text-amber-900 mb-4">
          <p className="flex items-start gap-2 font-medium">
            <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 shrink-0" />
            Ne modifiez pas le texte, et surtout pas le lien.
          </p>
          <p className="mt-1">
            C'est ce lien qui permet de vérifier votre publication et de compter vos
            vues. S'il est supprimé ou modifié, la journée ne sera pas payée.
          </p>
        </div>

        {mediaUrl && (
          <img src={mediaUrl} alt="Créative" className="w-full rounded-xl bg-gray-100 mb-3" />
        )}

        <label className="text-xs text-gray-500">Texte à publier</label>
        <div className="border border-border rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap mt-1">
          {caption}
        </div>
        <button onClick={copyCaption} className="text-sm text-primary mt-2">
          {copied ? 'Texte copié' : 'Copier le texte'}
        </button>

        {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}

        <button
          onClick={share}
          disabled={busy}
          className="w-full bg-green-600 text-white rounded-xl py-3 font-medium mt-4 flex items-center justify-center gap-2 disabled:bg-gray-400"
        >
          {busy ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> : <HugeiconsIcon icon={Share08Icon} />}
          Partager sur WhatsApp
        </button>

        <a
          href={mediaDownloadUrl}
          download
          className="w-full border border-border text-gray-700 rounded-xl py-3 font-medium mt-2 flex items-center justify-center gap-2"
        >
          <HugeiconsIcon icon={Download01Icon} /> Télécharger l'image
        </a>

        <button
          onClick={confirmPosted}
          disabled={busy}
          className="w-full bg-primary text-white rounded-xl py-3 font-medium mt-4 disabled:bg-gray-400"
        >
          J'ai publié
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Après publication, vérifiez-la depuis SBC <strong>dans les 24 heures</strong>.
          Une fois le statut expiré, les vues de cette journée ne sont plus récupérables.
        </p>
      </motion.div>
    </motion.div>
  );
}

/**
 * Verification sheet: opens a session, polls for the QR, then for the verdict.
 *
 * 503 means every verification slot is busy — a queue, not a failure — so it is
 * worded as "try again shortly" rather than as an error.
 */
/**
 * Manual (video-proof) verification — the fallback for when the WhatsApp
 * auto-connect fails. We issue an on-screen code; the diffuseur screen-records
 * the code then their WhatsApp status views and uploads it before a countdown
 * runs out (so the recording is provably fresh). An admin then reviews it.
 */
function VideoVerification({ participation, onClose }: { participation: Participation; onClose: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'code' | 'submitting' | 'submitted'>('intro');
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  // The code lives on the server with its own deadline, so a refresh or a closed
  // modal must not lose it. Without this the diffuseur who filmed code X and
  // reloaded would generate code Y, and their recording — showing X — would be
  // rejected. Pick the live code back up instead of starting over.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await sbcApiService.getManualVerifyStatus(participation._id);
        const d = res.body?.data;
        if (cancelled || !d) return;
        if (d.status === 'pending_review') {
          setPhase('submitted');
          return;
        }
        if (d.status === 'awaiting_upload' && d.code && d.expiresAt) {
          const remaining = Math.floor((new Date(d.expiresAt).getTime() - Date.now()) / 1000);
          if (remaining > 0) {
            setCode(d.code);
            setSecondsLeft(remaining);
            setPhase('code');
          }
        }
      } catch {
        // No live code, or the check failed: fall back to the normal start.
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => { cancelled = true; };
  }, [participation._id]);

  useEffect(() => {
    if (phase !== 'code' || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft]);

  const expired = phase === 'code' && secondsLeft <= 0;

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const res = await sbcApiService.generateManualVerifyCode(participation._id);
      if (!res.isSuccessByStatusCode) { setError(res.body?.message || 'Impossible de générer le code.'); return; }
      const d = res.body?.data;
      setCode(d?.code ?? null);
      setSecondsLeft(d?.windowSeconds ?? 900);
      setPhase('code');
    } catch { setError('Impossible de générer le code.'); }
    finally { setBusy(false); }
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // settings-service buffers uploads in memory; keep videos small so a launch-night
    // rush of uploads can't exhaust its RAM.
    if (file.size > 50 * 1024 * 1024) {
      setError("Vidéo trop lourde (max 50 Mo). Filmez plus court : le code puis les vues suffisent.");
      e.target.value = '';
      return;
    }
    setBusy(true); setError(null); setPhase('submitting');
    try {
      const up = await sbcApiService.uploadFile(file);
      const fileId = up.body?.data?.fileId || up.body?.fileId;
      if (!up.isSuccessByStatusCode || !fileId) { setError(up.body?.message || "Échec de l'envoi de la vidéo."); setPhase('code'); return; }
      const res = await sbcApiService.submitManualVerifyVideo(participation._id, fileId);
      if (!res.isSuccessByStatusCode) { setError(res.body?.message || "Échec de l'envoi."); setPhase('code'); return; }
      setPhase('submitted');
    } catch { setError("Échec de l'envoi de la vidéo."); setPhase('code'); }
    finally { setBusy(false); }
  };

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  if (phase === 'submitted') {
    return (
      <div className="text-center py-4">
        <FaCheckCircle className="mx-auto text-green-600" size={32} />
        <p className="font-bold text-gray-900 mt-3">Vidéo envoyée</p>
        <p className="text-sm text-gray-600 mt-1">
          Votre publication sera vérifiée par l'équipe. Vous serez crédité une fois validée.
        </p>
        <button onClick={onClose} className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-medium mt-4">Fermer</button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <ol className="text-sm text-gray-700 space-y-1 list-decimal pl-5 mb-3">
        <li>Générez le code ci-dessous.</li>
        <li>Lancez l'enregistrement d'écran de votre téléphone.</li>
        <li>Filmez le code affiché, puis ouvrez WhatsApp et montrez les vues de votre statut.</li>
        <li>Arrêtez l'enregistrement et importez la vidéo <strong>avant la fin du compte à rebours</strong>.</li>
      </ol>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 mb-3">{error}</div>}

      {restoring && phase === 'intro' && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
          <FaSpinner className="animate-spin" /> Vérification d'un code en cours…
        </div>
      )}

      {!restoring && phase === 'intro' && (
        <button onClick={generate} disabled={busy}
          className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-medium disabled:bg-gray-300">
          {busy ? 'Génération…' : 'Générer le code'}
        </button>
      )}

      {(phase === 'code' || phase === 'submitting') && (
        <div>
          <div className="rounded-2xl border-2 border-[#115CF6] bg-blue-50 p-5 text-center">
            <p className="text-xs text-gray-600">Votre code</p>
            <p className="text-4xl font-extrabold tracking-widest text-[#115CF6] mt-1">{code}</p>
            <p className={`text-sm mt-2 flex items-center justify-center gap-1 ${expired ? 'text-red-600' : 'text-gray-600'}`}>
              <FaClock /> {expired ? 'Délai dépassé' : `Temps restant : ${mmss}`}
            </p>
          </div>

          {expired ? (
            <button onClick={generate} disabled={busy}
              className="w-full border border-gray-200 text-gray-700 rounded-xl py-3 font-medium mt-3">
              Générer un nouveau code
            </button>
          ) : (
            <>
              {/* No `capture`: it forces the camera open with no way to pick an
                  existing file, but the video was made earlier with the phone's
                  screen recorder and is sitting in the gallery. */}
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
              <button onClick={() => fileRef.current?.click()} disabled={busy}
                className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-medium mt-3 disabled:bg-gray-300 flex items-center justify-center gap-2">
                {phase === 'submitting' ? <><FaSpinner className="animate-spin" /> Envoi…</> : <><FaVideo /> Importer la vidéo</>}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function VerifySheet({
  participation,
  defaultPhone,
  onClose,
}: {
  participation: Participation;
  defaultPhone?: string;
  onClose: () => void;
}) {
  // Nothing is started until a method is picked. Diffuseurs are on the same phone
  // that would display the QR, so pointing a camera at their own screen is not an
  // option for most of them — the pairing code is what makes this work on one
  // device, and it is offered first for that reason.
  const [method, setMethod] = useState<'qr' | 'code' | 'video' | null>(null);
  // Dial codes are BARE digits here ("237", not "+237") so they compose cleanly
  // and compare correctly. `defaultPhone` (the user's own number, country code and
  // all) seeds both the country picker and the national part, so the field opens on
  // the diffuseur's country with just their local number — not the raw code.
  const dialOf = (c: { phoneCode: string }) => c.phoneCode.replace(/\D/g, '');
  const prefill = (defaultPhone ?? '').replace(/\D/g, '');
  // Longest dial code first, so a number isn't captured by a shorter code that
  // happens to be a prefix of the right one.
  const matched = [...allAfricanCountries]
    .sort((a, b) => dialOf(b).length - dialOf(a).length)
    .find(c => prefill.startsWith(dialOf(c)));
  const [dialCode, setDialCode] = useState(matched ? dialOf(matched) : '237');
  const [phone, setPhone] = useState(matched ? prefill.slice(dialOf(matched).length) : prefill);
  const [state, setState] = useState<string>('starting');
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [result, setResult] = useState<{ verdicts: Verdict[]; totalViews: number; totalEarned: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  // Per participation, so two open verifications can never adopt each other's session.
  const sessionStorageKey = `ads-verify-session:${participation._id}`;
  const [started, setStarted] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  // WhatsApp drops the pairing socket often (reason=408 and friends). Rather than
  // show the raw error and make the diffuseur retry by hand, retry silently a few
  // times behind a "Reconnexion…" state; only surface a friendly error once we
  // have really given up.
  const MAX_ATTEMPTS = 3;
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);

  // Send the number exactly as the diffuseur types it (digits only), country code
  // prepended — no stripping. The trunk-0 rule differs per country (Cameroun drops
  // it; Congo-Brazza and Côte d'Ivoire keep the 0 as part of the subscriber number)
  // and guessing wrong silently burned pairing codes. The echo line below shows
  // precisely what will be sent, so what they type is what they get.
  const nationalDigits = (raw: string) => raw.replace(/\D/g, '');

  useEffect(() => {
    if (!started || !method) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let retryTimer: ReturnType<typeof setTimeout>;
    const attemptStartedAt = Date.now();

    const giveUpMessage = (kind: 'capacity' | 'link') =>
      kind === 'capacity'
        ? 'Trop de vérifications en cours en ce moment. Réessayez dans une minute.'
        : "La connexion à WhatsApp n'a pas abouti. Réessayez, ou choisissez une autre méthode.";

    // Retry by bumping `attempt` (an effect dependency): the cleanup below cancels
    // the current session, then the effect re-runs and opens a fresh one. Only a
    // GENUINELY transient drop is worth retrying — one where the socket died fast.
    // When the pairing window was largely spent (WhatsApp holds the socket ~160s
    // then closes it), the diffuseur already had their chance; retrying would just
    // make them wait another two minutes. Fail fast in that case, and never
    // auto-retry a capacity/queue rejection (that only adds load).
    const retryOrFail = (kind: 'capacity' | 'link') => {
      const elapsedMs = Date.now() - attemptStartedAt;
      const worthRetrying = kind === 'link' && elapsedMs < 45_000 && attempt < MAX_ATTEMPTS - 1;
      if (worthRetrying) {
        setRetrying(true);
        setState('starting');
        setQr(null);
        setPairingCode(null);
        retryTimer = setTimeout(() => setAttempt(a => a + 1), 1500);
      } else {
        setRetrying(false);
        setError(giveUpMessage(kind));
      }
    };

    const poll = async () => {
      if (stopped || !sessionIdRef.current) return;
      const res = await sbcApiService.getVerificationSession(sessionIdRef.current);
      const data = res.body?.data;

      if (!res.isSuccessByStatusCode || data?.state === 'failed') {
        // A failed session is a technical/link failure (a verdict rejection comes
        // back as state 'done'). Retry it rather than dumping "reason=408".
        sessionStorage.removeItem(sessionStorageKey);
        retryOrFail('link');
        return;
      }
      setRetrying(false);
      setState(data?.state ?? 'reading');
      setQueuePosition(typeof data?.queuePosition === 'number' ? data.queuePosition : null);
      if (data?.qr) setQr(data.qr);
      if (data?.pairingCode) setPairingCode(data.pairingCode);

      if (data?.state === 'done') {
        // Finished: nothing left to rejoin.
        sessionStorage.removeItem(sessionStorageKey);
        setResult({
          verdicts: data.verdicts ?? [],
          totalViews: data.totalViews ?? 0,
          totalEarned: data.totalEarned ?? 0,
        });
        return;
      }
      timer = setTimeout(poll, 2000);
    };

    (async () => {
      const res = await sbcApiService.startVerification(participation._id, {
        // The WhatsApp session path only ever runs for qr/code; the video method
        // is fully self-contained in <VideoVerification> and never sets `started`.
        method: method as 'qr' | 'code',
        // Composed here so the country can never be left off.
        phoneNumber: method === 'code'
          ? `${dialCode}${nationalDigits(phone)}`
          : undefined,
      });
      if (stopped) return;
      if (res.statusCode === 503) { retryOrFail('capacity'); return; }
      if (!res.isSuccessByStatusCode) { retryOrFail('link'); return; }
      sessionIdRef.current = res.body?.data?.sessionId ?? null;
      // Remembered so a refresh — or closing and reopening the sheet — rejoins the
      // session that is already linking instead of throwing it away and making the
      // diffuseur start the pairing over.
      if (sessionIdRef.current) {
        sessionStorage.setItem(sessionStorageKey, sessionIdRef.current);
      }
      poll();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(retryTimer);
      // Deliberately NOT cancelled here. Unmounting happens when the diffuseur
      // closes the sheet or the page reloads, and killing the session then lost
      // a pairing that was halfway done. It is picked back up on the next mount
      // and expires on its own server-side if genuinely abandoned.
    };
  }, [started, method, phone, dialCode, participation._id, attempt, sessionStorageKey]);

  // Rejoin a session left running by a refresh or a closed sheet.
  useEffect(() => {
    if (started) return;
    const existing = sessionStorage.getItem(sessionStorageKey);
    if (!existing) return;

    let cancelled = false;
    (async () => {
      const res = await sbcApiService.getVerificationSession(existing);
      if (cancelled) return;
      const state = res.body?.data?.state;
      // Only rejoin something still in flight; a finished or dead session would
      // otherwise strand the diffuseur on a stale screen.
      if (res.isSuccessByStatusCode && state && state !== 'failed' && state !== 'done') {
        sessionIdRef.current = existing;
        setMethod((res.body?.data?.method as 'qr' | 'code') ?? 'code');
        setStarted(true);
      } else {
        sessionStorage.removeItem(sessionStorageKey);
      }
    })();
    return () => { cancelled = true; };
  }, [started, sessionStorageKey]);

  const copyCode = async () => {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const body = () => {
    if (retrying && !error && !result) {
      return (
        <div className="py-8 text-center">
          <HugeiconsIcon icon={Loading03Icon} className="animate-spin mx-auto text-primary" size={28} />
          <p className="font-medium text-gray-900 mt-4">Reconnexion à WhatsApp…</p>
          <p className="text-sm text-gray-600 mt-1">
            La connexion a été interrompue. Nouvelle tentative en cours ({attempt + 1}/{MAX_ATTEMPTS}).
          </p>
          <p className="text-xs text-gray-400 mt-3">Gardez cette page ouverte.</p>
        </div>
      );
    }
    if (error) {
      return (
        <div>
          <div className="bg-red-50 border border-border rounded-xl p-3 text-sm text-red-800">{error}</div>
          <button
            onClick={() => {
              // Deliberately abandoning this attempt: drop the session for real,
              // so the next mount starts fresh instead of rejoining a dead one.
              if (sessionIdRef.current) sbcApiService.cancelVerification(sessionIdRef.current);
              sessionIdRef.current = null;
              sessionStorage.removeItem(sessionStorageKey);
              setError(null); setStarted(false); setMethod(null); setQr(null); setPairingCode(null); setAttempt(0); setRetrying(false);
            }}
            className="w-full border border-border text-gray-700 rounded-xl py-3 font-medium mt-3"
          >
            Choisir une autre méthode
          </button>
        </div>
      );
    }

    if (result) {
      return (
        <div>
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} /> Vérification terminée
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-3">{result.totalViews} vues</p>
          <p className="text-sm text-gray-600">{formatFCFA(result.totalEarned)} pour cette vérification</p>
          <div className="mt-4 space-y-2">
            {result.verdicts.map((v) => (
              <div key={v.day} className={`text-sm rounded-xl p-3 border ${v.accepted ? 'border-border bg-green-50 text-green-900' : 'border-border bg-red-50 text-red-900'}`}>
                <p className="font-medium">Jour {v.day} — {v.accepted ? 'validé' : 'refusé'}</p>
                {!v.accepted && v.reason && <p className="text-xs mt-1">{v.reason}</p>}
                {v.accepted && <p className="text-xs mt-1">{v.viewCount} vues · {formatFCFA(v.earnedAmount)}</p>}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full bg-primary text-white rounded-xl py-3 font-medium mt-4">
            Fermer
          </button>
        </div>
      );
    }

    // Method picker, before anything is started.
    if (!started) {
      return (
        <div>
          <img src={illustrationVerify} alt="" aria-hidden="true" className="w-36 mx-auto -mt-2" />
          <p className="text-sm text-gray-600 mb-4">
            Connectez votre WhatsApp le temps de lire les vues de votre statut.
            Choisissez la méthode qui vous arrange.
          </p>

          <button
            onClick={() => setMethod('code')}
            className={`w-full text-left border rounded-2xl p-4 ${method === 'code' ? 'border-primary bg-blue-50' : 'border-border'}`}
          >
            <div className="flex items-center gap-2 font-medium text-gray-900">
              <HugeiconsIcon icon={KeyboardIcon} className="text-primary" /> Code à 8 caractères
              <span className="ml-auto text-[10px] uppercase tracking-wide bg-primary text-white rounded-full px-2 py-0.5">
                Conseillé
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Sur le même téléphone. Vous entrez un code dans WhatsApp, sans photo à scanner.
            </p>
          </button>

          {method === 'code' && (
            <div className="mt-3">
              <label className="block text-sm text-gray-700 mb-1">
                Numéro WhatsApp à connecter
              </label>
              {/* Country picked, national part typed. One field invited people to
                  send their local number: WhatsApp then bound the code to that,
                  and their app answered « Impossible de connecter l'appareil »
                  with no way for us to see why (Christian, Rufus). */}
              <div className="flex gap-2">
                <select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  className="border border-border rounded-xl px-3 py-3 bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {allAfricanCountries.map((c) => (
                    <option key={c.value} value={dialOf(c)}>{c.flag} {c.phoneCode}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="675080477"
                  className="flex-1 min-w-0 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              {/* WhatsApp binds the code to this exact number; typed wrong, their
                  app answers « Impossible de connecter l'appareil » and the code
                  is burned. Echo what will actually be sent. */}
              {(() => {
                const national = nationalDigits(phone);
                const full = `${dialCode}${national}`;
                return national.length >= 6 ? (
                  <p className="text-xs text-gray-700 mt-2">
                    Le code sera généré pour le <strong>+{full}</strong> — il ne
                    fonctionnera que sur ce WhatsApp.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">
                    Votre numéro sans l'indicatif du pays. Gardez le 0 s'il fait
                    partie de votre numéro (ex. Côte d'Ivoire, Congo).
                  </p>
                );
              })()}
            </div>
          )}

          <button
            onClick={() => setMethod('qr')}
            className={`w-full text-left border rounded-2xl p-4 mt-3 ${method === 'qr' ? 'border-primary bg-blue-50' : 'border-border'}`}
          >
            <div className="flex items-center gap-2 font-medium text-gray-900">
              <HugeiconsIcon icon={QrCodeIcon} className="text-primary" /> Code QR
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Pratique depuis un ordinateur ou un second téléphone.
            </p>
          </button>

          <button
            onClick={() => setMethod('video')}
            className={`w-full text-left border rounded-2xl p-4 mt-3 ${method === 'video' ? 'border-primary bg-blue-50' : 'border-border'}`}
          >
            <div className="flex items-center gap-2 font-medium text-gray-900">
              <FaVideo className="text-[#115CF6]" /> Vérification par vidéo
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Si la connexion WhatsApp ne marche pas : filmez votre écran (code + vues) et envoyez la vidéo.
            </p>
          </button>

          {method === 'video' ? (
            <VideoVerification participation={participation} onClose={onClose} />
          ) : (
            <button
              onClick={() => { setAttempt(0); setRetrying(false); setError(null); setStarted(true); }}
              disabled={!method || (method === 'code' && phone.replace(/\D/g, '').length < 8)}
              className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-medium mt-4 disabled:bg-gray-300"
            >
              Continuer
            </button>
          )}
        </div>
      );
    }

    // Everyone verifying at once on launch night: waiting in line beats being
    // told to come back later, as long as the line is visible.
    if (state === 'queued') {
      return (
        <div className="py-8 text-center">
          <HugeiconsIcon icon={HourglassIcon} className="mx-auto text-primary" size={28} />
          <p className="font-medium text-gray-900 mt-4">
            {queuePosition && queuePosition > 1
              ? `Vous êtes ${queuePosition}ᵉ dans la file`
              : 'Vous êtes le prochain'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Beaucoup de diffuseurs vérifient en ce moment. Votre tour arrive —
            gardez cette page ouverte.
          </p>
          <p className="text-xs text-gray-400 mt-3">Cela prend généralement moins d'une minute.</p>
        </div>
      );
    }

    // Connected: WhatsApp accepted the code, we are reading the account. Leaving
    // the code on screen here made it look like nothing had happened.
    if (state === 'reading') {
      return (
        <div className="py-8 text-center">
          <HugeiconsIcon icon={Loading03Icon} className="animate-spin mx-auto text-primary" size={28} />
          <p className="font-medium text-gray-900 mt-4">Appareil connecté</p>
          <p className="text-sm text-gray-600 mt-1">Lecture de vos statuts et de leurs vues…</p>
          <p className="text-xs text-gray-400 mt-3">Cela prend généralement moins d'une minute.</p>
        </div>
      );
    }

    if (method === 'code' && pairingCode) {
      return (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">
            Dans WhatsApp : <strong>Appareils connectés</strong> → <strong>Connecter un appareil</strong> →
            <strong> Connecter avec le numéro de téléphone</strong>, puis entrez ce code.
          </p>
          <div className="font-mono text-3xl tracking-[0.3em] font-bold text-gray-900 bg-gray-100 rounded-xl py-4">
            {pairingCode}
          </div>
          <button onClick={copyCode} className="text-sm text-primary mt-2">
            {copied ? 'Code copié' : 'Copier le code'}
          </button>
          <p className="text-xs text-gray-500 mt-3">
            La connexion est temporaire. Elle sert uniquement à lire les vues de votre
            statut, puis elle est supprimée.
          </p>
        </div>
      );
    }

    if (method === 'qr' && qr) {
      return (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">
            Dans WhatsApp : <strong>Appareils connectés</strong> → <strong>Connecter un appareil</strong>,
            puis scannez ce code.
          </p>
          <img src={qr} alt="QR code WhatsApp" className="w-56 h-56 mx-auto" />
          <p className="text-xs text-gray-500 mt-3">
            La connexion est temporaire. Elle sert uniquement à lire les vues de votre
            statut, puis elle est supprimée.
          </p>
        </div>
      );
    }

    return (
      <div className="py-8 text-center text-gray-500">
        <HugeiconsIcon icon={Loading03Icon} className="animate-spin mx-auto text-primary" size={24} />
        <p className="text-sm mt-3">
          {state === 'reading'
            ? 'Lecture de vos statuts…'
            : method === 'code'
              ? 'Génération de votre code…'
              : 'Préparation du QR code…'}
        </p>
      </div>
    );
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-auto"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-gray-900">Vérifier ma publication</h2>
          <button onClick={onClose} className="text-gray-400"><HugeiconsIcon icon={Cancel01Icon} /></button>
        </div>
        {body()}
      </motion.div>
    </motion.div>
  );
}

export default AdsNetworkDiffuseur;
