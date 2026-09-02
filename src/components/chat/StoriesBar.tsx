import { DEFAULT_AVATAR } from '../common/Avatar';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { StoryGroup } from '../../types/chat';
import { sbcApiService } from '../../services/SBCApiService';
import { useAuth } from '../../contexts/AuthContext';
import { pageFade, listContainer, rowItem } from '../../utils/motion';

interface StoriesBarProps {
  /** The tapped group plus every group, so the viewer can advance past it. */
  onStoryClick: (group: StoryGroup, allGroups: StoryGroup[]) => void;
  onCreateClick: () => void;
  refreshTrigger?: number;
}


/**
 * What the ring shows: the person's most recent status, not their avatar —
 * that is what the ring is announcing. Falls back to the avatar for a text-only
 * status (nothing to show) or a video, and both are requested at thumbnail size
 * rather than full resolution.
 */
const previewFor = (group: StoryGroup): string => {
  const latest = group.statuses?.[group.statuses.length - 1] as
    | { mediaUrl?: string; mediaThumbnailUrl?: string; mediaType?: string }
    | undefined;

  const media = latest?.mediaThumbnailUrl || latest?.mediaUrl;
  if (media && latest?.mediaType !== 'video' && latest?.mediaType !== 'text') {
    // Private status media arrives pre-signed and cannot be resized by us; the
    // helper returns it untouched in that case.
    return sbcApiService.generateThumbnailUrl(media, 128);
  }
  return sbcApiService.generateThumbnailUrl(group.authorAvatar, 128) || DEFAULT_AVATAR;
};

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
              authorAvatar: authorData?.avatar || DEFAULT_AVATAR,
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
      <motion.div variants={pageFade} initial="hidden" animate="show" className="bg-white border-b border-border p-4">
        <div className="flex gap-3 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  console.log('StoriesBar - Rendering with storyGroups:', storyGroups.length, 'groups');

  return (
    <motion.div variants={pageFade} initial="hidden" animate="show" className="bg-white border-b border-border p-4">
      <motion.div variants={listContainer} initial="hidden" animate="show" className="flex gap-3 overflow-x-auto scrollbar-hide">
        {/* Add Your Story Button */}
        <motion.button
          key="add-story"
          variants={rowItem}
          onClick={onCreateClick}
          className="flex flex-col items-center gap-2 flex-shrink-0"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border">
              <img
                src={sbcApiService.generateThumbnailUrl(user?.avatar, 128) || DEFAULT_AVATAR}
                alt="Your story"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
              <HugeiconsIcon icon={PlusSignIcon} className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-900 max-w-[64px] truncate">Votre statut</span>
        </motion.button>

        {/* User Stories */}
        {storyGroups.map((group) => {
          return (
            <motion.button
              key={group.userId}
              variants={rowItem}
              onClick={() => onStoryClick(group, storyGroups)}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className={`bg-primary rounded-full p-0.5 ${
 group.hasUnviewed
 ? ' '
 : 'bg-gray-300'
 }`}>
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-white">
                  <img
                    src={previewFor(group)}
                    alt={group.authorName}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    // A status whose signed URL has lapsed, or a video, should not
                    // leave a broken-image icon in the ring.
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = group.authorAvatar || DEFAULT_AVATAR; }}
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-gray-900 max-w-[64px] truncate">
                {group.authorName}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
