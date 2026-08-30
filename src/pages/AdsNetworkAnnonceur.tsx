import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, ChampionIcon, Cursor01Icon, EyeIcon, GiftIcon, LinkSquare01Icon, Loading03Icon, Megaphone01Icon, PlusSignIcon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import BackButton from '../components/common/BackButton';
import { AdsCardSkeleton, AdsStatCard, adsItemMotion, adsHeaderMotion } from '../components/ads/AdsScreen';
import illustrationEmpty from '../assets/icon/ads-empty.jpg';
import { sbcApiService } from '../services/SBCApiService';

type CampaignStatus =
  | 'draft' | 'pending_review' | 'approved' | 'paid' | 'rejected'
  | 'active' | 'paused' | 'completed' | 'banked' | 'cancelled';

interface Campaign {
  _id: string;
  title: string;
  status: CampaignStatus;
  amountPaid: number;
  rejectionReason?: string;
  landingPageUrl?: string;
  mediaFileId: string;
  clicksTotal: number;
  bankedAmount?: number;
  progress: {
    uniqueViewsDelivered: number;
    targetUniqueViews: number;
    repeatViewsDelivered: number;
    totalViewsDelivered: number;
    percentComplete: number;
  };
}

interface DiffuseurRow {
  diffuseurUserId: string;
  status: string;
  totalViews: number;
  clicks: number;
  clickThroughRate: number;
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Brouillon',
  pending_review: 'En validation',
  paid: 'Payée — en validation',
  approved: 'Validée — à payer',
  rejected: 'Refusée',
  active: 'En diffusion',
  paused: 'En pause',
  completed: 'Terminée',
  banked: 'Créditée',
  cancelled: 'Annulée',
};

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-amber-100 text-amber-800',
  paid: 'bg-indigo-100 text-indigo-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
  completed: 'bg-purple-100 text-purple-800',
  banked: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const formatFCFA = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

/**
 * Annonceur dashboard: campaigns, where each one stands, and what to do next.
 *
 * Each status carries its own action — pay an approved campaign, fix and resubmit
 * a rejected one — because "validée" with no button next to it reads as a dead end.
 */
