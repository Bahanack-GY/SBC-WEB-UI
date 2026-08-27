import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, Loading03Icon, LockIcon } from '@hugeicons/core-free-icons';
import { useState, useEffect } from 'react';
import Header from '../components/common/Header'
import ProfileHeaderCard from '../components/home/ProfileHeaderCard';
import BalanceCard from '../components/home/BalanceCard';
import ServicesGrid from '../components/home/ServicesGrid';
import LeaderboardPreview from '../components/home/LeaderboardPreview';
import CommunityLinks from '../components/home/CommunityLinks';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TourButton from '../components/common/TourButton';
import NegativeBalanceNotification from '../components/NegativeBalanceNotification';
import RelancePacksModal from '../components/relance/RelancePacksModal';
import { useRelance } from '../contexts/RelanceContext';

// Define interfaces
type FormationDecoration = 'orange' | 'gold' | 'new';

interface Formation {
  _id: string;
  title: string;
  link: string;                                        // '' when locked
  requiredSubscriptionType?: 'CLASSIQUE' | 'CIBLE';
  decoration?: FormationDecoration | string;
  locked?: boolean;
}

// Visual variants for the decoration field. Backend filters by tier server-side;
// this is purely presentational. Unknown decoration values fall through to default.
function getFormationCardVariant(decoration?: string): {
  container: string;
  title: string;
  badge?: string;
} {
  switch (decoration) {
    case 'orange':
      return {
        container:
          'bg-accent-soft border-2 border-accent',
        title: 'text-orange-600',
      };
    case 'gold':
      return {
        container:
          'bg-accent-soft border-2 border-accent',
        title: 'text-amber-700',
      };
    case 'new':
      return {
        container: 'border border-border hover:bg-gray-50',
        title: 'text-blue-700',
        badge: 'NEW',
      };
    default:
      return {
        container: 'border border-border hover:bg-gray-50',
        title: 'text-blue-700',
      };
  }
}

interface TransactionStats {
  balance: number;
  [key: string]: unknown;
}

interface ReferralStats {
  totalReferrals: number;
  [key: string]: unknown;
}



interface SettingsData {
  presentationPdf?: {
    fileId: string;
  };
  presentationVideo?: {
    fileId: string;
  };
  [key: string]: unknown;
}

