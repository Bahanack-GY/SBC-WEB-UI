import { useState, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import BackButton from '../components/common/BackButton';
import { FaWhatsapp, FaFilter, FaSearch, FaTimes, FaChartLine, FaUsers, FaUserCheck, FaChevronDown, FaChevronUp } from 'react-icons/fa';
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
  const [showChart, setShowChart] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<any>(null);

  // Debug logging
  useEffect(() => {
  }, [user, authLoading]);

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

  // Query for stats - always fetch fresh data when component mounts
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const statsResponse = await sbcApiService.getReferralStats();
      const statsResult = handleApiResponse(statsResponse);
      return {
        direct: statsResult.level1Count || 0,
        indirect: (statsResult.level2Count || 0) + (statsResult.level3Count || 0),
        total: (statsResult.level1Count || 0) + (statsResult.level2Count || 0) + (statsResult.level3Count || 0),
        totalReferrals: statsResult.totalReferrals || 0,
        level1ActiveSubscribers: statsResult.level1ActiveSubscribers || 0,
        level2ActiveSubscribers: statsResult.level2ActiveSubscribers || 0,
        level3ActiveSubscribers: statsResult.level3ActiveSubscribers || 0,
        totalActiveSubscribers: (statsResult.level1ActiveSubscribers || 0) + (statsResult.level2ActiveSubscribers || 0) + (statsResult.level3ActiveSubscribers || 0),
        monthlyData: statsResult.monthlyData || []
      };
    },
    enabled: !authLoading && !!user,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: 3,
    retryDelay: 1000,
  });

  // Query for filleuls using useInfiniteQuery
  const {
    data,
    isLoading: filleulsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useInfiniteQuery<
    { referredUsers: User[], totalPages: number, totalCount: number, filteredCount: number }, // TQueryFnData
    Error, // TError
    InfiniteData<{ referredUsers: User[], totalPages: number, totalCount: number, filteredCount: number }>, // TData
    ReturnType<typeof queryKeys.filleuls>, // TQueryKey: Use ReturnType to get the tuple type
    number // TPageParam
  >({
    queryKey: queryKeys.filleuls(selectedTab, debouncedSearch, debouncedSubTypeFilter),
    queryFn: async ({ pageParam = 1 }) => {
      if (!user) {
        throw new Error("User not authenticated or loaded.");
      }

      const params: any = {
        type: selectedTab,
        page: pageParam,
        limit,
      };

      if (debouncedSearch) {
        params.name = debouncedSearch;
      }

      if (debouncedSubTypeFilter !== 'undefined') {
        params.subType = debouncedSubTypeFilter;
      }

      const filleulsResponse = await sbcApiService.getReferredUsers(params);
      const result = handleApiResponse(filleulsResponse);

      // Ensure the response has the expected structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid API response structure');
      }

      return {
        referredUsers: result.referredUsers || [],
        totalPages: result.totalPages || 1,
        totalCount: result.totalCount || 0,
        filteredCount: result.totalCount || 0 // Use totalCount as filteredCount since API doesn't return separate filteredCount
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      // Check if there are more pages available
      const currentPage = allPages.length;
      return currentPage < lastPage.totalPages ? currentPage + 1 : undefined;
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
  const filteredCount = data?.pages?.[0]?.filteredCount ?? data?.pages?.[0]?.totalCount ?? 0;

  // Enhanced Chart Component
  const MonthlyChart = ({ monthlyData }: { monthlyData: any[] }) => {
    if (!monthlyData || monthlyData.length === 0) return null;

    // Get current date and filter months from January to current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    const currentYear = currentDate.getFullYear();

    // Filter and sort months from January to current month
    const relevantMonths = monthlyData
      .filter(month => {
        const [year, monthNum] = month.month.split('-');
        return parseInt(year) === currentYear && parseInt(monthNum) <= currentMonth;
      })
      .sort((a, b) => {
        const [, monthA] = a.month.split('-');
        const [, monthB] = b.month.split('-');
        return parseInt(monthA) - parseInt(monthB);
      });

    const maxValue = Math.max(...relevantMonths.map(d => d.total), 1);
    const chartHeight = 120;

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <button
          onClick={() => setShowChart(!showChart)}
          className="flex items-center justify-between w-full mb-4 text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">Évolution mensuelle</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Jan - {currentDate.toLocaleDateString('fr-FR', { month: 'short' })}</span>
            {showChart ? (
              <FaChevronUp className="text-gray-500" size={14} />
            ) : (
              <FaChevronDown className="text-gray-500" size={14} />
            )}
          </div>
        </button>

        {showChart && (
          <div className="space-y-4">
            {/* Chart */}
            <div className="relative">
              <div className="flex items-end justify-between h-32 px-1 gap-1">
                {relevantMonths.map((month) => {
                  const totalHeight = maxValue > 0 ? (month.total / maxValue) * chartHeight : 0;
                  const activeHeight = maxValue > 0 ? (month.totalActiveSubscribers / maxValue) * chartHeight : 0;
                  const isSelected = selectedMonth?.month === month.month;

                  return (
                    <div
                      key={month.month}
                      className="flex flex-col items-center flex-1 cursor-pointer"
                      onClick={() => setSelectedMonth(isSelected ? null : month)}
                    >
                      <div className="flex flex-col items-center mb-2 relative">
                        {/* Total bar */}
                        <div
                          className={`bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-md transition-all duration-300 shadow-sm ${relevantMonths.length <= 6 ? 'w-10' : relevantMonths.length <= 9 ? 'w-8' : 'w-6'
                            } ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                          style={{ height: `${Math.max(totalHeight, 8)}px` }}
                        />
                        {/* Active subscribers bar overlay */}
                        <div
                          className={`bg-gradient-to-t from-green-600 to-green-400 rounded-t-md absolute bottom-0 transition-all duration-300 shadow-sm ${relevantMonths.length <= 6 ? 'w-10' : relevantMonths.length <= 9 ? 'w-8' : 'w-6'
                            }`}
                          style={{ height: `${Math.max(activeHeight, 4)}px` }}
                        />

                        {/* Values on top of bars - show only if selected or on larger screens */}
                        <div className={`absolute -top-10 text-xs font-medium text-gray-700 text-center transition-opacity duration-200 ${isSelected || relevantMonths.length <= 6 ? 'opacity-100' : 'opacity-0 md:opacity-100'
                          }`}>
                          <div className="text-gray-800 font-semibold">{month.total}</div>
                          {month.totalActiveSubscribers > 0 && (
                            <div className="text-green-600 text-xs font-medium">{month.totalActiveSubscribers}</div>
                          )}
                        </div>
                      </div>

                      <div className={`text-xs text-gray-500 text-center ${relevantMonths.length > 8 ? 'transform -rotate-45 mt-2' : ''
                        }`}>
                        {relevantMonths.length <= 6 ? month.monthName.slice(0, 3) : month.monthName.slice(0, 3)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Month Details */}
              {selectedMonth && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">{selectedMonth.monthName} 2025</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Total filleuls:</span>
                      <span className="font-medium ml-2">{selectedMonth.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Abonnés actifs:</span>
                      <span className="font-medium ml-2 text-green-600">{selectedMonth.totalActiveSubscribers}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Niveau 1:</span>
                      <span className="font-medium ml-2">{selectedMonth.level1}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Niveau 2:</span>
                      <span className="font-medium ml-2">{selectedMonth.level2}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
                  <span className="text-gray-600">Total filleuls</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span className="text-gray-600">Abonnés actifs</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center mt-2 md:hidden">
                Touchez une barre pour voir les détails
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-sm font-medium text-green-600">
                  {relevantMonths.reduce((sum, m) => sum + m.level1, 0)}
                </div>
                <div className="text-xs text-gray-500">Niveau 1</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-blue-600">
                  {relevantMonths.reduce((sum, m) => sum + m.level2, 0)}
                </div>
                <div className="text-xs text-gray-500">Niveau 2</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-purple-600">
                  {relevantMonths.reduce((sum, m) => sum + m.level3, 0)}
                </div>
                <div className="text-xs text-gray-500">Niveau 3</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-orange-600">
                  {relevantMonths.reduce((sum, m) => sum + m.totalActiveSubscribers, 0)}
                </div>
                <div className="text-xs text-gray-500">Abonnés</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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

  // Handle error state
  if (error) {
    return (
      <div className="p-3 min-h-screen bg-white">
        <div className="flex items-center mb-3">
          <BackButton />
          <h3 className="text-xl font-medium text-center w-full">Mes filleuls</h3>
        </div>
        <div className="flex items-center justify-center min-h-[200px] text-red-600">
          Erreur lors du chargement: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <BackButton />
          <h1 className="text-xl font-semibold text-gray-900 ml-3">Mes filleuls</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {filleulsLoading && searchInput ? (
              <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <FaSearch className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            placeholder="Rechercher un filleul..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <FaTimes className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        {/* Enhanced Stats Overview */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          {statsError ? (
            <div className="text-center text-red-600 text-sm">
              Erreur de chargement des statistiques
            </div>
          ) : statsLoading ? (
            <div className="space-y-4">
              {/* Main Stats Skeleton */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Skeleton width="w-16" height="h-8" rounded="rounded" className="mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Filleuls directs</div>
                  <Skeleton width="w-20" height="h-3" rounded="rounded" className="mx-auto mt-1" />
                </div>
                <div className="text-center">
                  <Skeleton width="w-16" height="h-8" rounded="rounded" className="mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Filleuls indirects</div>
                  <Skeleton width="w-20" height="h-3" rounded="rounded" className="mx-auto mt-1" />
                </div>
              </div>

              {/* Additional Stats Row Skeleton */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FaUsers className="text-gray-300 mr-1" size={12} />
                  </div>
                  <Skeleton width="w-12" height="h-6" rounded="rounded" className="mx-auto mb-1" />
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FaUserCheck className="text-gray-300 mr-1" size={12} />
                  </div>
                  <Skeleton width="w-12" height="h-6" rounded="rounded" className="mx-auto mb-1" />
                  <div className="text-xs text-gray-500">Abonnés</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FaChartLine className="text-gray-300 mr-1" size={12} />
                  </div>
                  <Skeleton width="w-10" height="h-6" rounded="rounded" className="mx-auto mb-1" />
                  <div className="text-xs text-gray-500">Taux</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.direct?.toLocaleString() ?? '0'}
                  </div>
                  <div className="text-sm text-gray-600">Filleuls directs</div>
                  <div className="text-xs text-green-600 font-medium">
                    {`${stats?.level1ActiveSubscribers ?? 0} abonnés`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.indirect?.toLocaleString() ?? '0'}
                  </div>
                  <div className="text-sm text-gray-600">Filleuls indirects</div>
                  <div className="text-xs text-blue-600 font-medium">
                    {`${(stats?.level2ActiveSubscribers ?? 0) + (stats?.level3ActiveSubscribers ?? 0)} abonnés`}
                  </div>
                </div>
              </div>

              {/* Additional Stats Row */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FaUsers className="text-gray-500 mr-1" size={12} />
                  </div>
                  <div className="text-lg font-semibold text-gray-800">
                    {stats?.total?.toLocaleString() ?? '0'}
                  </div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FaUserCheck className="text-green-500 mr-1" size={12} />
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {stats?.totalActiveSubscribers?.toLocaleString() ?? '0'}
                  </div>
                  <div className="text-xs text-gray-500">Abonnés</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FaChartLine className="text-purple-500 mr-1" size={12} />
                  </div>
                  <div className="text-lg font-semibold text-purple-600">
                    {`${stats?.totalActiveSubscribers && stats?.total ? Math.round((stats.totalActiveSubscribers / stats.total) * 100) : 0}%`}
                  </div>
                  <div className="text-xs text-gray-500">Taux</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Chart */}
        {statsLoading ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Skeleton width="w-32" height="h-6" rounded="rounded" />
              <Skeleton width="w-20" height="h-4" rounded="rounded" />
            </div>
            <Skeleton width="w-full" height="h-32" rounded="rounded" />
          </div>
        ) : (
          stats?.monthlyData && stats.monthlyData.length > 0 && (
            <MonthlyChart monthlyData={stats.monthlyData} />
          )
        )}

        {/* Tabs and Filter */}
        <div className="flex items-center justify-between">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedTab === 'direct'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
              onClick={() => setSelectedTab('direct')}
            >
              <div className="flex flex-col items-center">
                <span>Direct</span>
                <span className="text-xs">
                  {statsLoading || authLoading ? '...' : `${stats?.direct ?? 0} (${stats?.level1ActiveSubscribers ?? 0})`}
                </span>
              </div>
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedTab === 'indirect'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
              onClick={() => setSelectedTab('indirect')}
            >
              <div className="flex flex-col items-center">
                <span>Indirect</span>
                <span className="text-xs">
                  {statsLoading || authLoading ? '...' : `${stats?.indirect ?? 0} (${((stats?.level2ActiveSubscribers ?? 0) + (stats?.level3ActiveSubscribers ?? 0))})`}
                </span>
              </div>
            </button>
          </div>

          <button
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setModalOpen(true)}
          >
            <FaFilter className="text-gray-500" size={14} />
            <span className="text-sm">Filtrer</span>
          </button>
        </div>

        {/* Current Filter Display */}
        {subTypeFilterInput !== 'undefined' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                Filtre actif: {getFilterDisplayName(subTypeFilterInput)}
              </span>
              <button
                onClick={() => setSubTypeFilterInput('undefined')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
        {/* Filter Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:w-96 max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Filtrer par abonnement</h3>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    { value: 'undefined', label: 'Tous les filleuls', icon: '👥' },
                    { value: 'all', label: 'Tous abonnés', icon: '✅' },
                    { value: 'CLASSIQUE', label: 'Abonnés CLASSIQUE', icon: '🥉' },
                    { value: 'CIBLE', label: 'Abonnés CIBLÉ', icon: '🎯' },
                    { value: 'none', label: 'Non abonnés', icon: '❌' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${subTypeFilterInput === filter.value
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      onClick={() => {
                        setSubTypeFilterInput(filter.value as any);
                        setModalOpen(false);
                      }}
                    >
                      <span className="text-lg">{filter.icon}</span>
                      <span className="font-medium">{filter.label}</span>
                      {subTypeFilterInput === filter.value && (
                        <span className="ml-auto text-green-600">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Results */}
        {(filleulsLoading && !isFetchingNextPage && allFilleuls.length === 0) ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-3">
                <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton width="w-32" height="h-4" rounded="rounded" />
                  <Skeleton width="w-24" height="h-3" rounded="rounded" />
                </div>
                <Skeleton width="w-10" height="h-10" rounded="rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {allFilleuls.length > 0 ? (
              <>
                <div className="text-sm text-gray-600 mb-3">
                  {filteredCount} {filteredCount === 1 ? 'filleul trouvé' : 'filleuls trouvés'}
                </div>
                {allFilleuls.map((filleul: User, index: number) => (
                  <div
                    key={filleul._id}
                    ref={index === allFilleuls.length - 1 ? lastItemRef : null}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={
                            filleul.avatar
                              ? filleul.avatar
                              : filleul.avatarId
                                ? sbcApiService.generateSettingsFileUrl(filleul.avatarId)
                                : 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360'
                          }
                          alt={filleul.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {filleul.activeSubscriptions && filleul.activeSubscriptions.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{filleul.name}</div>
                        <div className="text-sm text-gray-500">{filleul.phoneNumber}</div>
                        {filleul.activeSubscriptions && filleul.activeSubscriptions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {filleul.activeSubscriptions.map((sub, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded-full ${sub === 'CLASSIQUE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                                  }`}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <a
                        href={`https://wa.me/${String(filleul.phoneNumber || '').replace(/[^\d]/g, '')}/?text=${encodeURIComponent(RelanceMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                        title="Contacter sur WhatsApp"
                      >
                        <FaWhatsapp size={20} />
                      </a>
                    </div>
                  </div>
                ))}

                {isFetchingNextPage && (
                  <div className="flex justify-center items-center py-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span className="text-sm">Chargement...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">👥</div>
                <div className="text-gray-600 font-medium mb-2">Aucun filleul trouvé</div>
                <div className="text-gray-500 text-sm">
                  {searchInput ? 'Essayez avec un autre terme de recherche' : 'Vous n\'avez pas encore de filleuls dans cette catégorie'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MesFilleuls; 