function AdsNetworkAnnonceur() {
  const navigate = useNavigate();
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [closing, setClosing] = useState<Campaign | null>(null);
  const [cancelling, setCancelling] = useState<Campaign | null>(null);

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ['ads-my-campaigns'],
    queryFn: async () => {
      const res = await sbcApiService.getMyAdsCampaigns({ limit: 50 });
      return (res.body?.data ?? []) as Campaign[];
    },
  });

  const { data: performance, isFetching: perfLoading } = useQuery({
    queryKey: ['ads-campaign-performance', detail?._id],
    queryFn: async () => {
      const res = await sbcApiService.getAdsCampaignPerformance(detail!._id);
      return res.body?.data as { diffuseurs: DiffuseurRow[] } | undefined;
    },
    enabled: Boolean(detail),
  });

  const handlePay = async (c: Campaign) => {
    setActing(c._id);
    setError(null);
    try {
      const res = await sbcApiService.payAdsCampaign(c._id);
      if (!res.isSuccessByStatusCode) {
        setError(res.body?.message || "Le paiement n'a pas pu être ouvert.");
        return;
      }

      // A null sessionId is the success case where banked credit covered the whole
      // budget: the campaign is already live and there is nothing to pay.
      const sessionId = res.body?.data?.sessionId;
      if (!sessionId) {
        refetch();
        return;
      }
      window.location.href = sbcApiService.generatePaymentUrl(sessionId);
    } finally {
      setActing(null);
    }
  };

  // There is no separate "submit for review" step any more: paying is what puts a
  // campaign in front of an admin, so handlePay covers draft and rejected too.

  const handleBank = async (c: Campaign) => {
    setActing(c._id);
    setError(null);
    try {
      const res = await sbcApiService.decideAdsCampaign(c._id, 'bank');
      if (!res.isSuccessByStatusCode) {
        setError(res.body?.message || "L'opération a échoué.");
        return;
      }
      setClosing(null);
      refetch();
    } finally {
      setActing(null);
    }
  };

  const handleCancel = async (c: Campaign) => {
    setActing(c._id);
    setError(null);
    try {
      const res = await sbcApiService.cancelAdsCampaign(c._id);
      if (!res.isSuccessByStatusCode) {
        setError(res.body?.message || "L'annulation a échoué.");
        return;
      }
      setCancelling(null);
      refetch();
    } finally {
      setActing(null);
    }
  };

  const handlePauseResume = async (c: Campaign) => {
    setActing(c._id);
    setError(null);
    try {
      const res = c.status === 'paused'
        ? await sbcApiService.resumeAdsCampaign(c._id)
        : await sbcApiService.pauseAdsCampaign(c._id);
      if (!res.isSuccessByStatusCode) {
        setError(res.body?.message || "L'opération a échoué.");
        return;
      }
      refetch();
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <BackButton />

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">Espace annonceur</h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/ads-network/annonceur/nouvelle-campagne')}
            className="flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-2 text-sm font-medium"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={12} /> Nouvelle
          </motion.button>
        </div>

        {error && (
          <div className="bg-red-50 border border-border rounded-xl p-3 text-sm text-red-800 mt-3">{error}</div>
        )}

        {/* Totals across every campaign. An annonceur's first question is what
            their money bought, and it used to require adding up the cards. */}
        {!!campaigns?.length && (
          <>
            <motion.div
              {...adsHeaderMotion}
              className="bg-primary relative overflow-hidden text-white rounded-2xl p-5 mt-4"
            >
              <HugeiconsIcon icon={Megaphone01Icon} className="absolute -right-4 -bottom-4 text-white/10" size={110} />
              <div className="flex items-center gap-2 text-blue-100 text-sm">
                <HugeiconsIcon icon={Megaphone01Icon} /> Budget restant
              </div>
              {/* What is still working for them: unconsumed budget of live
                  campaigns plus banked credit. Total spend is the subtitle —
                  the big number should answer "what do I still have". */}
              <p className="text-3xl font-bold mt-1">
                {formatFCFA(campaigns.reduce((n, c) => {
                  if (c.status === 'active') {
                    const ratio = c.progress.targetUniqueViews
                      ? c.progress.uniqueViewsDelivered / c.progress.targetUniqueViews : 0;
                    return n + Math.max(0, c.amountPaid * (1 - ratio));
                  }
                  return n + (c.bankedAmount ?? 0);
                }, 0))}
              </p>
              <p className="text-xs text-blue-100 mt-1">
                sur {formatFCFA(campaigns.reduce((n, c) => n + c.amountPaid, 0))} investis ·{' '}
                {campaigns.filter(c => c.status === 'active').length} campagne(s) en diffusion
              </p>
            </motion.div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <AdsStatCard
                index={0}
                label="Vues livrées"
                value={campaigns.reduce((n, c) => n + c.progress.totalViewsDelivered, 0).toLocaleString('fr-FR')}
              />
              <AdsStatCard
                index={1}
                label="Clics reçus"
                value={campaigns.reduce((n, c) => n + c.clicksTotal, 0).toLocaleString('fr-FR')}
                tone="green"
              />
              <AdsStatCard
                index={2}
                label="Campagnes actives"
                value={campaigns.filter(c => c.status === 'active').length}
              />
            </div>
          </>
        )}

        {isLoading ? (
          <div className="mt-5"><AdsCardSkeleton rows={2} /></div>
        ) : !campaigns?.length ? (
          <motion.div {...adsItemMotion(0)} className="text-center py-10">
            <img
              src={illustrationEmpty}
              alt=""
              className="w-40 h-40 object-cover rounded-3xl mx-auto"
            />
            <p className="text-gray-700 font-medium mt-4">Vous n'avez pas encore d'annonce.</p>
            <p className="text-sm text-gray-500 mt-1">
              Des centaines de statuts WhatsApp attendent votre produit.
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/ads-network/annonceur/onboarding')}
              className="bg-primary text-white rounded-xl px-6 py-3 text-sm font-medium mt-4"
            >
              Créer ma première annonce
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-3 mt-5">
            {campaigns.map((c, i) => (
              <motion.div key={c._id} {...adsItemMotion(i)} className="bg-white border border-border rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={sbcApiService.generateSettingsFileUrl(c.mediaFileId)}
                    alt={c.title}
                    className="w-20 h-20 object-cover rounded-xl bg-gray-100 shrink-0 ring-1 ring-gray-100"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{c.title}</p>
                      <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                        {c.status === 'active' && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600" />
                          </span>
                        )}
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-primary mt-0.5">{formatFCFA(c.amountPaid)}</p>

                    {(c.status === 'active' || c.status === 'paused' || c.status === 'completed' || c.status === 'banked') && (
                      <>
                        <div className="flex items-center gap-2 mt-2.5">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex-1">
                            <motion.div
                              className="bg-success h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(c.progress.percentComplete, c.progress.percentComplete > 0 ? 4 : 0)}%` }}
                              transition={{ delay: 0.3 + i * 0.07, duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600 tabular-nums">
                            {Math.round(c.progress.percentComplete)}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="inline-flex items-center gap-1 bg-gray-50 border border-border text-gray-700 rounded-lg px-2 py-1 text-[11px]">
                            <HugeiconsIcon icon={EyeIcon} size={10} className="text-primary" />
                            {c.progress.uniqueViewsDelivered.toLocaleString('fr-FR')}/{c.progress.targetUniqueViews.toLocaleString('fr-FR')} uniques
                          </span>
                          <span className="inline-flex items-center gap-1 bg-gray-50 border border-border text-gray-700 rounded-lg px-2 py-1 text-[11px]">
                            <HugeiconsIcon icon={GiftIcon} size={10} className="text-purple-500" />
                            {c.progress.repeatViewsDelivered.toLocaleString('fr-FR')} offertes
                          </span>
                          <span className="inline-flex items-center gap-1 bg-gray-50 border border-border text-gray-700 rounded-lg px-2 py-1 text-[11px]">
                            <HugeiconsIcon icon={Cursor01Icon} size={10} className="text-green-600" />
                            {c.clicksTotal} clic{c.clicksTotal > 1 ? 's' : ''}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {c.status === 'rejected' && c.rejectionReason && (
                  <div className="bg-red-50 border border-border rounded-xl p-3 text-sm text-red-800 mt-3">
                    <p className="font-medium">Motif du refus</p>
                    <p className="mt-1">{c.rejectionReason}</p>
                  </div>
                )}

                {c.status === 'paid' && (
                  <p className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-xl p-2 mt-3">
                    Paiement reçu. Notre équipe valide votre annonce — elle démarre dès validation.
                  </p>
                )}

                {c.status === 'pending_review' && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-border rounded-xl p-2 mt-3">
                    Notre équipe relit votre annonce. Vous pourrez payer dès qu'elle sera validée.
                  </p>
                )}

                {c.status === 'banked' && (
                  <p className="text-xs text-yellow-800 bg-yellow-50 border border-border rounded-xl p-2 mt-3">
                    {formatFCFA(c.bankedAmount ?? 0)} conservés en crédit pour une prochaine campagne.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {c.status === 'approved' && (
                    <>
                      <button
                        onClick={() => handlePay(c)}
                        disabled={acting === c._id}
                        className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-medium disabled:bg-gray-400"
                      >
                        {acting === c._id ? 'Ouverture…' : 'Payer et lancer'}
                      </button>
                      <button
                        onClick={() => setCancelling(c)}
                        disabled={acting === c._id}
                        className="px-4 border border-border text-gray-600 rounded-xl py-2.5 text-sm"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                  {(c.status === 'pending_review' || c.status === 'draft' || c.status === 'rejected') && (
                    <button
                      onClick={() => setCancelling(c)}
                      disabled={acting === c._id}
                      className="px-4 border border-border text-gray-600 rounded-xl py-2.5 text-sm"
                    >
                      Annuler la campagne
                    </button>
                  )}
                  {(c.status === 'draft' || c.status === 'rejected') && (
                    <button
                      onClick={() => handlePay(c)}
                      disabled={acting === c._id}
                      className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-medium disabled:bg-gray-400"
                    >
                      {acting === c._id ? 'Ouverture…' : 'Payer et envoyer à la validation'}
                    </button>
                  )}
                  {c.status === 'active' && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDetail(c)}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-50 text-primary rounded-xl py-2.5 text-sm font-medium"
                      >
                        <HugeiconsIcon icon={UserGroupIcon} size={13} /> Voir les diffuseurs
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handlePauseResume(c)}
                        disabled={acting === c._id}
                        className="px-4 border border-orange-200 text-orange-700 rounded-xl py-2.5 text-sm"
                      >
                        {acting === c._id ? '…' : 'Pause'}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setClosing(c)}
                        disabled={acting === c._id}
                        className="px-4 border border-border text-gray-600 rounded-xl py-2.5 text-sm"
                      >
                        Clôturer
                      </motion.button>
                    </>
                  )}
                  {c.status === 'paused' && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handlePauseResume(c)}
                        disabled={acting === c._id}
                        className="flex-1 bg-[#115CF6] text-white rounded-xl py-2.5 text-sm font-medium disabled:bg-gray-400"
                      >
                        {acting === c._id ? 'Relance…' : 'Relancer la campagne'}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDetail(c)}
                        className="px-4 border border-gray-200 text-[#115CF6] rounded-xl py-2.5 text-sm"
                      >
                        <HugeiconsIcon icon={UserGroupIcon} size={13} />
                      </motion.button>
                    </>
                  )}
                  {(c.status === 'completed' || c.status === 'banked') && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setDetail(c)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-50 text-primary rounded-xl py-2.5 text-sm font-medium"
                    >
                      <HugeiconsIcon icon={ChampionIcon} size={13} /> Voir les résultats
                    </motion.button>
                  )}
                  {c.landingPageUrl && (
                    <a
                      href={c.landingPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 border border-border text-gray-700 rounded-xl py-2.5 text-sm flex items-center gap-2"
                    >
                      <HugeiconsIcon icon={LinkSquare01Icon} size={11} /> Ma page
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-6">
          Budget non consommé : conservé en crédit, non remboursable en espèces.
        </p>
      </div>

      <AnimatePresence>
        {cancelling && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => acting !== cancelling._id && setCancelling(null)}
          >
            <motion.div
              className="bg-white w-full max-w-md rounded-3xl p-5"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-bold text-lg text-gray-900">Annuler « {cancelling.title} » ?</h2>
              <p className="text-sm text-gray-600 mt-2">
                {cancelling.status === 'approved'
                  ? "Cette campagne est déjà validée : en l'annulant, l'approbation est perdue. Pour la relancer plus tard, elle devra repasser par la validation de notre équipe."
                  : 'La campagne sera annulée. Vous pourrez en créer une nouvelle à tout moment.'}
              </p>
              <div className="flex gap-2 mt-5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCancelling(null)}
                  disabled={acting === cancelling._id}
                  className="flex-1 border border-border text-gray-700 rounded-xl py-3 text-sm font-medium"
                >
                  Garder la campagne
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCancel(cancelling)}
                  disabled={acting === cancelling._id}
                  className="flex-1 bg-red-600 text-white rounded-xl py-3 text-sm font-medium disabled:bg-gray-400"
                >
                  {acting === cancelling._id ? 'Annulation…' : "Annuler définitivement"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Closing is one tap but not reversible — the campaign leaves diffusion
          for good. Spell out what is kept and what stops before acting. */}
      <AnimatePresence>
        {closing && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => acting !== closing._id && setClosing(null)}
          >
            <motion.div
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5"
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
              <h2 className="font-bold text-lg text-gray-900">Clôturer « {closing.title} » ?</h2>
              <p className="text-sm text-gray-600 mt-2">
                La diffusion s'arrête immédiatement et la campagne ne pourra pas être relancée.
              </p>
              <ul className="text-sm text-gray-600 mt-3 space-y-2">
                <li className="flex gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  Les {closing.progress.totalViewsDelivered.toLocaleString('fr-FR')} vues déjà livrées restent acquises.
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  <span>
                    Le budget non consommé (~
                    {formatFCFA(Math.max(0, closing.amountPaid * (1 - (closing.progress.targetUniqueViews
                      ? closing.progress.uniqueViewsDelivered / closing.progress.targetUniqueViews : 0))))}
                    ) est conservé en <strong>crédit</strong> pour votre prochaine campagne.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 shrink-0">!</span>
                  Ce crédit n'est pas remboursable en espèces.
                </li>
              </ul>
              <div className="flex gap-2 mt-5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setClosing(null)}
                  disabled={acting === closing._id}
                  className="flex-1 border border-border text-gray-700 rounded-xl py-3 text-sm font-medium"
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleBank(closing)}
                  disabled={acting === closing._id}
                  className="flex-1 bg-red-600 text-white rounded-xl py-3 text-sm font-medium disabled:bg-gray-400"
                >
                  {acting === closing._id ? 'Clôture…' : 'Clôturer définitivement'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detail && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-auto"
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            >
              {/* Sheet header: the creative anchors which campaign this is. */}
              <div className="sticky top-0 bg-white/95 backdrop-blur rounded-t-3xl px-5 pt-3 pb-3 border-b border-border">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden" />
                <div className="flex items-center gap-3">
                  <img
                    src={sbcApiService.generateSettingsFileUrl(detail.mediaFileId)}
                    alt=""
                    className="w-10 h-10 object-cover rounded-lg ring-1 ring-gray-100"
                  />
                  <h2 className="font-bold text-lg text-gray-900 flex-1 truncate">{detail.title}</h2>
                  <button
                    onClick={() => setDetail(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={13} />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <motion.div {...adsItemMotion(0, 0.05)} className="bg-blue-50 border border-border rounded-2xl p-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center mb-2">
                      <HugeiconsIcon icon={EyeIcon} size={11} />
                    </div>
                    <p className="text-xl font-bold text-gray-900 leading-none">
                      {detail.progress.uniqueViewsDelivered.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-tight">
                      Vues uniques<br />sur {detail.progress.targetUniqueViews.toLocaleString('fr-FR')} visées
                    </p>
                  </motion.div>
                  <motion.div {...adsItemMotion(1, 0.05)} className="bg-purple-50 border border-border rounded-2xl p-3">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center mb-2">
                      <HugeiconsIcon icon={GiftIcon} size={11} />
                    </div>
                    <p className="text-xl font-bold text-gray-900 leading-none">
                      {detail.progress.totalViewsDelivered.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-tight">
                      Vues totales<br />dont {detail.progress.repeatViewsDelivered.toLocaleString('fr-FR')} offertes
                    </p>
                  </motion.div>
                  <motion.div {...adsItemMotion(2, 0.05)} className="bg-green-50 border border-border rounded-2xl p-3">
                    <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center mb-2">
                      <HugeiconsIcon icon={Cursor01Icon} size={11} />
                    </div>
                    <p className="text-xl font-bold text-gray-900 leading-none">{detail.clicksTotal}</p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-tight">Clics<br />reçus</p>
                  </motion.div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <HugeiconsIcon icon={UserGroupIcon} size={13} className="text-primary" /> Par diffuseur
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Le taux de clic distingue ceux qui apportent des contacts de ceux qui
                  apportent seulement de la portée.
                </p>

                {perfLoading ? (
                  <div className="flex justify-center py-8"><HugeiconsIcon icon={Loading03Icon} className="animate-spin text-primary" /></div>
                ) : !performance?.diffuseurs?.length ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-primary flex items-center justify-center mx-auto mb-3">
                      <HugeiconsIcon icon={Megaphone01Icon} size={20} />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Diffusion en préparation</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[240px] mx-auto">
                      Vos diffuseurs préparent leur publication. Les premières vues
                      apparaissent en général sous 24 h.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {performance.diffuseurs.map((d, i) => (
                      <motion.div
                        key={d.diffuseurUserId}
                        {...adsItemMotion(i, 0.1)}
                        className="flex items-center gap-3 border border-border rounded-xl p-3 text-sm"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            {d.totalViews.toLocaleString('fr-FR')} vues
                          </p>
                          <p className="text-xs text-gray-500">{d.clicks} clic{d.clicks > 1 ? 's' : ''}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold rounded-full px-2.5 py-1 ${d.clickThroughRate >= 0.02 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {(d.clickThroughRate * 100).toFixed(1)}% CTR
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdsNetworkAnnonceur;
