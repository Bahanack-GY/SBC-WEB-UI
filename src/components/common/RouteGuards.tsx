import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';

/**
 * Subscription status hook — single source of truth used by RequireSubscription
 * and by any view that needs to react to subscribed-ness.
 *
 * Cache is keyed on user.id so a previous session's "active" result can never
 * leak into the next session on a shared device.
 */
export function useSubscriptionStatus() {
  const { user, isAuthenticated } = useAuth();
  // Backend user objects come from Mongoose so the primary key is _id; a
  // virtual `id` sometimes exists, sometimes not (depends on the endpoint).
  // Fall back through both, then to localStorage.userId set at login time.
  const scopedUserId =
    (user as { id?: string; _id?: string })?.id ||
    (user as { id?: string; _id?: string })?._id ||
    (typeof window !== 'undefined' ? localStorage.getItem('userId') || undefined : undefined);

  const { data, isLoading, isFetching } = useQuery<unknown>({
    queryKey: ['current-subscription', scopedUserId ?? 'anonymous'],
    queryFn: async () => {
      try {
        const response = await sbcApiService.getCurrentSubscription();
        return handleApiResponse(response);
      } catch {
        // Treat unreachable / failed fetch as "no active subscription" — fail
        // closed. The guard sends the user to /abonnement, which is the safe
        // outcome both for the user (clear next step) and for revenue.
        return null;
      }
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });

  const subscriptionData = data as
    | {
        status?: string;
        totalCount?: number;
        subscriptions?: Array<{ status?: string }>;
      }
    | null
    | undefined;

  const isSubscribed = !!(
    (subscriptionData?.status === 'active') ||
    (Array.isArray(subscriptionData?.subscriptions) &&
      subscriptionData.subscriptions.some((s) => s?.status === 'active')) ||
    (typeof subscriptionData?.totalCount === 'number' &&
      subscriptionData.totalCount > 0)
  );

  // TEMP DEBUG — remove after paywall 304 issue confirmed fixed
  if (typeof window !== 'undefined') {
    console.log('[SBC DEBUG useSubscriptionStatus]', {
      isAuthenticated,
      userId: user?.id,
      isLoading,
      isFetching,
      dataType: typeof data,
      dataKeys: data && typeof data === 'object' ? Object.keys(data as object) : null,
      dataPreview: data,
      isSubscribed,
    });
  }

  // Loading is only meaningful when authenticated — for unauthenticated callers
  // the query is disabled and we shouldn't block the guard chain on it.
  const loading = isAuthenticated && (isLoading || isFetching);

  return { isSubscribed, isLoading: loading };
}

/**
 * Centered loading spinner used by both guards. Kept inline so the guards stay
 * one self-contained module.
 */
function FullPageSpinner({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#115CF6]" />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}

/**
 * RequireAuth — render an outlet only when the user is logged in. Used by
 * routes that are accessible to unactivated users (Abonnement, complete-profile,
 * profile editing). Runs during render via <Navigate>, so no flicker of
 * protected content.
 */
export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!isAuthenticated) {
    const recentLogout =
      Date.now() -
        parseInt(sessionStorage.getItem('justLoggedOutAt') || '0', 10) <
      2000;
    return (
      <Navigate
        to={recentLogout ? '/connexion' : '/splash-screen'}
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}

/**
 * RequireSubscription — paywall. Renders an outlet only when the user is
 * logged in AND has an active subscription. Used by all post-activation pages
 * (Home, Marketplace, Wallet, Filleuls, etc.).
 *
 * Fail-closed: unknown / loading / errored subscription state sends the user
 * to /abonnement rather than rendering the protected content briefly.
 */
export function RequireSubscription() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isSubscribed, isLoading: subLoading } = useSubscriptionStatus();
  const location = useLocation();

  if (authLoading) return <FullPageSpinner />;

  if (!isAuthenticated) {
    const recentLogout =
      Date.now() -
        parseInt(sessionStorage.getItem('justLoggedOutAt') || '0', 10) <
      2000;
    return (
      <Navigate
        to={recentLogout ? '/connexion' : '/splash-screen'}
        state={{ from: location }}
        replace
      />
    );
  }

  if (subLoading) {
    return <FullPageSpinner message="Vérification de l'abonnement..." />;
  }

  if (!isSubscribed) {
    return <Navigate to="/abonnement" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