// Query keys for consistent caching
export const queryKeys = {
  transactionStats: ['transaction-stats'] as const,
  referralStats: ['referral-stats'] as const,
  currentSubscription: ['current-subscription'] as const,
  formations: ['formations'] as const,
  settings: ['settings'] as const,
};

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Non abonné');
  const [isFormationsModalOpen, setIsFormationsModalOpen] = useState(false);
  const [lockedFormation, setLockedFormation] = useState<Formation | null>(null);
  const [showNegativeBalanceModal, setShowNegativeBalanceModal] = useState(false);
  const [showRelanceModal, setShowRelanceModal] = useState(false);
  const { hasCredits: hasRelanceAccess } = useRelance();

  // Use React Query for API calls with optimized settings
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery<TransactionStats>({
    queryKey: queryKeys.transactionStats,
    queryFn: async () => {
      const response = await sbcApiService.getTransactionStats();
      return handleApiResponse(response);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  const { data: referralStats, isLoading: referralLoading } = useQuery<ReferralStats>({
    queryKey: queryKeys.referralStats,
    queryFn: async () => {
      const response = await sbcApiService.getReferralStats();
      return handleApiResponse(response);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // Note: Subscription data is now handled by Abonnement page to avoid duplicate API calls
  // The subscription status is derived from user.activeSubscriptions if available

  const { data: formations, isLoading: formationsLoading, error: formationsError } = useQuery<Formation[]>({
    queryKey: queryKeys.formations,
    queryFn: async () => {
      try {
        const response = await sbcApiService.getFormations();
        return handleApiResponse(response);
      } catch (err) {
        return [];
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  const { data: settingsData } = useQuery<SettingsData>({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      const response = await sbcApiService.getAppSettings();
      return handleApiResponse(response);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // Update subscription status when data changes
  useEffect(() => {
    // Since we removed subscription query from this page, rely on user.activeSubscriptions
    if (user?.activeSubscriptions && user.activeSubscriptions.length > 0) {
      setSubscriptionStatus('Abonné');
    } else {
      setSubscriptionStatus('Non abonné');
    }
  }, [user]);

  // Per-section loading. This used to be the OR of all four queries, so the
  // whole page rendered a skeleton until the slowest settled, and a single
  // failing query blanked three healthy sections. Each section now owns its
  // own state and nothing on Home blocks on a network round-trip.

  const balance = statsData?.balance || user?.balance || 0;
  const usdBalance = user?.usdBalance || 0;

  // Check for negative balance and show notification
  useEffect(() => {
    if (!statsLoading && !statsError && balance < 0) {
      // Check if this is the first page load for this user session (login)
      const sessionKey = `first-home-visit-${user?.id || 'anonymous'}`;
      const isFirstVisit = !sessionStorage.getItem(sessionKey);

      // Show modal only on first visit of the session (login)
      if (isFirstVisit) {
        setShowNegativeBalanceModal(true);

        // Mark this session as visited
        sessionStorage.setItem(sessionKey, 'true');

        // Also track globally to prevent showing again after logout/login
        const modalShownKey = `negative-balance-modal-shown-${user?.id || 'anonymous'}`;
        localStorage.setItem(modalShownKey, Date.now().toString());
      }

      // Optional: Uncomment below for time-based behavior
      /*
      // Show modal if enough time has passed (24 hours)
      if (shouldShowBasedOnTime) {
        setShowNegativeBalanceModal(true);

        // Update the timestamp to track when modal was shown
        localStorage.setItem(modalShownKey, Date.now().toString());
      }
      */
    }
  }, [statsLoading, statsError, balance, user?.id]);

  const presentationPdfUrl = settingsData?.presentationPdf?.fileId
    ? sbcApiService.generateSettingsFileUrl(settingsData.presentationPdf.fileId)
    : '/sbc_presentation.pdf'; // Fallback to local path

  return (
    <ProtectedRoute>
      <Header />
      <div className="p-4 pb-24 flex flex-col gap-6">
        <ProfileHeaderCard
          name={user?.name ?? 'Utilisateur'}
          image={
            user?.avatar
              ? user.avatar
              : user?.avatarId
                ? sbcApiService.generateSettingsFileUrl(user.avatarId)
                : 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360'
          }
          affiliates={referralLoading ? null : referralStats?.totalReferrals ?? 0}
          status={subscriptionStatus}
          promoCode={user?.referralCode ?? ''}
        />

        <BalanceCard balance={balance} usdBalance={usdBalance} />

        <ServicesGrid
          formationsCount={formationsLoading ? null : formations?.length ?? 0}
          hasRelanceAccess={hasRelanceAccess}
          relanceBadge={null}
          onFormations={() => setIsFormationsModalOpen(true)}
          onRelance={() => {
            if (hasRelanceAccess) {
              navigate('/relance');
            } else {
              setShowRelanceModal(true);
            }
          }}
        />

        <LeaderboardPreview />

        {/* Presentation PDF. Keeps the existing settings-file URL logic and its
            local fallback verbatim — only the styling changed. */}
        <a
          href={presentationPdfUrl}
          download="document_de_presentation_sbc.pdf"
          className="w-full bg-accent text-white rounded-card py-3.5 px-4 flex items-center justify-center gap-3 font-semibold"
        >
          <span className="size-8 grid place-items-center rounded-pill bg-white text-accent shrink-0">
            <HugeiconsIcon icon={Download01Icon} size={16} />
          </span>
          <span className="text-sm">Téléchargez le document de présentation de la SBC</span>
        </a>

        <CommunityLinks />
      </div>

      {/* Relance credit packs modal */}
      <RelancePacksModal
        isOpen={showRelanceModal}
        onClose={() => setShowRelanceModal(false)}
      />

      {/* Formations Modal */}
      <AnimatePresence>
        {isFormationsModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative max-h-[80vh] overflow-y-auto border border-border"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
            >
              <h4 className="text-lg font-bold mb-4">Formations Disponibles</h4>
              {formationsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <HugeiconsIcon icon={Loading03Icon} size={36} className="animate-spin text-green-700" />
                </div>
              ) : formationsError ? (
                <div className="text-red-500 text-center">
                  Erreur lors du chargement des formations.
                </div>
              ) : formations && formations.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {formations.map((formation) => {
                    const variant = getFormationCardVariant(formation.decoration);
                    const locked = !!formation.locked;
                    const tier = formation.requiredSubscriptionType;

                    // Locked cards render as buttons (open upgrade modal) instead
                    // of anchors — link is empty when locked, don't expose it.
                    if (locked) {
                      return (
                        <button
                          key={formation._id}
                          type="button"
                          onClick={() => setLockedFormation(formation)}
                          className={`relative block w-full text-left p-3 rounded-xl transition-colors ${variant.container} opacity-70`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-semibold ${variant.title} pr-2`}>{formation.title}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              {tier && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-border">
                                  🔒 {tier}
                                </span>
                              )}
                              <HugeiconsIcon icon={LockIcon} className="text-gray-500" />
                            </div>
                          </div>
                          {variant.badge && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {variant.badge}
                            </span>
                          )}
                        </button>
                      );
                    }

                    return (
                      <a
                        key={formation._id}
                        href={formation.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`relative block p-3 rounded-xl transition-colors ${variant.container}`}
                      >
                        {variant.badge && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {variant.badge}
                          </span>
                        )}
                        <p className={`font-semibold ${variant.title}`}>{formation.title}</p>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  Aucune formation disponible pour le moment.
                </div>
              )}
              <button
                className="w-full mt-6 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold hover:bg-gray-300 transition-colors"
                onClick={() => setIsFormationsModalOpen(false)}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked-formation upgrade modal */}
      <AnimatePresence>
        {lockedFormation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLockedFormation(null)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-sm text-gray-900 border border-border"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <HugeiconsIcon icon={LockIcon} size={22} className="text-purple-600" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-center mb-1">Contenu réservé</h4>
              <p className="text-sm text-purple-700 font-semibold text-center mb-3 break-words">
                {lockedFormation.title}
              </p>
              <p className="text-sm text-gray-600 text-center mb-5">
                Cette formation est disponible uniquement avec l'abonnement{' '}
                <strong>{lockedFormation.requiredSubscriptionType ?? 'CIBLE'}</strong>. Passez à{' '}
                {lockedFormation.requiredSubscriptionType ?? 'CIBLE'} pour y accéder.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLockedFormation(null);
                    navigate('/abonnement');
                  }}
                  className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Passer à {lockedFormation.requiredSubscriptionType ?? 'CIBLE'}
                </button>
                <button
                  type="button"
                  onClick={() => setLockedFormation(null)}
                  className="w-full min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Plus tard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TourButton />



      {/* Negative Balance Notification Modal */}
      <NegativeBalanceNotification
        isOpen={showNegativeBalanceModal}
        onClose={() => setShowNegativeBalanceModal(false)}
        userReferralCode={user?.referralCode || ''}
        negativeBalance={Math.abs(balance)}
      />
    </ProtectedRoute>
  )
}

export default Home
