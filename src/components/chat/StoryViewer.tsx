import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Status, StoryGroup } from '../../types/chat';
import { sbcApiService } from '../../services/SBCApiService';

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  onClose: () => void;
  onReply?: (status: Status) => void;
  onGroupChange?: (groupIndex: number) => void;
}

const StoryViewer = ({
  storyGroups,
  initialGroupIndex,
  initialStoryIndex = 0,
  onClose,
  onReply,
  onGroupChange,
}: StoryViewerProps) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const progressIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.statuses[currentStoryIndex];

  // Auto-advance duration (5 seconds default, or video duration)
  const getStoryDuration = useCallback(() => {
    if (currentStory?.contentType === 'video' && currentStory.mediaDuration) {
      // Use video duration if available and longer than 5 seconds
      return Math.max(currentStory.mediaDuration * 1000, 5000);
    }
    return 5000; // 5 seconds default
  }, [currentStory]);

  // Initialize like status from current story
  useEffect(() => {
    if (currentStory) {
      setIsLiked(currentStory.isLiked);
      setLikesCount(currentStory.likesCount);
    }
  }, [currentStory]);

  // Record view when story changes
  useEffect(() => {
    if (currentStory && !currentStory.isViewed) {
      sbcApiService.viewStatus(currentStory._id).catch(console.error);
    }
  }, [currentStory]);

  // Progress bar animation
  useEffect(() => {
    if (!currentStory || isPaused || isLongPressing) return;

    setProgress(0);
    const duration = getStoryDuration();
    const interval = 50; // Update every 50ms for smooth animation
    const increment = (interval / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStory, isPaused, isLongPressing, currentGroupIndex, currentStoryIndex]);

  // Handle video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPaused || isLongPressing) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
  }, [isPaused, isLongPressing]);

  // Reset video when story changes
  useEffect(() => {
    const video = videoRef.current;
    if (video && currentStory?.contentType === 'video') {
      video.currentTime = 0;
      video.load();
      if (!isPaused && !isLongPressing) {
        video.play().catch(console.error);
      }
    }
  }, [currentStory]);

  // Navigate to next story or group
  const handleNext = useCallback(() => {
    if (!currentGroup) return;

    if (currentStoryIndex < currentGroup.statuses.length - 1) {
      // Next story in same group
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      // Next group
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
      onGroupChange?.(currentGroupIndex + 1);
    } else {
      // End of all stories
      onClose();
    }
  }, [currentGroup, currentStoryIndex, currentGroupIndex, storyGroups.length, onClose, onGroupChange]);

  // Navigate to previous story or group
  const handlePrevious = useCallback(() => {
    if (currentStoryIndex > 0) {
      // Previous story in same group
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      // Previous group (go to last story)
      const prevGroupIndex = currentGroupIndex - 1;
      setCurrentGroupIndex(prevGroupIndex);
      setCurrentStoryIndex(storyGroups[prevGroupIndex].statuses.length - 1);
      setProgress(0);
      onGroupChange?.(prevGroupIndex);
    }
  }, [currentStoryIndex, currentGroupIndex, storyGroups, onGroupChange]);

  // Handle like/unlike toggle
  const handleLikeToggle = async () => {
    if (!currentStory) return;

    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      if (isLiked) {
        await sbcApiService.unlikeStatus(currentStory._id);
      } else {
        await sbcApiService.likeStatus(currentStory._id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      console.error('Failed to toggle like:', error);
    }
  };

  // Handle reply
  const handleReply = () => {
    if (currentStory && onReply) {
      onReply(currentStory);
      onClose();
    }
  };

  // Long press handlers
  const handlePressStart = () => {
    longPressTimerRef.current = window.setTimeout(() => {
      setIsLongPressing(true);
    }, 100); // Start pausing after 100ms
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  };

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, onClose]);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  if (!currentGroup || !currentStory) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {currentGroup.statuses.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width:
                    index < currentStoryIndex
                      ? '100%'
                      : index === currentStoryIndex
                      ? `${progress}%`
                      : '0%',
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="absolute top-4 left-0 right-0 z-20 px-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                {currentGroup.authorAvatar ? (
                  <img
                    src={currentGroup.authorAvatar}
                    alt={currentGroup.authorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold">
                    {currentGroup.authorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">
                  {currentGroup.authorName}
                </h3>
                <p className="text-white/80 text-xs">
                  {formatTimeAgo(currentStory.createdAt)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {currentStory.mediaUrl ? (
            currentStory.contentType === 'video' ? (
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="max-w-full max-h-full object-contain"
                autoPlay
                muted
                playsInline
                onEnded={handleNext}
              />
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt="Story"
                className="max-w-full max-h-full object-contain"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-green-600 to-orange-500 p-8">
              <p className="text-white text-2xl md:text-4xl font-bold text-center max-w-2xl">
                {currentStory.content || currentStory.textContent}
              </p>
            </div>
          )}

          {/* Text Overlay (caption for media stories) */}
          {currentStory.mediaUrl && (currentStory.content || currentStory.textContent) && (
            <div className="absolute bottom-32 left-0 right-0 px-6">
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white text-base text-center">{currentStory.content || currentStory.textContent}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Zones */}
        <button
          onClick={handlePrevious}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer group"
          aria-label="Previous story"
        >
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
        </button>

        <button
          onClick={handleNext}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer group"
          aria-label="Next story"
        >
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
        </button>

        {/* Center pause zone */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          className="absolute left-1/3 right-1/3 top-0 bottom-0 z-10 cursor-pointer"
          aria-label={isPaused ? 'Resume' : 'Pause'}
        />

        {/* Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
          <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center gap-4">
              {/* Reply Button */}
              {onReply && (
                <button
                  onClick={handleReply}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Répondre</span>
                </button>
              )}

              {/* Like Button */}
              <button
                onClick={handleLikeToggle}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-full flex items-center gap-2 transition-all hover:scale-105"
              >
                <Heart
                  className={`w-5 h-5 transition-all ${
                    isLiked ? 'fill-red-500 text-red-500' : ''
                  }`}
                />
                <span>{likesCount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pause Indicator */}
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
          >
            <div className="bg-black/70 backdrop-blur-sm rounded-full p-6">
              <div className="flex gap-2">
                <div className="w-2 h-12 bg-white rounded-full" />
                <div className="w-2 h-12 bg-white rounded-full" />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryViewer;
