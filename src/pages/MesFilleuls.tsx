import { useState, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import BackButton from '../components/common/BackButton';
import { FaWhatsapp, FaFilter } from 'react-icons/fa';
import Skeleton from '../components/common/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { User } from '../types/api';

const queryKeys = {
  stats: ['referral-stats'] as const,
  filleuls: (type: string, search: string, subTypeFilter: string) => ['filleuls', type, search, subTypeFilter] as const,
};

// Define RelanceMessage outside the component for better scope management
const RelanceMessage = `🚀 Rejoins la Révolution Entrepreneuriale avec le Sniper Business Center ! 🌍

Tu es à un clic de faire partie de la meilleure communauté d'Afrique, où les opportunités d'affaires abondent et où ton succès est notre priorité!

Voici ce que tu vas gagner en nous rejoignant dès maintenant:

✨ Visibilité Maximale: Partage ton flyer ou affiche publicitaire dans nos groupes chaque samedi, atteignant ainsi des milliers de potentiels clients!

📈 Accès à un Réseau Énorme:
Profite de plus de 30 000 contacts WhatsApp ciblés qui verront tes produits et services.Ton succès commence ici!

🎓 Formations Exclusives et Gratuites:
Bénéficie de 5 formations complètes, accompagnées d'un suivi personnalisé chaque semaine sur Google Meet :

   • Deviens expert en trading

   • Maîtrise l'importation depuis la Chine

   • Domine le marketing digital

   • Excelle en art oratoire

   • Crée des bots WhatsApp pour booster ton business

🛒 Marketplace à Ta Disposition:
 Mets en avant tes produits et services sur notre plateforme dédiée!

💰 Gagne de l'Argent Facilement :
Avec notre système de parrainage rémunéré:

   • Niveau 1 : Parrainage direct = 1000 FCFA

   • Niveau 2 : Ton filleul parraine = 500 FCFA

   • Niveau 3 : Le filleul de ton filleul inscrit = 250 FCFA

Je suis ton parrain à la SBC et je suis là pour t'accompagner vers le succès ! J'ai remarqué que tu as créé ton compte, mais que tu n'as pas encore finalisé ton abonnement. Ne laisse pas passer cette chance incroyable !

👉 Prends ta décision aujourd'hui et transforme ta vie avec nous !

    https://sniperbuisnesscenter.com/ `;

function MesFilleuls() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'direct' | 'indirect'>('direct');
  const [modalOpen, setModalOpen] = useState(false);

  // Filter states for input and debounced values
  const [searchInput, setSearchInput] = useState('');
  const [subTypeFilterInput, setSubTypeFilterInput] = useState<'all' | 'none' | 'CLASSIQUE' | 'CIBLE' | 'undefined'>('undefined');

  // Debounced states for actual API calls
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedSubTypeFilter, setDebouncedSubTypeFilter] = useState<'all' | 'none' | 'CLASSIQUE' | 'CIBLE' | 'undefined'>('undefined');

  // Debounce effect for search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Debounce effect for subType filter
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSubTypeFilter(subTypeFilterInput);
    }, 300); // shorter debounce for filter button clicks
    return () => clearTimeout(handler);
  }, [subTypeFilterInput]);

  const limit = 10;

  // Query for stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const statsResponse = await sbcApiService.getReferralStats();
      const statsResult = handleApiResponse(statsResponse);
      return {
        direct: statsResult.level1Count || 0,
        indirect: (statsResult.level2Count || 0) + (statsResult.level3Count || 0),
        total: (statsResult.level1Count || 0) + (statsResult.level2Count || 0) + (statsResult.level3Count || 0),
        totalReferrals: statsResult.totalReferrals || 0
      };
    },
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  // Query for filleuls using useInfiniteQuery
  const {
    data,
    isLoading: filleulsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isInitialLoading, // Renamed from isLoading to distinguish initial load
  } = useInfiniteQuery<
    { referredUsers: User[], totalPages: number, totalCount: number, filteredCount: number }, // TQueryFnData
    Error, // TError
    InfiniteData<{ referredUsers: User[], totalPages: number, totalCount: number, filteredCount: number }>, // TData
    ReturnType<typeof queryKeys.filleuls>, // TQueryKey: Use ReturnType to get the tuple type
    number // TPageParam
  >({
    queryKey: queryKeys.filleuls(selectedTab, debouncedSearch, debouncedSubTypeFilter),
    queryFn: async ({ pageParam = 1 }) => {
      if (!user) { // Ensure user is available before making API call
        // This case should be handled by `enabled` but a fallback is good
        throw new Error("User not authenticated or loaded.");
      }
      const filleulsResponse = await sbcApiService.getReferredUsers({
        type: selectedTab,
        ...(debouncedSearch ? { name: debouncedSearch } : {}),
        page: pageParam,
        limit,
        subType: debouncedSubTypeFilter === 'undefined' ? undefined : debouncedSubTypeFilter
      });
      return handleApiResponse(filleulsResponse);
    },
    getNextPageParam: (lastPage, allPages) => {
      // Assuming API returns totalPages or enough info to calculate hasMore
      return lastPage.totalPages && (allPages.length < lastPage.totalPages) ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 0, // Always refetch on queryKey change or background refetch
    gcTime: 30 * 60 * 1000,
    enabled: !authLoading && !!user, // Only fetch if user is loaded and authenticated
  });

  // Setup intersection observer for infinite scroll
  const lastItemRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (lastItemRef.current) {
      observer.current.observe(lastItemRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [lastItemRef, hasNextPage, isFetchingNextPage, fetchNextPage]); // Depend on hasNextPage and isFetchingNextPage


  // Flatten the data for rendering
  const allFilleuls = data?.pages.flatMap(page => page.referredUsers) || [];
  // Get the total filtered count from the first page's data
  const filteredCount = data?.pages[0]?.totalCount ?? 0;

  // Function to get display name for filter status
  const getFilterDisplayName = (currentSubType: typeof subTypeFilterInput) => {
    switch (currentSubType) {
      case 'undefined': return 'Tous les filleuls';
      case 'all': return 'Tous abonnés';
      case 'CLASSIQUE': return 'Abonnés CLASSIQUE';
      case 'CIBLE': return 'Abonnés CIBLÉ';
      case 'none': return 'Non abonnés';
      default: return 'Filtre inconnu';
    }
  };

  // // Render loading state for authentication first
  // if (authLoading || isInitialLoading) { // Check both auth loading and initial query loading
  //   return (
  //     <div className="flex items-center justify-center min-h-screen text-lg text-gray-700">
  //       Chargement des informations utilisateur...
  //     </div>
  //   );
  // }

  return (
    <div className="p-3 min-h-screen bg-white">
      <div className="flex items-center mb-3">
        <BackButton />
        <h3 className="text-xl font-medium text-center w-full">Mes filleuls</h3>
      </div>
      {/* Search Bar */}
      <form
        className="flex items-center gap-2 mb-4"
        onSubmit={e => { e.preventDefault(); setSearchInput(searchInput.trim()); }} // Trigger debounce manually on submit
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
              {getFilterDisplayName(subTypeFilterInput)} {/* Use input state for display */}
            </div>
            <div className="text-sm font-medium text-gray-600">
              {filleulsLoading ? '...' : filteredCount?.toLocaleString() ?? '...'} {filteredCount === 1 ? 'filleul' : 'filleuls'}
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
              className={`w-full py-2 rounded-xl font-medium border ${subTypeFilterInput === 'undefined' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setSubTypeFilterInput('undefined'); setModalOpen(false); }}
            >
              Tous les filleuls
            </button>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${subTypeFilterInput === 'all' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setSubTypeFilterInput('all'); setModalOpen(false); }}
            >
              Tous abonnés
            </button>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${subTypeFilterInput === 'CLASSIQUE' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setSubTypeFilterInput('CLASSIQUE'); setModalOpen(false); }}
            >
              Abonnés CLASSIQUE
            </button>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${subTypeFilterInput === 'CIBLE' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setSubTypeFilterInput('CIBLE'); setModalOpen(false); }}
            >
              Abonnés CIBLÉ
            </button>
            <button
              className={`w-full py-2 rounded-xl font-medium border ${subTypeFilterInput === 'none' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => { setSubTypeFilterInput('none'); setModalOpen(false); }}
            >
              Non abonnés
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
      {(filleulsLoading && !isFetchingNextPage) ? ( // Use !isFetchingNextPage to show initial loading only
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
          {allFilleuls.map((filleul: User, index: number) => (
            <div
              key={filleul._id}
              ref={index === allFilleuls.length - 1 ? lastItemRef : null} // Assign ref to the last item
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
                href={`https://wa.me/${filleul.phoneNumber?.replace(/[^\d]/g, '')}/?text=${RelanceMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-600"
                title="Contacter sur WhatsApp"
              >
                <FaWhatsapp size={22} />
              </a>
            </div>
          ))}
          {isFetchingNextPage && ( // Use isFetchingNextPage for loading more indicator
            <div className="flex justify-center items-center py-4">
              <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          )}
          {allFilleuls.length === 0 && !filleulsLoading && !isFetchingNextPage && ( // Ensure nothing is loading
            <div className="text-center text-gray-400 py-8">Aucun filleul dans cette catégorie.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default MesFilleuls; 