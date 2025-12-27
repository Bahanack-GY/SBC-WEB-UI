import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import type { Conversation } from '../../types/chat';
import { sbcApiService } from '../../services/SBCApiService';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Skeleton from '../common/Skeleton';
import { needsAcceptance, getRemainingMessages, isInitiator, hasReachedMessageLimit } from '../../utils/conversationHelpers';

interface ConversationListProps {
  onConversationClick?: (conversation: Conversation) => void;
}

interface UserSearchResult {
  _id: string;
  name: string;
  avatar?: string;
  email: string;
  phoneNumber?: string;
  isOnline?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onConversationClick }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { onNewMessage, onMessageStatus, onUserOnline, onUserOffline, onlineUsers, isConnected } = useSocket();

  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<number | null>(null);
  const longPressDurationMs = 500;

  // User search modal
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Archived conversations modal
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Scroll container ref for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      console.log('ConversationList - Starting fetch, page:', pageNum);
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await sbcApiService.getConversations(pageNum, 20);

      console.log('ConversationList - API response:', response);
      console.log('ConversationList - Response structure:', {
        hasBody: !!response.body,
        success: response.body?.success,
        hasData: !!response.body?.data,
        dataType: typeof response.body?.data,
        dataIsArray: Array.isArray(response.body?.data),
      });

      if (response.body.success && response.body.data) {
        const newConversations = response.body.data as Conversation[];

        // Update online status based on socket data (only if socket is connected)
        const updatedConversations = newConversations.map(conv => ({
          ...conv,
          participants: conv.participants.map(p => ({
            ...p,
            isOnline: isConnected && onlineUsers.has(p._id),
          })),
        }));

        if (append) {
          setConversations(prev => [...prev, ...updatedConversations]);
        } else {
          setConversations(updatedConversations);
        }

        // Check if there are more pages
        if (response.body.pagination) {
          setHasMore(response.body.pagination.currentPage < response.body.pagination.totalPages);
        } else {
          setHasMore(newConversations.length >= 20);
        }
      } else {
        // Handle empty or error response - still set loading to false
        console.warn('No conversations data in response:', response);
        if (!append) {
          setConversations([]);
        }
      }
    } catch (error) {
      console.error('ConversationList - Error fetching conversations:', error);
      console.error('ConversationList - Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Set empty conversations on error
      if (!append) {
        setConversations([]);
      }
    } finally {
      console.log('ConversationList - Fetch completed, setting loading to false');
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [onlineUsers]);

  // Initial fetch
  useEffect(() => {
    fetchConversations(1, false);
  }, [fetchConversations]);

  // Filter conversations based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(conv => {
        const participantNames = conv.participants
          .map(p => p.name.toLowerCase())
          .join(' ');
        const lastMessageContent = conv.lastMessage?.content.toLowerCase() || '';
        return participantNames.includes(query) || lastMessageContent.includes(query);
      });
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  // Real-time updates
  useEffect(() => {
    const unsubscribeNewMessage = onNewMessage((message) => {
      setConversations(prev => {
        const updatedConversations = [...prev];
        const convIndex = updatedConversations.findIndex(c => c._id === message.conversationId);

        if (convIndex !== -1) {
          const conv = updatedConversations[convIndex];
          updatedConversations[convIndex] = {
            ...conv,
            lastMessage: {
              content: message.content,
              senderId: message.senderId,
              createdAt: message.createdAt,
            },
            lastMessageAt: message.createdAt,
            unreadCount: conv.unreadCount + 1,
          };
          // Move to top
          const [updated] = updatedConversations.splice(convIndex, 1);
          updatedConversations.unshift(updated);
        }

        return updatedConversations;
      });
    });

    const unsubscribeMessageStatus = onMessageStatus((event) => {
      if (event.status === 'read') {
        setConversations(prev =>
          prev.map(conv => ({
            ...conv,
            unreadCount: 0, // Reset unread when messages are read
          }))
        );
      }
    });

    const unsubscribeUserOnline = onUserOnline((event) => {
      setConversations(prev =>
        prev.map(conv => ({
          ...conv,
          participants: conv.participants.map(p =>
            p._id === event.userId ? { ...p, isOnline: true } : p
          ),
        }))
      );
    });

    const unsubscribeUserOffline = onUserOffline((event) => {
      setConversations(prev =>
        prev.map(conv => ({
          ...conv,
          participants: conv.participants.map(p =>
            p._id === event.userId ? { ...p, isOnline: false } : p
          ),
        }))
      );
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageStatus();
      unsubscribeUserOnline();
      unsubscribeUserOffline();
    };
  }, [onNewMessage, onMessageStatus, onUserOnline, onUserOffline]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMore || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (scrolledToBottom) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchConversations(nextPage, true);
    }
  }, [hasMore, isLoadingMore, page, fetchConversations]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Auto-exit selection mode when no items are selected
  useEffect(() => {
    if (selectionMode && selectedConversations.size === 0) {
      setSelectionMode(false);
    }
  }, [selectedConversations.size, selectionMode]);

  // Long press handlers
  const handleLongPressStart = (conversationId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedConversations(new Set([conversationId]));
    }, longPressDurationMs);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Selection handlers
  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversations(prev => {
      const updated = new Set(prev);
      if (updated.has(conversationId)) {
        updated.delete(conversationId);
      } else {
        updated.add(conversationId);
      }
      return updated;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedConversations(new Set());
  };

  const selectAll = () => {
    setSelectedConversations(new Set(filteredConversations.map(c => c._id)));
  };

  const deselectAll = () => {
    setSelectedConversations(new Set());
  };

  // Delete handlers
  const handleDeleteClick = () => {
    if (selectedConversations.size > 0) {
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    try {
      const conversationIds = Array.from(selectedConversations);

      // Optimistic update
      setConversations(prev => prev.filter(c => !selectedConversations.has(c._id)));

      // API call - use archive instead of delete
      if (conversationIds.length === 1) {
        await sbcApiService.archiveConversation(conversationIds[0]);
      } else {
        await sbcApiService.bulkArchiveConversations(conversationIds);
      }

      exitSelectionMode();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to archive conversations:', error);
      // Refresh on error to restore state
      fetchConversations(1, false);
    }
  };

  // Archived conversations handlers
  const fetchArchivedConversations = async () => {
    try {
      setLoadingArchived(true);
      const response = await sbcApiService.getArchivedConversations(1, 50);

      if (response.body.success && response.body.data) {
        const data = response.body.data as any;
        setArchivedConversations(data.conversations || []);
        setArchivedCount(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch archived conversations:', error);
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleUnarchive = async (conversationId: string) => {
    try {
      await sbcApiService.unarchiveConversation(conversationId);

      // Remove from archived list
      setArchivedConversations(prev => prev.filter(c => c._id !== conversationId));
      setArchivedCount(prev => Math.max(0, prev - 1));

      // Refresh active conversations to show the unarchived one
      fetchConversations(1, false);
    } catch (error) {
      console.error('Failed to unarchive conversation:', error);
    }
  };

  const openArchivedModal = () => {
    setShowArchivedModal(true);
    fetchArchivedConversations();
  };

  // User search handlers
  const searchUsers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await sbcApiService.searchUsers({
        search: query,
        status: 'active',
        page: 1,
        limit: 20,
      });

      if (response.body.success && response.body.data) {
        // Update online status based on socket connection
        const results = (response.body.data as UserSearchResult[]).map(u => ({
          ...u,
          isOnline: isConnected && onlineUsers.has(u._id),
        }));
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [isConnected, onlineUsers]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [userSearchQuery, searchUsers]);

  const handleUserSelect = async (user: UserSearchResult) => {
    try {
      const response = await sbcApiService.getOrCreateConversation(user._id);
      if (response.body.success && response.body.data) {
        setShowUserSearchModal(false);
        setUserSearchQuery('');
        const conversation = response.body.data as Conversation;
        // Navigate to the conversation or trigger callback
        if (onConversationClick) {
          onConversationClick(conversation);
        } else {
          navigate(`/chat/${conversation._id}`);
        }
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: fr,
      });
    } catch {
      return '';
    }
  };

  // Get conversation display name - exclude current user
  const getConversationName = (conv: Conversation) => {
    const otherParticipants = conv.participants.filter(p => p._id !== user?._id);
    if (otherParticipants.length === 0) {
      // Fallback if no other participants found
      return conv.participants.map(p => p.name).join(', ');
    }
    return otherParticipants.map(p => p.name).join(', ');
  };

  // Get conversation avatar - exclude current user
  const getConversationAvatar = (conv: Conversation) => {
    const otherParticipant = conv.participants.find(p => p._id !== user?._id);
    return otherParticipant?.avatar;
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Get background color for avatar based on name
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Get online status - check if any other participant is online
  const isConversationOnline = (conv: Conversation) => {
    return conv.participants.some(p => p._id !== user?._id && p.isOnline);
  };

  // Handle conversation click
  const handleConversationClick = (conv: Conversation) => {
    if (selectionMode) {
      toggleConversationSelection(conv._id);
    } else {
      if (onConversationClick) {
        onConversationClick(conv);
      } else {
        navigate(`/chat/${conv._id}`);
      }
    }
  };

  // Handle profile click
  const handleProfileClick = async (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation(); // Prevent conversation click
    if (!user) return;

    // Get the other participant
    const otherParticipant = conv.participants.find(p => p._id !== user._id);
    if (!otherParticipant) return;

    setShowProfileModal(true);
    setLoadingProfile(true);

    try {
      const response = await sbcApiService.getUserProfileById(otherParticipant._id);
      if (response.body.success && response.body.data) {
        setSelectedUserProfile(response.body.data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Loading skeleton
  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header skeleton */}
        <div className="p-4 border-b border-gray-200">
          <Skeleton height="h-10" rounded="rounded-lg" />
        </div>

        {/* List skeleton */}
        <div className="flex-1 overflow-y-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b border-gray-100">
              <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
              <div className="flex-1">
                <Skeleton width="w-32" height="h-4" className="mb-2" />
                <Skeleton width="w-48" height="h-3" />
              </div>
              <Skeleton width="w-12" height="h-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          {selectionMode ? (
            // Selection mode header
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={exitSelectionMode}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-700" />
                </button>
                <span className="font-medium text-gray-900">
                  {selectedConversations.size} sélectionné{selectedConversations.size > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversations.size === filteredConversations.length ? (
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Tout désélectionner
                  </button>
                ) : (
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Tout sélectionner
                  </button>
                )}
                <button
                  onClick={handleDeleteClick}
                  disabled={selectedConversations.size === 0}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Archiver"
                >
                  <ArchiveBoxIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            // Normal header
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <button
                  onClick={() => setShowUserSearchModal(true)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {filteredConversations.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm">
                {searchQuery
                  ? 'Aucune conversation ne correspond à votre recherche.'
                  : 'Commencez une nouvelle conversation en cliquant sur le bouton +'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowUserSearchModal(true)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Nouvelle conversation
                </button>
              )}
            </div>
          ) : (
            // Conversation items
            <>
              {/* Archived Chats Button */}
              {!searchQuery && (
                <button
                  onClick={openArchivedModal}
                  className="w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                        <ArchiveBoxIcon className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Conversations archivées</p>
                        <p className="text-sm text-gray-500">
                          {archivedCount > 0 ? `${archivedCount} conversation${archivedCount > 1 ? 's' : ''}` : 'Aucune conversation archivée'}
                        </p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )}

              {filteredConversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => handleConversationClick(conv)}
                  onMouseDown={() => !selectionMode && handleLongPressStart(conv._id)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => !selectionMode && handleLongPressStart(conv._id)}
                  onTouchEnd={handleLongPressEnd}
                  className={`flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    conv.unreadCount > 0 ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Checkbox in selection mode */}
                  {selectionMode && (
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedConversations.has(conv._id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedConversations.has(conv._id) && (
                        <CheckIcon className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                  )}

                  {/* Avatar with online indicator */}
                  <button
                    onClick={(e) => handleProfileClick(e, conv)}
                    className="relative flex-shrink-0 hover:opacity-80 transition-opacity"
                  >
                    {getConversationAvatar(conv) ? (
                      <img
                        src={getConversationAvatar(conv)}
                        alt={getConversationName(conv)}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${getAvatarColor(getConversationName(conv))}`}>
                        {getInitials(getConversationName(conv))}
                      </div>
                    )}
                    {isConversationOnline(conv) && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className={`font-medium truncate ${
                        conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'
                      }`}>
                        {getConversationName(conv)}
                      </h3>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatTimestamp(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${
                        conv.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                      }`}>
                        {conv.lastMessage?.content || 'Aucun message'}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Acceptance badge - shown to recipients who need to accept */}
                        {user && needsAcceptance(conv, user._id) && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                            À accepter
                          </span>
                        )}
                        {/* Initiator waiting badge - shown to initiators waiting for acceptance */}
                        {user && isInitiator(conv, user._id) && conv.acceptanceStatus === 'pending' && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            hasReachedMessageLimit(conv, user._id)
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {hasReachedMessageLimit(conv, user._id) ? 'En attente' : `${getRemainingMessages(conv, user._id)} msg restant${getRemainingMessages(conv, user._id) > 1 ? 's' : ''}`}
                          </span>
                        )}
                        {/* Reported badge */}
                        {conv.acceptanceStatus === 'reported' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                            Signalée
                          </span>
                        )}
                        {/* Blocked badge */}
                        {conv.acceptanceStatus === 'blocked' && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                            Bloquée
                          </span>
                        )}
                        {/* Unread count */}
                        {conv.unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="p-4 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Search Modal */}
      {showUserSearchModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Nouvelle conversation
                </h2>
                <button
                  onClick={() => {
                    setShowUserSearchModal(false);
                    setUserSearchQuery('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Search results */}
            <div className="flex-1 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton width="w-10" height="h-10" rounded="rounded-full" />
                      <div className="flex-1">
                        <Skeleton width="w-32" height="h-4" className="mb-1" />
                        <Skeleton width="w-48" height="h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {userSearchQuery.trim().length < 2
                    ? 'Entrez au moins 2 caractères pour rechercher'
                    : 'Aucun utilisateur trouvé'}
                </div>
              ) : (
                <div>
                  {searchResults.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      onClick={() => handleUserSelect(searchUser)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="relative">
                        {searchUser.avatar ? (
                          <img
                            src={searchUser.avatar}
                            alt={searchUser.name || ''}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(searchUser.name || '')}`}>
                            {getInitials(searchUser.name || '')}
                          </div>
                        )}
                        {searchUser.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {searchUser.name || ''}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {searchUser.phoneNumber && (
                            <span className="truncate">{searchUser.phoneNumber}</span>
                          )}
                          {searchUser.phoneNumber && searchUser.email && (
                            <span>•</span>
                          )}
                          {searchUser.email && (
                            <span className="truncate">{searchUser.email}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Archiver {selectedConversations.size > 1 ? 'les conversations' : 'la conversation'} ?
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedConversations.size > 1
                ? `Ces ${selectedConversations.size} conversations seront masquées de votre liste. Vous pouvez les restaurer en envoyant un nouveau message.`
                : 'Cette conversation sera masquée de votre liste. Vous pouvez la restaurer en envoyant un nouveau message.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
              >
                Archiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Informations du profil</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loadingProfile ? (
                <div className="flex flex-col items-center gap-4">
                  <Skeleton width="w-24" height="h-24" rounded="rounded-full" />
                  <div className="w-full space-y-3">
                    <Skeleton width="w-full" height="h-5" />
                    <Skeleton width="w-3/4" height="h-5" />
                    <Skeleton width="w-full" height="h-5" />
                    <Skeleton width="w-2/3" height="h-5" />
                  </div>
                </div>
              ) : selectedUserProfile ? (
                <div className="space-y-6">
                  {/* Avatar and Name */}
                  <div className="flex flex-col items-center">
                    {selectedUserProfile.avatar ? (
                      <img
                        src={selectedUserProfile.avatar}
                        alt={selectedUserProfile.name || `${selectedUserProfile.firstName} ${selectedUserProfile.lastName}`}
                        className="w-24 h-24 rounded-full object-cover mb-3"
                      />
                    ) : (
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3 ${getAvatarColor(selectedUserProfile.name || `${selectedUserProfile.firstName} ${selectedUserProfile.lastName}`)}`}>
                        {getInitials(selectedUserProfile.name || `${selectedUserProfile.firstName} ${selectedUserProfile.lastName}`)}
                      </div>
                    )}
                    <h4 className="text-xl font-bold text-gray-900 text-center">
                      {selectedUserProfile.name || `${selectedUserProfile.firstName} ${selectedUserProfile.lastName}`}
                    </h4>
                    {onlineUsers.has(selectedUserProfile._id) && (
                      <span className="text-sm text-green-600 font-medium mt-1">En ligne</span>
                    )}
                  </div>

                  {/* Information Cards */}
                  <div className="space-y-3">
                    {/* Email */}
                    {selectedUserProfile.email && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Email</p>
                            <p className="text-sm text-gray-900">{selectedUserProfile.email}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phone */}
                    {selectedUserProfile.phoneNumber && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Téléphone</p>
                            <p className="text-sm text-gray-900">{selectedUserProfile.phoneNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Member Since */}
                    {selectedUserProfile.createdAt && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Membre depuis</p>
                            <p className="text-sm text-gray-900">
                              {format(parseISO(selectedUserProfile.createdAt), 'dd MMMM yyyy', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subscription Type */}
                    {selectedUserProfile.subscriptionType && (
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-blue-600 font-medium">Type d'abonnement</p>
                            <p className="text-sm text-gray-900 font-semibold capitalize">
                              {selectedUserProfile.subscriptionType}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Language */}
                    {selectedUserProfile.language && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Langue</p>
                            <p className="text-sm text-gray-900 capitalize">{selectedUserProfile.language}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Impossible de charger les informations du profil</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archived Conversations Modal */}
      {showArchivedModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Conversations archivées</h2>
              <button
                onClick={() => setShowArchivedModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingArchived ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : archivedConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ArchiveBoxIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune conversation archivée</h3>
                  <p className="text-gray-500 text-center">
                    Les conversations archivées apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {archivedConversations.map((conv) => {
                    const otherParticipant = conv.participants.find(p => p._id !== user?._id);
                    if (!otherParticipant) return null;

                    return (
                      <div
                        key={conv._id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {otherParticipant.avatar ? (
                              <img
                                src={otherParticipant.avatar}
                                alt={otherParticipant.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(otherParticipant.name)}`}>
                                {getInitials(otherParticipant.name)}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-gray-900 truncate">
                                {otherParticipant.name}
                              </p>
                              {conv.lastMessageAt && (
                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                  {formatDistanceToNow(parseISO(conv.lastMessageAt), {
                                    addSuffix: true,
                                    locale: fr,
                                  })}
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-sm text-gray-500 truncate">
                                {conv.lastMessage.content}
                              </p>
                            )}
                          </div>

                          {/* Unarchive Button */}
                          <button
                            onClick={() => handleUnarchive(conv._id)}
                            className="flex-shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                            title="Désarchiver"
                          >
                            Restaurer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
