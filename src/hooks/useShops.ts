import { useQuery } from '@tanstack/react-query';
import { fetchShops, type Shop } from '../services/shopDirectory';

/** The shop directory changes rarely — a new shop appears now and then. */
export const useShops = () =>
  useQuery<Shop[]>({
    queryKey: ['shop-directory'],
    // The API sorts by slug; the directory is more useful newest-first.
    queryFn: ({ signal }) =>
      fetchShops(signal).then((shops) =>
        [...shops].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      ),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
