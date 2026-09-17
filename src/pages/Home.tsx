import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon } from '@hugeicons/core-free-icons';
import { useState, useEffect } from 'react';
import ProfileHeaderCard from '../components/home/ProfileHeaderCard';
import BalanceCard from '../components/home/BalanceCard';
import ServicesGrid from '../components/home/ServicesGrid';
import LeaderboardPreview from '../components/home/LeaderboardPreview';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import CommunityLinks from '../components/home/CommunityLinks';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TourButton from '../components/common/TourButton';
import NegativeBalanceNotification from '../components/NegativeBalanceNotification';
import RelancePacksModal from '../components/relance/RelancePacksModal';
import { useRelance } from '../contexts/RelanceContext';
import NewEventPopup from '../components/events/NewEventPopup';
import { useFormations } from '../hooks/useFormations';

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

  const { data: formations, isLoading: formationsLoading } = useFormations();

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
      <NewEventPopup />
      <div className="p-4 flex flex-col gap-6">
        <div className="home-header">
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
        </div>

        <div className="balance-card">
          <BalanceCard balance={balance} usdBalance={usdBalance} />
        </div>

        <div className="quick-actions">
          <ServicesGrid
          formationsCount={formationsLoading ? null : formations?.length ?? 0}
          hasRelanceAccess={hasRelanceAccess}
          relanceBadge={null}
          onFormations={() => navigate('/formations')}
            onRelance={() => {
              if (hasRelanceAccess) {
                navigate('/relance');
              } else {
                setShowRelanceModal(true);
              }
            }}
          />
        </div>

        <div className="leaderboard-preview">
          <LeaderboardPreview />
        </div>

        {/* Presentation video, restored below the classement. */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-ink">Présentation</h2>
          <CustomVideoPlayer
            // Versioned filename, not a fixed one: Cloudflare caches these for an
            // hour, so replacing the file in place left everyone watching the old
            // video until the edge expired. A new name is fetched immediately.
            src="/sbc-presentation-2026-09.mp4"
            poster="/sbc-presentation-2026-09.jpg"
            title="Présentation SBC"
          />
        </section>

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
