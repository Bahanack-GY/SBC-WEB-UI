import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaExclamationTriangle, FaSpinner, FaShareAlt, FaQrcode, FaCheckCircle,
  FaTimes, FaWallet, FaDownload, FaHourglassHalf, FaKeyboard,
} from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import {
  AdsCardSkeleton, AdsStatCard, AdsDayPips, relativeDate, adsItemMotion, adsHeaderMotion,
} from '../components/ads/AdsScreen';
import { useAdsRoles } from '../hooks/useAdsRoles';
import illustrationShare from '../assets/icon/ads-share.jpg';
import illustrationVerify from '../assets/icon/ads-verify.jpg';
import illustrationEmpty from '../assets/icon/ads-empty.jpg';
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
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [sharing, setSharing] = useState<Participation | null>(null);
  const [verifying, setVerifying] = useState<Participation | null>(null);

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
      return res.body?.data as { balance: number; minimumTransfer: number } | undefined;
    },
  });

  const refreshAll = useCallback(() => {
    refetchParts();
    refetchProfile();
    refetchBalance();
  }, [refetchParts, refetchProfile, refetchBalance]);

  // Redirect during render rather than from an effect, so the dashboard is never
  // painted for someone who is not a diffuseur.
  if (isResolved && !roles.isDiffuseur && !profileLoading && !profile) {
    return <Navigate to="/ads-network/diffuseur/onboarding" replace />;
  }

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
          <div className={`rounded-xl p-3 mt-3 text-sm ${message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Earnings */}
        <motion.div {...adsHeaderMotion} className="bg-[#115CF6] text-white rounded-2xl p-5 mt-4 shadow-lg">
          <div className="flex items-center gap-2 text-blue-100 text-sm">
            <FaWallet /> Solde publicitaire
          </div>
          <p className="text-3xl font-bold mt-1">{formatFCFA(balance?.balance ?? 0)}</p>
          <p className="text-xs text-blue-100 mt-1">
            Transfert possible dès {formatFCFA(balance?.minimumTransfer ?? 0)}.
          </p>
          {profile && (
            <div className="mt-3 pt-3 border-t border-white/20">
              {/* Whether they are measured or still on their own estimate. A
                  diffuseur who receives nothing needs to know it is because the
                  test campaign is still outstanding, not because SBC forgot them. */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${profile.verification?.verified ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}>
                  {profile.verification?.verified ? <FaCheckCircle size={11} /> : <FaHourglassHalf size={11} />}
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

        {partsLoading ? (
          <div className="mt-6"><AdsCardSkeleton rows={2} /></div>
        ) : (
          <>
            {/* Offers */}
            {offers.length > 0 && (
              <section className="mt-6">
                <h2 className="font-semibold text-gray-900 mb-1">Campagnes proposées</h2>
                <p className="text-xs text-gray-500 mb-3">
                  Proposées à plusieurs diffuseurs. Les premiers à accepter les obtiennent.
                </p>
                <div className="space-y-3">
                  {offers.map((p, i) => (
                    <motion.div key={p._id} {...adsItemMotion(i)} className="border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex gap-3">
                        {p.campaign && (
                          <img
                            src={sbcApiService.generateSettingsFileUrl(p.campaign.mediaFileId)}
                            alt={p.campaign.title}
                            className="w-20 h-20 object-cover rounded-xl bg-gray-100 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{p.campaign?.title ?? 'Campagne'}</p>
                          {p.campaign?.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{p.campaign.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            3 jours de publication · environ {p.expectedViews ?? profile?.effectiveAverageViews ?? 0} vues
                          </p>
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
                        <button
                          onClick={() => handleDecline(p)}
                          disabled={acting === p._id}
                          className="px-4 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm"
                        >
                          Refuser
                        </button>
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
                      <motion.div key={p._id} {...adsItemMotion(i)} className="border border-gray-200 rounded-2xl p-4 shadow-sm">
                        {/* The creative being published — the diffuseur should see
                            what is on their status without opening anything. */}
                        {p.campaign && (
                          <img
                            src={sbcApiService.generateSettingsFileUrl(p.campaign.mediaFileId)}
                            alt=""
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
                              <FaShareAlt /> Publier le jour {day?.day}
                            </button>
                          )}
                          {!windowOpen && !awaiting && (
                            <button
                              onClick={() => setVerifying(p)}
                              className="w-full border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium"
                            >
                              Revérifier mes publications
                            </button>
                          )}
                          {awaiting && (
                            <button
                              onClick={() => setVerifying(p)}
                              className="w-full bg-[#115CF6] text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <FaQrcode /> Vérifier le jour {awaiting.day}
                            </button>
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
            {past.length > 0 && (
              <section className="mt-8">
                <h2 className="font-semibold text-gray-900 mb-3">Historique</h2>
                <div className="space-y-2">
                  {past.map((p) => (
                    <div key={p._id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3 text-sm">
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
              </section>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
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
            defaultPhone={profile?.whatsappPhone}
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
          <button onClick={onClose} className="text-gray-400"><FaTimes /></button>
        </div>

        <img src={illustrationShare} alt="" aria-hidden="true" className="w-40 mx-auto -mt-2 mb-1" />

        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-900 mb-4">
          <p className="flex items-start gap-2 font-medium">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
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
        <div className="border border-gray-200 rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap mt-1">
          {caption}
        </div>
        <button onClick={copyCaption} className="text-sm text-[#115CF6] mt-2">
          {copied ? 'Texte copié' : 'Copier le texte'}
        </button>

        {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}

        <button
          onClick={share}
          disabled={busy}
          className="w-full bg-green-600 text-white rounded-xl py-3 font-medium mt-4 flex items-center justify-center gap-2 disabled:bg-gray-400"
        >
          {busy ? <FaSpinner className="animate-spin" /> : <FaShareAlt />}
          Partager sur WhatsApp
        </button>

        <a
          href={mediaDownloadUrl}
          download
          className="w-full border border-gray-200 text-gray-700 rounded-xl py-3 font-medium mt-2 flex items-center justify-center gap-2"
        >
          <FaDownload /> Télécharger l'image
        </a>

        <button
          onClick={confirmPosted}
          disabled={busy}
          className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-medium mt-4 disabled:bg-gray-400"
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
  const [method, setMethod] = useState<'qr' | 'code' | null>(null);
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [state, setState] = useState<string>('starting');
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [result, setResult] = useState<{ verdicts: Verdict[]; totalViews: number; totalEarned: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || !method) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (stopped || !sessionIdRef.current) return;
      const res = await sbcApiService.getVerificationSession(sessionIdRef.current);
      const data = res.body?.data;

      if (!res.isSuccessByStatusCode || data?.state === 'failed') {
        setError(data?.error || res.body?.message || 'La vérification a échoué.');
        return;
      }
      setState(data?.state ?? 'reading');
      if (data?.qr) setQr(data.qr);
      if (data?.pairingCode) setPairingCode(data.pairingCode);

      if (data?.state === 'done') {
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
        method,
        phoneNumber: method === 'code' ? phone : undefined,
      });
      if (stopped) return;
      if (res.statusCode === 503) {
        setError('Toutes les vérifications sont occupées pour le moment. Réessayez dans une minute.');
        return;
      }
      if (!res.isSuccessByStatusCode) {
        setError(res.body?.message || "Impossible d'ouvrir la vérification.");
        return;
      }
      sessionIdRef.current = res.body?.data?.sessionId ?? null;
      poll();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      // Release the slot: sessions are capped and an abandoned one blocks someone
      // else until it times out.
      if (sessionIdRef.current) sbcApiService.cancelVerification(sessionIdRef.current);
    };
  }, [started, method, phone, participation._id]);

  const copyCode = async () => {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const body = () => {
    if (error) {
      return (
        <div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">{error}</div>
          <button
            onClick={() => { setError(null); setStarted(false); setMethod(null); setQr(null); setPairingCode(null); }}
            className="w-full border border-gray-200 text-gray-700 rounded-xl py-3 font-medium mt-3"
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
            <FaCheckCircle /> Vérification terminée
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-3">{result.totalViews} vues</p>
          <p className="text-sm text-gray-600">{formatFCFA(result.totalEarned)} pour cette vérification</p>
          <div className="mt-4 space-y-2">
            {result.verdicts.map((v) => (
              <div key={v.day} className={`text-sm rounded-xl p-3 border ${v.accepted ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
                <p className="font-medium">Jour {v.day} — {v.accepted ? 'validé' : 'refusé'}</p>
                {!v.accepted && v.reason && <p className="text-xs mt-1">{v.reason}</p>}
                {v.accepted && <p className="text-xs mt-1">{v.viewCount} vues · {formatFCFA(v.earnedAmount)}</p>}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-medium mt-4">
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
            className={`w-full text-left border rounded-2xl p-4 ${method === 'code' ? 'border-[#115CF6] bg-blue-50' : 'border-gray-200'}`}
          >
            <div className="flex items-center gap-2 font-medium text-gray-900">
              <FaKeyboard className="text-[#115CF6]" /> Code à 8 caractères
              <span className="ml-auto text-[10px] uppercase tracking-wide bg-[#115CF6] text-white rounded-full px-2 py-0.5">
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
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ex. 237675080477"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#115CF6] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Avec l'indicatif du pays, sans le « + ».
              </p>
            </div>
          )}

          <button
            onClick={() => setMethod('qr')}
            className={`w-full text-left border rounded-2xl p-4 mt-3 ${method === 'qr' ? 'border-[#115CF6] bg-blue-50' : 'border-gray-200'}`}
          >
            <div className="flex items-center gap-2 font-medium text-gray-900">
              <FaQrcode className="text-[#115CF6]" /> Code QR
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Pratique depuis un ordinateur ou un second téléphone.
            </p>
          </button>

          <button
            onClick={() => setStarted(true)}
            disabled={!method || (method === 'code' && phone.replace(/\D/g, '').length < 8)}
            className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-medium mt-4 disabled:bg-gray-300"
          >
            Continuer
          </button>
        </div>
      );
    }

    // Connected: WhatsApp accepted the code, we are reading the account. Leaving
    // the code on screen here made it look like nothing had happened.
    if (state === 'reading') {
      return (
        <div className="py-8 text-center">
          <FaSpinner className="animate-spin mx-auto text-[#115CF6]" size={28} />
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
          <button onClick={copyCode} className="text-sm text-[#115CF6] mt-2">
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
        <FaSpinner className="animate-spin mx-auto text-[#115CF6]" size={24} />
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
          <button onClick={onClose} className="text-gray-400"><FaTimes /></button>
        </div>
        {body()}
      </motion.div>
    </motion.div>
  );
}

export default AdsNetworkDiffuseur;
