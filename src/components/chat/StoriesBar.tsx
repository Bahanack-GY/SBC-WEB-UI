import React, { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import type { StoryGroup } from '../../types/chat';
import { sbcApiService } from '../../services/SBCApiService';
import { useAuth } from '../../contexts/AuthContext';

interface StoriesBarProps {
  onStoryClick: (group: StoryGroup, startIndex: number) => void;
  onCreateClick: () => void;
  refreshTrigger?: number;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ onStoryClick, onCreateClick, refreshTrigger }) => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await sbcApiService.getStatuses(1, 100);
      console.log('StoriesBar - Statuses API response:', response);

      if (response.body.success && response.body.data) {
        // Group statuses by userId
        const grouped: Record<string, StoryGroup> = {};

        console.log('StoriesBar - First status object:', response.body.data[0]);

        (response.body.data as any[]).forEach((status: any) => {
          const userId = status.authorId || status.userId || status.user?._id || status._id;
          console.log('StoriesBar - Processing status, userId:', userId, 'authorId:', status.authorId);

          if (!grouped[userId]) {
            // Handle different user data structures - API returns 'author' not 'user'
            const authorData = status.author || status.user;
            const userName = authorData?.name ||
                           (authorData?.firstName && authorData?.lastName
                             ? `${authorData.firstName} ${authorData.lastName}`
                             : authorData?.firstName || authorData?.lastName || 'Utilisateur');

            grouped[userId] = {
              userId,
              authorName: userName,
              authorAvatar: authorData?.avatar || '/default-avatar.png',
              statuses: [],
              hasUnviewed: false,
            };
          }

          grouped[userId].statuses.push(status);

          // Check if has any unviewed
          if (!status.isViewed) {
            grouped[userId].hasUnviewed = true;
          }
        });

        // Convert to array and sort: unviewed first
        const groupsArray = Object.values(grouped).sort((a, b) => {
          if (a.hasUnviewed && !b.hasUnviewed) return -1;
          if (!a.hasUnviewed && b.hasUnviewed) return 1;
          return 0;
        });

        console.log('StoriesBar - Grouped story groups:', groupsArray);
        console.log('StoriesBar - Each group userId:', groupsArray.map(g => g.userId));
        setStoryGroups(groupsArray);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [refreshTrigger]);

  if (loading && storyGroups.length === 0) {
    return (
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex gap-3 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  console.log('StoriesBar - Rendering with storyGroups:', storyGroups.length, 'groups');

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {/* Add Your Story Button */}
        <button
          key="add-story"
          onClick={onCreateClick}
          className="flex flex-col items-center gap-2 flex-shrink-0"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300">
              <img
                src={user?.avatar || '/default-avatar.png'}
                alt="Your story"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
              <PlusIcon className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-900 max-w-[64px] truncate">Votre statut</span>
        </button>

        {/* User Stories */}
        {storyGroups.map((group) => {
          return (
            <button
              key={group.userId}
              onClick={() => onStoryClick(group, 0)}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className={`rounded-full p-0.5 ${
                group.hasUnviewed
                  ? 'bg-gradient-to-tr from-blue-500 via-green-500 to-orange-500'
                  : 'bg-gray-300'
              }`}>
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-white">
                  <img
                    src={group.authorAvatar || '/default-avatar.png'}
                    alt={group.authorName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-gray-900 max-w-[64px] truncate">
                {group.authorName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
