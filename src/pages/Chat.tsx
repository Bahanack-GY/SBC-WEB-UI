import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StoriesBar } from '../components/chat/StoriesBar';
import { StatusFeed } from '../components/chat/StatusFeed';
import StoryViewer from '../components/chat/StoryViewer';
import StoryComposer from '../components/chat/StoryComposer';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatView } from '../components/chat/ChatView';
import type { StoryGroup, Status, Conversation } from '../types/chat';
import { useSocket } from '../contexts/SocketContext';

// Custom hook to hide navigation bar
const useHideNav = (shouldHide: boolean) => {
  useEffect(() => {
    const navBar = document.querySelector('nav');
    if (navBar) {
      if (shouldHide) {
        navBar.style.display = 'none';
      } else {
        navBar.style.display = '';
      }
    }

    return () => {
      const navBar = document.querySelector('nav');
      if (navBar) {
        navBar.style.display = '';
      }
    };
  }, [shouldHide]);
};

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscribeToStatuses } = useSocket();

  // URL state management
  const conversationId = searchParams.get('conversation');
  const viewMode = searchParams.get('view'); // 'status' or null (default to messages)

  // Stories state
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showStoryComposer, setShowStoryComposer] = useState(false);
  const [currentStoryGroups, setCurrentStoryGroups] = useState<StoryGroup[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [storiesRefresh, setStoriesRefresh] = useState(0);

  // Hide navigation bar when StoryComposer or StoryViewer is open
  useHideNav(showStoryComposer || showStoryViewer);

  // Subscribe to status updates via socket
  useEffect(() => {
    subscribeToStatuses();

    return () => {
      // Cleanup - no unsubscribe needed as context handles it
    };
  }, [subscribeToStatuses]);

  const handleStoryClick = (group: StoryGroup) => {
    // In a real implementation, we'd get all story groups here
    // For now, just show the single group
    setCurrentStoryGroups([group]);
    setCurrentGroupIndex(0);
    setShowStoryViewer(true);
  };

  const handleStatusClick = (status: Status) => {
    // Create a story group from single status for viewer
    const authorData = (status as any).author || status.user;
    const userName = authorData?.name ||
                    (authorData?.firstName && authorData?.lastName
                      ? `${authorData.firstName} ${authorData.lastName}`
                      : authorData?.firstName || authorData?.lastName || 'Utilisateur');

    const group: StoryGroup = {
      userId: (status as any).authorId || status.userId,
      authorName: userName,
      authorAvatar: authorData?.avatar || '/default-avatar.png',
      statuses: [status],
      hasUnviewed: !status.isViewed,
    };
    setCurrentStoryGroups([group]);
    setCurrentGroupIndex(0);
    setShowStoryViewer(true);
  };

  const handleCreateStoryClick = () => {
    setShowStoryComposer(true);
  };

  const handleStoryComposerSuccess = () => {
    setShowStoryComposer(false);
    // Refresh stories bar
    setStoriesRefresh(prev => prev + 1);
  };

  const handleReplyToStatus = (status: Status) => {
    // Close story viewer
    setShowStoryViewer(false);

    // Navigate to conversation with status author
    // This would typically create a conversation first, but we'll let ConversationList handle it
    navigate(`/chat?conversation=new&userId=${status.userId}`);
  };

  const handleConversationClick = (conv: Conversation) => {
    setSearchParams({ conversation: conv._id });
  };

  const handleBackFromChat = () => {
    setSearchParams({});
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Stories Bar - Only show when not in a conversation */}
      {!conversationId && (
        <StoriesBar
          onStoryClick={handleStoryClick}
          onCreateClick={handleCreateStoryClick}
          refreshTrigger={storiesRefresh}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {conversationId ? (
          <ChatView
            conversationId={conversationId}
            onBack={handleBackFromChat}
          />
        ) : viewMode === 'status' ? (
          <StatusFeed
            onStatusClick={handleStatusClick}
            onCreateClick={handleCreateStoryClick}
            refreshTrigger={storiesRefresh}
          />
        ) : (
          <ConversationList
            onConversationClick={handleConversationClick}
          />
        )}
      </div>

      {/* Story Viewer Modal */}
      {showStoryViewer && currentStoryGroups.length > 0 && (
        <StoryViewer
          storyGroups={currentStoryGroups}
          initialGroupIndex={currentGroupIndex}
          initialStoryIndex={0}
          onClose={() => setShowStoryViewer(false)}
          onReply={handleReplyToStatus}
          onGroupChange={(index) => setCurrentGroupIndex(index)}
        />
      )}

      {/* Story Composer Modal */}
      <StoryComposer
        isOpen={showStoryComposer}
        onClose={() => setShowStoryComposer(false)}
        onSuccess={handleStoryComposerSuccess}
      />
    </div>
  );
}
