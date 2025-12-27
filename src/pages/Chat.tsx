import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StoriesBar } from '../components/chat/StoriesBar';
import { StatusFeed } from '../components/chat/StatusFeed';
import StoryViewer from '../components/chat/StoryViewer';
import StoryComposer from '../components/chat/StoryComposer';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatView } from '../components/chat/ChatView';
import type { StoryGroup, Status, Conversation } from '../types/chat';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();

  // Check if user is admin or tester
  const isAdminOrTester = user?.role === 'admin' || user?.role === 'tester';

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
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Teaser overlay for non-admin/tester users */}
      {!isAdminOrTester && (
        <>
          {/* Blur overlay */}
          <div className="absolute inset-0 z-40 backdrop-blur-md bg-white/30" />

          {/* Teaser message - centered */}
          <div className="absolute inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 max-w-md text-center shadow-xl border border-white/50"
            >
              <div className="text-6xl mb-4">
                {viewMode === 'status' ? '📸' : '💬'}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Bientôt disponible !
              </h2>
              <p className="text-gray-600 mb-6">
                {viewMode === 'status'
                  ? "La fonctionnalité Statuts sera disponible très prochainement. Partagez vos actualités, projets et moments avec tous les membres de la communauté."
                  : "La fonctionnalité Messages sera disponible très prochainement. Discutez en privé avec d'autres membres, partagez des fichiers et restez connecté."
                }
              </p>
              <div className="bg-white rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Fonctionnalités à venir :</p>
                <ul className="text-left text-sm text-gray-700 space-y-1">
                  {viewMode === 'status' ? (
                    <>
                      <li>✅ Partager des photos et vidéos</li>
                      <li>✅ Ajouter du texte et des légendes</li>
                      <li>✅ Voir les statuts des autres membres</li>
                      <li>✅ Répondre aux statuts en privé</li>
                    </>
                  ) : (
                    <>
                      <li>✅ Messagerie privée en temps réel</li>
                      <li>✅ Partage de documents et images</li>
                      <li>✅ Notifications de nouveaux messages</li>
                      <li>✅ Historique de conversations</li>
                    </>
                  )}
                </ul>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Retour à l'accueil
              </button>
            </motion.div>
          </div>
        </>
      )}

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
