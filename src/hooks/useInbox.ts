import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';

export const inboxKeys = {
  all: ['inbox'] as const,
  unread: ['inbox', 'unread'] as const,
  list: ['inbox', 'list'] as const,
};

/**
 * The number on the bell. Refreshed every minute, when the app comes back to
 * the foreground, and the moment a push arrives (the service worker says so).
 */
export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'sbc-push') queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [queryClient]);

  return useQuery({
    queryKey: inboxKeys.unread,
    queryFn: async (): Promise<number> => handleApiResponse(await sbcApiService.inboxUnreadCount())?.unread ?? 0,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

/** "1" … "99", then "99+". Nothing when there is nothing unread. */
export const badgeText = (n: number) => (n <= 0 ? '' : n > 99 ? '99+' : String(n));
