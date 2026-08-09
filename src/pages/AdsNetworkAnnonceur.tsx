import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaSpinner, FaTimes, FaExternalLinkAlt, FaEye, FaMousePointer } from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import { AdsCardSkeleton, AdsStatCard, adsItemMotion } from '../components/ads/AdsScreen';
import { sbcApiService } from '../services/SBCApiService';

type CampaignStatus =
  | 'draft' | 'pending_review' | 'approved' | 'rejected'
  | 'active' | 'completed' | 'banked' | 'cancelled';

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
  approved: 'Validée — à payer',
  rejected: 'Refusée',
  active: 'En diffusion',
  completed: 'Terminée',
  banked: 'Créditée',
  cancelled: 'Annulée',
};

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
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

  const handleSubmit = async (c: Campaign) => {
    setActing(c._id);
    setError(null);
    try {
      const res = await sbcApiService.submitAdsCampaign(c._id);
      if (!res.isSuccessByStatusCode) {
        setError(res.body?.message || "L'envoi à la validation a échoué.");
        return;
      }
      refetch();
    } finally {
      setActing(null);
    }
  };

  const handleBank = async (c: Campaign) => {
    setActing(c._id);
    setError(null);
    try {
      const res = await sbcApiService.decideAdsCampaign(c._id, 'bank');
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
          <button
            onClick={() => navigate('/ads-network/annonceur/nouvelle-campagne')}
            className="flex items-center gap-2 bg-[#115CF6] text-white rounded-xl px-4 py-2 text-sm font-medium"
          >
            <FaPlus size={12} /> Nouvelle
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 mt-3">{error}</div>
        )}

        {/* Totals across every campaign. An annonceur's first question is what
            their money bought, and it used to require adding up the cards. */}
        {!!campaigns?.length && (
          <div className="grid grid-cols-3 gap-2 mt-4">
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
        )}

        {isLoading ? (
          <div className="mt-5"><AdsCardSkeleton rows={2} /></div>
        ) : !campaigns?.length ? (
          <div className="text-center text-gray-500 py-12">
            <p>Vous n'avez pas encore d'annonce.</p>
            <button
              onClick={() => navigate('/ads-network/annonceur/onboarding')}
              className="text-[#115CF6] font-medium mt-2"
            >
              Créer ma première annonce
            </button>
          </div>
        ) : (
          <div className="space-y-3 mt-5">
            {campaigns.map((c, i) => (
              <motion.div key={c._id} {...adsItemMotion(i)} className="border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <img
                    src={sbcApiService.generateSettingsFileUrl(c.mediaFileId)}
                    alt={c.title}
                    className="w-16 h-16 object-cover rounded-xl bg-gray-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900">{c.title}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatFCFA(c.amountPaid)}</p>

                    {(c.status === 'active' || c.status === 'completed' || c.status === 'banked') && (
                      <>
                        <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${c.progress.percentComplete}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {c.progress.uniqueViewsDelivered.toLocaleString('fr-FR')} /{' '}
                          {c.progress.targetUniqueViews.toLocaleString('fr-FR')} vues uniques
                          {' · '}
                          {c.progress.repeatViewsDelivered.toLocaleString('fr-FR')} vues offertes
                          {' · '}
                          {c.clicksTotal} clic(s)
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {c.status === 'rejected' && c.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 mt-3">
                    <p className="font-medium">Motif du refus</p>
                    <p className="mt-1">{c.rejectionReason}</p>
                  </div>
                )}

                {c.status === 'pending_review' && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 mt-3">
                    Notre équipe relit votre annonce. Vous pourrez payer dès qu'elle sera validée.
                  </p>
                )}

                {c.status === 'banked' && (
                  <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-xl p-2 mt-3">
                    {formatFCFA(c.bankedAmount ?? 0)} conservés en crédit pour une prochaine campagne.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {c.status === 'approved' && (
                    <button
                      onClick={() => handlePay(c)}
                      disabled={acting === c._id}
                      className="flex-1 bg-[#115CF6] text-white rounded-xl py-2.5 text-sm font-medium disabled:bg-gray-400"
                    >
                      {acting === c._id ? 'Ouverture…' : 'Payer et lancer'}
                    </button>
                  )}
                  {(c.status === 'draft' || c.status === 'rejected') && (
                    <button
                      onClick={() => handleSubmit(c)}
                      disabled={acting === c._id}
                      className="flex-1 bg-[#115CF6] text-white rounded-xl py-2.5 text-sm font-medium disabled:bg-gray-400"
                    >
                      {acting === c._id ? 'Envoi…' : 'Envoyer à la validation'}
                    </button>
                  )}
                  {c.status === 'active' && (
                    <>
                      <button
                        onClick={() => setDetail(c)}
                        className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium"
                      >
                        Voir les diffuseurs
                      </button>
                      <button
                        onClick={() => handleBank(c)}
                        disabled={acting === c._id}
                        className="px-4 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm"
                      >
                        Clôturer
                      </button>
                    </>
                  )}
                  {(c.status === 'completed' || c.status === 'banked') && (
                    <button
                      onClick={() => setDetail(c)}
                      className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium"
                    >
                      Voir les résultats
                    </button>
                  )}
                  {c.landingPageUrl && (
                    <a
                      href={c.landingPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm flex items-center gap-2"
                    >
                      <FaExternalLinkAlt size={11} /> Ma page
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
        {detail && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-auto"
              initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-gray-900">{detail.title}</h2>
                <button onClick={() => setDetail(null)} className="text-gray-400"><FaTimes /></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 flex items-center gap-1"><FaEye size={11} /> Vues livrées</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {detail.progress.totalViewsDelivered.toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 flex items-center gap-1"><FaMousePointer size={11} /> Clics</p>
                  <p className="text-lg font-semibold text-gray-900">{detail.clicksTotal}</p>
                </div>
              </div>

              <h3 className="font-medium text-gray-900 mb-2">Par diffuseur</h3>
              <p className="text-xs text-gray-500 mb-3">
                Le taux de clic distingue ceux qui apportent des contacts de ceux qui
                apportent seulement de la portée.
              </p>

              {perfLoading ? (
                <div className="flex justify-center py-8"><FaSpinner className="animate-spin text-[#115CF6]" /></div>
              ) : !performance?.diffuseurs?.length ? (
                <p className="text-sm text-gray-500">Aucun diffuseur n'a encore publié cette campagne.</p>
              ) : (
                <div className="space-y-2">
                  {performance.diffuseurs.map((d) => (
                    <div key={d.diffuseurUserId} className="flex items-center justify-between border border-gray-100 rounded-xl p-3 text-sm">
                      <div>
                        <p className="text-gray-900">{d.totalViews.toLocaleString('fr-FR')} vues</p>
                        <p className="text-xs text-gray-500">{d.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900">{d.clicks} clic(s)</p>
                        <p className="text-xs text-gray-500">{(d.clickThroughRate * 100).toFixed(2)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdsNetworkAnnonceur;
