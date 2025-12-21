import React, { useState, useEffect } from 'react';
import { sbcApiService } from '../../services/SBCApiService';
import type { Status, StatusCategory } from '../../types/chat';
import { CATEGORY_CONFIG } from '../../types/chat';
import { PlusCircleIcon } from '@heroicons/react/24/solid';

interface StatusFeedProps {
  onStatusClick: (status: Status) => void;
  onCreateClick: () => void;
  refreshTrigger?: number;
}

export const StatusFeed: React.FC<StatusFeedProps> = ({ onStatusClick, onCreateClick, refreshTrigger }) => {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<StatusCategory | 'all'>('all');

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const response = await sbcApiService.getStatuses(1, 50, category);
      console.log('StatusFeed - API response:', response);

      if (response.body.success && response.body.data) {
        console.log('StatusFeed - Setting statuses:', response.body.data);
        setStatuses(response.body.data as Status[]);
      } else {
        console.warn('StatusFeed - No data in response:', response);
      }
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [selectedCategory, refreshTrigger]);

  const categories: Array<{ key: StatusCategory | 'all'; label: string; color?: string }> = [
    { key: 'all', label: 'Tous' },
    ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
      key: key as StatusCategory,
      label: config.label,
      color: config.color,
    })),
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Category Filter */}
      <div className="flex items-center gap-2 p-4 overflow-x-auto scrollbar-hide border-b border-gray-200">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              selectedCategory === cat.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={
              selectedCategory === cat.key && cat.color
                ? { backgroundColor: cat.color, color: 'white' }
                : {}
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Create Status Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-green-600 transition-all"
        >
          <PlusCircleIcon className="w-6 h-6" />
          Créer un statut
        </button>
      </div>

      {/* Status Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && statuses.length === 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : statuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun statut</h3>
            <p className="text-gray-600 mb-4">
              {selectedCategory === 'all'
                ? 'Soyez le premier à publier un statut !'
                : 'Aucun statut dans cette catégorie'}
            </p>
            <button
              onClick={onCreateClick}
              className="bg-blue-500 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
            >
              Créer un statut
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {statuses.map((status) => (
              <button
                key={status._id}
                onClick={() => onStatusClick(status)}
                className="relative aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                {/* Background */}
                {status.mediaUrl ? (
                  status.contentType === 'video' ? (
                    <video
                      src={status.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={status.mediaUrl}
                      alt="Status"
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 via-green-500 to-orange-500" />
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Category Badge */}
                <div
                  className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: CATEGORY_CONFIG[status.category].color }}
                >
                  {CATEGORY_CONFIG[status.category].label.split(' ')[0]}
                </div>

                {/* Author Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={(status as any).author?.avatar || status.user?.avatar || '/default-avatar.png'}
                      alt={(status as any).author?.name || status.user?.name}
                      className="w-6 h-6 rounded-full border-2 border-white"
                    />
                    <span className="text-white text-sm font-semibold truncate">
                      {(status as any).author?.name || status.user?.name ||
                        ((status as any).author?.firstName && (status as any).author?.lastName
                          ? `${(status as any).author.firstName} ${(status as any).author.lastName}`
                          : (status as any).author?.firstName || (status as any).author?.lastName ||
                            (status.user?.firstName && status.user?.lastName
                              ? `${status.user.firstName} ${status.user.lastName}`
                              : status.user?.firstName || status.user?.lastName || 'Utilisateur'))}
                    </span>
                  </div>
                  {status.textContent && (
                    <p className="text-white text-xs line-clamp-2">{status.textContent}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="absolute top-2 left-2 flex items-center gap-2 text-white text-xs">
                  <span>❤️ {status.likesCount}</span>
                  <span>👁️ {status.viewsCount}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
