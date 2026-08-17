import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../../services/SBCApiService';
import { useAuth } from '../../contexts/AuthContext';
import AdsLaunchCountdown from './AdsLaunchCountdown';

/**
 * Holds every Ads Network screen shut until the network opens.
 *
 * Wraps the routes rather than living inside the home page: a bookmarked
 * /ads-network/diffuseur must not slip past the gate. The backend refuses the
 * same calls, so this decides what people see, not what they can do.
 *
 * While the state is unknown nothing is rendered: flashing the network and
 * then replacing it with a countdown is worse than a blank moment.
 */
export default function AdsLaunchGate() {
    const { user } = useAuth();
    const isAdmin = (user as { role?: string } | null)?.role === 'admin';

    const { data, isLoading } = useQuery({
        queryKey: ['ads-launch-state'],
        queryFn: async () => {
            const res = await sbcApiService.getAdsLaunchState();
            return res.body?.data as { launched: boolean; launchAt: string | null } | undefined;
        },
        staleTime: 60_000,
        retry: 1,
    });

    if (isLoading) return <div className="min-h-screen bg-gray-50" />;

    // Unreachable backend must not lock people out of a launched network.
    const launched = data?.launched ?? true;
    if (launched || isAdmin) return <Outlet />;

    return <AdsLaunchCountdown launchAt={data?.launchAt ?? null} />;
}
