import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import BackButton from '../components/common/BackButton';
import { FaWhatsapp, FaFilter } from 'react-icons/fa';
import Skeleton from '../components/common/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { User } from '../types/api';

const queryKeys = {
  stats: ['referral-stats'] as const,
  filleuls: (type: string, search: string, page: number, filter?: string) => ['filleuls', type, search, page, filter] as const,
};

function MesFilleuls() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'direct' | 'indirect'>('direct');
  const [filter, setFilter] = useState<'all' | 'abonne' | 'nonabonne'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allFilleuls, setAllFilleuls] = useState<User[]>([]);
  const [loadedFilleulIds, setLoadedFilleulIds] = useState<Set<string>>(new Set());
  const [lastItemRef, setLastItemRef] = useState<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const limit = 10;

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          setIsFetchingMore(true);
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (lastItemRef) {
      observer.observe(lastItemRef);
    }

    return () => {
      observer.disconnect();
    };
  }, [lastItemRef, hasMore, isFetchingMore]);

  // Query for stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const statsResponse = await sbcApiService.getReferralStats();
      const statsResult = handleApiResponse(statsResponse);
      return {
        direct: statsResult.level1Count || 0,
        indirect: (statsResult.level2Count || 0) + (statsResult.level3Count || 0),
        total: (statsResult.level1Count || 0) + (statsResult.level2Count || 0) + (statsResult.level3Count || 0)
      };
    },
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  // Query for filleuls with filter
  const { data: filleuls, isLoading: filleulsLoading, refetch } = useQuery<{ 
    referredUsers: User[], 
    totalPages: number,
    totalCount: number,
    filteredCount: number 
  }>({
    queryKey: queryKeys.filleuls(selectedTab, search, page, filter),
    queryFn: async () => {
      if (!user) return { referredUsers: [], totalPages: 0, totalCount: 0, filteredCount: 0 };
      const filleulsResponse = await sbcApiService.getReferredUsers({ 
        type: selectedTab, 
        ...(search ? { name: search } : {}),
        page,
        limit,
        filter: filter === 'all' ? undefined : filter
      });
      return handleApiResponse(filleulsResponse);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000, // 30 min
  });

  // Update filleuls when new data arrives
  useEffect(() => {
    if (filleuls?.referredUsers) {
      // Filter out duplicates using the loadedFilleulIds Set
      const newItems = filleuls.referredUsers.filter(item => !loadedFilleulIds.has(item._id));
      
      // Add new item IDs to the Set
      const newIds = new Set(newItems.map(item => item._id));
      setLoadedFilleulIds(prev => new Set([...prev, ...newIds]));

      if (page === 1) {
        setAllFilleuls(newItems);
      } else {
        setAllFilleuls(prev => [...prev, ...newItems]);
      }

      setHasMore(page < filleuls.totalPages);
    }
  }, [filleuls, page]);

  // Reset state when search/category/filter changes
  useEffect(() => {
    setPage(1);
    setAllFilleuls([]);
    setLoadedFilleulIds(new Set());
    setHasMore(true);
  }, [search, selectedTab, filter]);

  // Reset fetching state after data loads
  useEffect(() => {
    if (isFetchingMore && !filleulsLoading) {
      setIsFetchingMore(false);
    }
  }, [filleulsLoading, isFetchingMore]);

  let filtered: User[] = allFilleuls;
  if (filter === 'abonne') {
    filtered = allFilleuls.filter((f: User) => f.activeSubscriptions && f.activeSubscriptions.length > 0);
  }
  if (filter === 'nonabonne') {
    filtered = allFilleuls.filter((f: User) => !f.activeSubscriptions || f.activeSubscriptions.length === 0);
  }

  return (
    <div className="p-3 min-h-screen bg-white">
      <div className="flex items-center mb-3">
        <BackButton />
        <h3 className="text-xl font-medium text-center w-full">Mes filleuls</h3>
      </div>
      {/* Search Bar */}
      <form
        className="flex items-center gap-2 mb-4"
        onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); refetch(); }}
      >
        <input
          type="text"
          placeholder="Rechercher par nom ou téléphone"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50"
        />
        <button
          type="submit"
          className="bg-green-700 text-white px-4 py-2 rounded-full font-semibold hover:bg-green-800 transition-colors"
        >
          Rechercher
        </button>
      </form>
      {/* Stats Cards */}
      <div className="space-y-3 mb-4">
        {/* Total Filleuls Card */}
        <div className="bg-white rounded-2xl shadow flex flex-col md:flex-row items-center justify-between px-6 py-4 border border-gray-100">
          <div className="font-semibold text-gray-700 text-base mb-2 md:mb-0">Nombre total de filleuls</div>
          <div className="flex gap-4 text-sm font-bold">
            <span className="text-green-700">Direct: <span className="text-gray-900">{statsLoading ? '...' : stats?.direct?.toLocaleString() ?? '...'}</span></span>
            <span className="text-green-700">Indirect: <span className="text-gray-900">{statsLoading ? '...' : stats?.indirect?.toLocaleString() ?? '...'}</span></span>
          </div>
        </div>

        {/* Current Filter Stats */}
        <div className="bg-white rounded-2xl shadow px-6 py-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-700 text-sm">
              {filter === 'all' ? 'Tous les filleuls' : 
               filter === 'abonne' ? 'Filleuls abonnés' : 
               'Filleuls non abonnés'}
            </div>
            <div className="text-sm font-medium text-gray-600">
              {filleulsLoading ? '...' : filleuls?.filteredCount?.toLocaleString() ?? '...'} {filleuls?.filteredCount === 1 ? 'filleul' : 'filleuls'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-5 py-1 rounded-full border text-sm font-semibold transition-colors duration-150 ${selectedTab === 'direct' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={() => setSelectedTab('direct')}
        >
          Direct
        </button>
        <button
          className={`px-5 py-1 rounded-full border text-sm font-semibold transition-colors duration-150 ${selectedTab === 'indirect' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={() => setSelectedTab('indirect')}
        >
          Indirect
        </button>
        <div className="flex-1" />
        <button
          className="flex items-center gap-2 border border-gray-300 rounded-full px-3 py-1 text-gray-700 hover:bg-gray-100 transition ml-auto"
          onClick={() => setModalOpen(true)}
        >
          <FaFilter className="text-green-700" />
          <span className="text-sm font-medium">Filtrer</span>
        </button>
      </div>
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-80 flex flex-col gap-4">
            <div className="font-bold text-lg mb-2 text-center">Filtrer les filleuls</div>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${filter === 'abonne' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setFilter('abonne'); setModalOpen(false); }}
            >
              Abonnés
            </button>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${filter === 'nonabonne' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setFilter('nonabonne'); setModalOpen(false); }}
            >
              Non abonnés
            </button>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${filter === 'all' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setFilter('all'); setModalOpen(false); }}
            >
              Tous
            </button>
            <button
              className="w-full py-2 rounded-xl font-medium border border-gray-300 text-gray-500 mt-2 hover:bg-gray-100"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {(filleulsLoading && page === 1) ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton width="w-10" height="h-10" rounded="rounded-full" />
              <div className="flex-1">
                <Skeleton width="w-32" height="h-4" rounded="rounded" />
                <Skeleton width="w-24" height="h-3" rounded="rounded" />
              </div>
              <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-2 divide-y">
          {filtered.map((filleul: User, index: number) => (
            <div 
              key={filleul._id} 
              ref={index === filtered.length - 1 ? setLastItemRef : null}
              className="flex items-center py-2 gap-3"
            >
              <img
                src={filleul.avatarId
                  ? sbcApiService.generateSettingsFileUrl(filleul.avatarId)
                  : 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360'}
                alt={filleul.name}
                className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{filleul.name}</div>
                <div className="text-xs text-gray-500">{filleul.phoneNumber}</div>
              </div>
              <a
                href={`https://wa.me/${filleul.phoneNumber?.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-600"
                title="Contacter sur WhatsApp"
              >
                <FaWhatsapp size={22} />
              </a>
            </div>
          ))}
          {isFetchingMore && (
            <div className="flex justify-center items-center py-4">
              <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          )}
          {filtered.length === 0 && !filleulsLoading && (
            <div className="text-center text-gray-400 py-8">Aucun filleul dans cette catégorie.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default MesFilleuls; 