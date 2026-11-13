import { useSubscriptionStatus } from '../components/common/RouteGuards';

/**
 * Whether the account has an SBC pack, for pages open to both members and
 * non-members (the advertiser pages). False only once we know there is no pack:
 * while the status loads it answers true, so a paying member never sees the
 * non-member variant flash.
 */
export function useIsMember(): boolean {
    const { isSubscribed, isLoading } = useSubscriptionStatus();
    return isSubscribed || isLoading;
}
