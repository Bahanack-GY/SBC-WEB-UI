import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { sbcApiService } from '../../services/SBCApiService';
import type {
  Message,
  Conversation,
  TypingEvent,
  MessageStatusEvent,
  MessageDeletedEvent,
} from '../../types/chat';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
  CheckIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Skeleton from '../common/Skeleton';
import {
  needsAcceptance,
  canSendMessage,
  getRemainingMessages,
  isInitiator,
  hasReachedMessageLimit,
} from '../../utils/conversationHelpers';

interface ChatViewProps {
  conversationId: string;
  onBack?: () => void;
}

interface MessageGroup {
  date: string;
  messages: Message[];
}

interface ForwardModalData {
  messageIds: string[];
  isOpen: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ conversationId, onBack }) => {
  const { user } = useAuth();
  const {
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markAsRead,
    onNewMessage,
    onMessageSent,
    onMessageStatus,
    onMessageDeleted,
    onTyping,
    onStoppedTyping,
    onConversationAccepted,
    onConversationReported,
  } = useSocket();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<number | null>(null);
  const longPressDurationMs = 500;

  // Reply
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // Swipe to reply
  const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const swipeStartX = useRef<number>(0);
  const swipeStartY = useRef<number>(0);
  const isSwiping = useRef(false);
  const hasVibrated = useRef(false);
  const swipeThreshold = 80;
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // pixels to trigger reply

  // Document upload
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Document URL refresh cache
  const [refreshedDocumentUrls, setRefreshedDocumentUrls] = useState<Map<string, string>>(new Map());
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forward modal
  const [forwardModal, setForwardModal] = useState<ForwardModalData>({
    messageIds: [],
    isOpen: false,
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef(true);

  // Optimistic messages (pending send)
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Fetch conversation details
  const fetchConversation = useCallback(async () => {
    try {
      const response = await sbcApiService.getConversation(conversationId);
      if (response.body.success && response.body.data) {
        setConversation(response.body.data as Conversation);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  }, [conversationId]);

  // Fetch messages
  const fetchMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await sbcApiService.getMessages(conversationId, pageNum, 50);

      if (response.body.success && response.body.data) {
        const newMessages = response.body.data as Message[];

        if (append) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
        }

        // Check if there are more pages
        if (response.body.pagination) {
          setHasMore(response.body.pagination.currentPage < response.body.pagination.totalPages);
        } else {
          setHasMore(newMessages.length >= 50);
        }

        // Mark messages as read
        if (pageNum === 1 && newMessages.length > 0) {
          const unreadMessageIds = newMessages
            .filter(msg => msg.senderId !== user?._id && !msg.readBy.includes(user?._id || ''))
            .map(msg => msg._id);

          if (unreadMessageIds.length > 0) {
            markAsRead(conversationId, unreadMessageIds);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, user, markAsRead]);

  // Initial fetch
  useEffect(() => {
    fetchConversation();
    fetchMessages(1, false);
    joinConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, fetchConversation, fetchMessages, joinConversation, leaveConversation]);

  // Real-time message handlers
  useEffect(() => {
    const unsubscribeNewMessage = onNewMessage((message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });

        // Remove optimistic message if it exists
        if (message.senderId === user?._id) {
          setOptimisticMessages(prev => prev.filter(m => m.content !== message.content));
        }

        // Auto scroll to bottom
        shouldAutoScrollRef.current = true;

        // Mark as read if from other user
        if (message.senderId !== user?._id) {
          markAsRead(conversationId, [message._id]);
        }
      }
    });

    const unsubscribeMessageSent = onMessageSent((message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        // Clear all optimistic messages when real message arrives
        setOptimisticMessages([]);
      }
    });

    const unsubscribeMessageStatus = onMessageStatus((event: MessageStatusEvent) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === event.messageId
            ? { ...msg, status: event.status, readBy: event.readBy }
            : msg
        )
      );
    });

    const unsubscribeMessageDeleted = onMessageDeleted((event: MessageDeletedEvent) => {
      if (event.conversationId === conversationId) {
        setMessages(prev => prev.filter(msg => msg._id !== event.messageId));
      }
    });

    const unsubscribeTyping = onTyping((event: TypingEvent) => {
      if (event.conversationId === conversationId && event.userId !== user?._id) {
        setTypingUsers(prev => new Set(prev).add(event.userName));
      }
    });

    const unsubscribeStoppedTyping = onStoppedTyping((event: TypingEvent) => {
      if (event.conversationId === conversationId) {
        setTypingUsers(prev => {
          const updated = new Set(prev);
          updated.delete(event.userName);
          return updated;
        });
      }
    });

    const unsubscribeConversationAccepted = onConversationAccepted((event) => {
      if (event.conversationId === conversationId && conversation) {
        setConversation({
          ...conversation,
          acceptanceStatus: 'accepted',
          acceptedAt: new Date().toISOString(),
        });
      }
    });

    const unsubscribeConversationReported = onConversationReported((event) => {
      if (event.conversationId === conversationId && conversation) {
        setConversation({
          ...conversation,
          acceptanceStatus: 'reported',
          reportedAt: new Date().toISOString(),
          reportedBy: event.reportedBy,
        });
      }
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageSent();
      unsubscribeMessageStatus();
      unsubscribeMessageDeleted();
      unsubscribeTyping();
      unsubscribeStoppedTyping();
      unsubscribeConversationAccepted();
      unsubscribeConversationReported();
    };
  }, [
    conversationId,
    user,
    conversation,
    onNewMessage,
    onMessageSent,
    onMessageStatus,
    onMessageDeleted,
    onTyping,
    onStoppedTyping,
    onConversationAccepted,
    onConversationReported,
    markAsRead,
  ]);

  // Auto scroll to bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      shouldAutoScrollRef.current = false;
    }
  }, [messages, optimisticMessages]);

  // Load more messages on scroll to top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore || loadingMore) return;

    if (container.scrollTop < 100) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage, true);
    }
  }, [hasMore, loadingMore, page, fetchMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Helper function to get sender name from message
  const getSenderName = (message: Message): string => {
    if (message.sender?.name) {
      return message.sender.name;
    }
    // Fallback: try to construct from participants
    const senderParticipant = conversation?.participants.find(p => p._id === message.senderId);
    if (senderParticipant?.name) {
      return senderParticipant.name;
    }
    return 'Utilisateur';
  };

  // Handle input change and typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      startTyping(conversationId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(conversationId);
    }, 3000);
  };

  // Send message (text or document with caption)
  const handleSendMessage = useCallback(async () => {
    const content = inputValue.trim();

    // Must have either content or a file to send
    if (!user || (!content && !selectedFile)) return;

    // Check if user can send messages
    if (conversation && !canSendMessage(conversation, user._id)) {
      alert('Vous ne pouvez pas envoyer plus de messages dans cette conversation.');
      return;
    }

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      stopTyping(conversationId);
    }

    // If there's a selected file, upload it with the caption
    if (selectedFile) {
      const fileToUpload = selectedFile;
      const caption = content;

      // Clear states before upload
      setSelectedFile(null);
      setInputValue('');
      setReplyToMessage(null);
      shouldAutoScrollRef.current = true;

      const success = await uploadDocumentWithMessage(fileToUpload, caption);

      if (!success) {
        // Restore states if upload failed
        setSelectedFile(fileToUpload);
        setInputValue(caption);
      } else {
        // Update local conversation message count
        if (conversation) {
          setConversation({
            ...conversation,
            messageCounts: {
              ...conversation.messageCounts,
              [user._id]: (conversation.messageCounts?.[user._id] || 0) + 1,
            },
          });
        }
      }
      return;
    }

    // Regular text message flow
    // Generate unique temporary ID for optimistic message
    const tempId = `optimistic-${Date.now()}-${Math.random()}`;

    const tempMessage: Message = {
      _id: tempId,
      conversationId,
      senderId: user._id,
      sender: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
      },
      type: 'text',
      content,
      status: 'sent',
      readBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyTo: replyToMessage ? {
        messageId: replyToMessage._id,
        content: replyToMessage.content,
        senderId: replyToMessage.senderId,
        senderName: getSenderName(replyToMessage),
        type: replyToMessage.type,
      } : undefined,
    };

    // Optimistic update - add to existing optimistic messages instead of replacing
    setOptimisticMessages(prev => [...prev, tempMessage]);
    setInputValue('');
    setReplyToMessage(null);
    shouldAutoScrollRef.current = true;

    try {
      // Send via API
      const response = await sbcApiService.sendMessage(conversationId, content, replyToMessage?._id);

      // Clear the optimistic message immediately after successful send
      setOptimisticMessages(prev => prev.filter(m => m._id !== tempId));

      // Add the real message from API response
      if (response.body.success && response.body.data) {
        const realMessage = response.body.data as Message;
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          if (prev.some(m => m._id === realMessage._id)) return prev;
          return [...prev, realMessage];
        });
      }

      // Update local conversation message count
      if (conversation && user) {
        setConversation({
          ...conversation,
          messageCounts: {
            ...conversation.messageCounts,
            [user._id]: (conversation.messageCounts?.[user._id] || 0) + 1,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the failed optimistic message
      setOptimisticMessages(prev => prev.filter(m => m._id !== tempId));
      // Restore input
      setInputValue(content);
    }
  }, [inputValue, selectedFile, conversationId, user, replyToMessage, isTyping, stopTyping, conversation]);

  // Handle document selection (just store the file, don't upload yet)
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF, DOC, DOCX, etc.)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Type de fichier non supporté. Veuillez sélectionner un PDF ou un document Word/Excel.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximale : 10MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Store the file for later upload when send is clicked
    setSelectedFile(file);

    // Clear file input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove selected file
  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
  };

  // Upload document with message
  const uploadDocumentWithMessage = async (file: File, caption: string) => {
    try {
      setUploadingDocument(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Send document with optional caption (text message)
      const response = await sbcApiService.sendDocument(conversationId, file, caption || undefined);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.body.success) {
        // Add the message from API response immediately for real-time display
        if (response.body.data) {
          const newMessage = response.body.data as Message;
          setMessages(prev => {
            // Avoid duplicates (socket might also send this message)
            if (prev.some(m => m._id === newMessage._id)) return prev;
            return [...prev, newMessage];
          });
        }
        shouldAutoScrollRef.current = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Échec de l\'envoi du document. Veuillez réessayer.');
      return false;
    } finally {
      setUploadingDocument(false);
      setUploadProgress(0);
    }
  };

  // Get file icon based on type
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return '📄';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return '📝';
    } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
      return '📊';
    }
    return '📎';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Long press handlers
  const handleLongPressStart = (messageId: string) => {
    if (selectionMode) return;

    longPressTimerRef.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedMessages(new Set([messageId]));
    }, longPressDurationMs);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Message click handler
  const handleMessageClick = (message: Message) => {
    if (selectionMode) {
      toggleMessageSelection(message._id);
    } else {
      // Show reply option
      setReplyToMessage(message);
    }
  };

  // Toggle message selection
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const updated = new Set(prev);
      if (updated.has(messageId)) {
        updated.delete(messageId);
      } else {
        updated.add(messageId);
      }
      return updated;
    });
  };

  // Auto-exit selection mode when no items are selected
  useEffect(() => {
    if (selectionMode && selectedMessages.size === 0) {
      setSelectionMode(false);
    }
  }, [selectedMessages.size, selectionMode]);

  // Exit selection mode
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
  };

  // Handle reply from selection
  const handleReplyFromSelection = () => {
    if (selectedMessages.size === 1) {
      const messageId = Array.from(selectedMessages)[0];
      const message = messages.find(m => m._id === messageId);
      if (message) {
        setReplyToMessage(message);
        exitSelectionMode();
      }
    }
  };

  // Handle forward
  const handleForwardClick = async () => {
    if (selectedMessages.size === 0) return;

    // Fetch conversations for forward modal
    try {
      const response = await sbcApiService.getConversations(1, 100);
      if (response.body.success && response.body.data) {
        setConversations((response.body.data as Conversation[]).filter(c => c._id !== conversationId));
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }

    setForwardModal({
      messageIds: Array.from(selectedMessages),
      isOpen: true,
    });
  };

  // Confirm forward
  const confirmForward = async () => {
    if (selectedConversations.size === 0) return;

    try {
      await sbcApiService.forwardMessages(
        forwardModal.messageIds,
        Array.from(selectedConversations)
      );

      setForwardModal({ messageIds: [], isOpen: false });
      setSelectedConversations(new Set());
      exitSelectionMode();
    } catch (error) {
      console.error('Failed to forward messages:', error);
      alert('Échec du transfert des messages. Veuillez réessayer.');
    }
  };

  // Handle profile click
  const handleProfileClick = async () => {
    if (!conversation || !user) return;

    // Get the other participant
    const otherParticipant = conversation.participants.find(p => p._id !== user._id);
    if (!otherParticipant) return;

    setShowProfileModal(true);
    setLoadingProfile(true);

    try {
      const response = await sbcApiService.getUserProfileById(otherParticipant._id);
      if (response.body.success && response.body.data) {
        setOtherUserProfile(response.body.data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Conversation acceptance handlers
  const handleAcceptConversation = async () => {
    if (!conversation || !user) return;

    try {
      await sbcApiService.acceptConversation(conversation._id);

      // Update conversation status
      setConversation({
        ...conversation,
        acceptanceStatus: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      alert('Conversation acceptée');
    } catch (error) {
      console.error('Failed to accept conversation:', error);
      alert('Échec de l\'acceptation de la conversation. Veuillez réessayer.');
    }
  };

  const handleReportConversation = async () => {
    if (!conversation || !user) return;

    if (!confirm('Êtes-vous sûr de vouloir signaler cette conversation ?')) {
      return;
    }

    try {
      await sbcApiService.reportConversation(conversation._id);

      // Update conversation status
      setConversation({
        ...conversation,
        acceptanceStatus: 'reported',
        reportedAt: new Date().toISOString(),
        reportedBy: user._id,
      });

      alert('Conversation signalée');
    } catch (error) {
      console.error('Failed to report conversation:', error);
      alert('Échec du signalement de la conversation. Veuillez réessayer.');
    }
  };

  // Swipe to reply handlers
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, messageId: string) => {
    if (selectionMode) return;

    const touch = 'touches' in e ? e.touches[0] : e;
    swipeStartX.current = touch.clientX;
    swipeStartY.current = touch.clientY;
    isSwiping.current = false;
    hasVibrated.current = false;
    setSwipedMessageId(messageId);
  };

  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!swipedMessageId || selectionMode) return;

    const touch = 'touches' in e ? e.touches[0] : e;
    const deltaX = touch.clientX - swipeStartX.current;
    const deltaY = touch.clientY - swipeStartY.current;

    // Only allow horizontal swipe to the right
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Vertical scroll, cancel swipe
      if (!isSwiping.current) {
        setSwipedMessageId(null);
        setSwipeOffset(0);
      }
      return;
    }

    if (deltaX > 0 && deltaX < 150) {
      isSwiping.current = true;
      setSwipeOffset(deltaX);

      // Haptic feedback when threshold is reached (only once)
      if (deltaX >= swipeThreshold && !hasVibrated.current && 'vibrate' in navigator) {
        navigator.vibrate(10); // Short vibration
        hasVibrated.current = true;
      }
    }
  };

  const handleSwipeEnd = () => {
    if (!swipedMessageId) return;

    const message = messages.find(m => m._id === swipedMessageId);

    if (swipeOffset >= swipeThreshold && message) {
      // Trigger reply
      setReplyToMessage(message);
      // Highlight the message briefly
      setHighlightedMessageId(message._id);
      setTimeout(() => setHighlightedMessageId(null), 800);
      // Stronger haptic feedback on successful swipe
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }

    // Reset swipe state
    setSwipedMessageId(null);
    setSwipeOffset(0);
    isSwiping.current = false;
    hasVibrated.current = false;
  };

  // Handle copy
  const handleCopy = () => {
    const selectedMessagesData = messages.filter(m => selectedMessages.has(m._id));
    const textToCopy = selectedMessagesData
      .map(m => `${m.sender?.name}: ${m.content}`)
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    exitSelectionMode();
  };

  // Handle delete
  const handleDeleteClick = () => {
    if (selectedMessages.size > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = async () => {
    try {
      const messageIds = Array.from(selectedMessages);

      // Optimistic update
      setMessages(prev => prev.filter(m => !selectedMessages.has(m._id)));

      // API call
      if (messageIds.length === 1) {
        await sbcApiService.deleteMessage(messageIds[0]);
      } else {
        await sbcApiService.bulkDeleteMessages(messageIds);
      }

      exitSelectionMode();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete messages:', error);
      // Refresh on error
      fetchMessages(1, false);
    }
  };

  // Format date header
  const formatDateHeader = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      if (isToday(date)) {
        return "Aujourd'hui";
      } else if (isYesterday(date)) {
        return 'Hier';
      } else {
        return format(date, 'd MMM yyyy', { locale: fr });
      }
    } catch {
      return '';
    }
  };

  // Group messages by date
  const messageGroups: MessageGroup[] = useMemo(() => {
    const allMessages = [...messages, ...optimisticMessages];
    const groups: Record<string, Message[]> = {};

    allMessages.forEach(message => {
      const date = message.createdAt;
      const dateKey = formatDateHeader(date);

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages: messages.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }));
  }, [messages, optimisticMessages]);

  // Format message time
  const formatMessageTime = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  // Get message status icon
  const getMessageStatusIcon = (message: Message) => {
    if (message.senderId !== user?._id) return null;

    // Show loading spinner for optimistic (pending) messages
    const isOptimisticMessage = message._id.startsWith('optimistic-');
    if (isOptimisticMessage) {
      return (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }

    if (message.status === 'read' || message.readBy.length > 1) {
      return <CheckIconSolid className="w-4 h-4 text-blue-500" />;
    } else if (message.status === 'delivered') {
      return (
        <div className="flex -space-x-1">
          <CheckIcon className="w-4 h-4 text-gray-500" />
          <CheckIcon className="w-4 h-4 text-gray-500" />
        </div>
      );
    } else {
      return <CheckIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get document URL (prefer signed URL, fallback to regular URL, check refresh cache)
  const getDocumentUrl = useCallback((message: Message): string | undefined => {
    // First check if we have a refreshed URL cached
    const refreshedUrl = refreshedDocumentUrls.get(message._id);
    if (refreshedUrl) {
      return refreshedUrl;
    }
    // Prefer signed URL, fallback to regular URL
    return message.documentSignedUrl || message.documentUrl;
  }, [refreshedDocumentUrls]);

  // Refresh document URL when it expires
  const refreshDocumentUrl = useCallback(async (messageId: string) => {
    try {
      const response = await sbcApiService.refreshDocumentUrl(messageId);
      if (response.body?.success && response.body?.data?.signedUrl) {
        setRefreshedDocumentUrls(prev => {
          const newMap = new Map(prev);
          newMap.set(messageId, response.body.data.signedUrl);
          return newMap;
        });
        return response.body.data.signedUrl;
      }
    } catch (error) {
      console.error('Failed to refresh document URL:', error);
    }
    return null;
  }, []);

  // Handle document download with URL refresh on error
  const handleDocumentDownload = useCallback(async (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    e.stopPropagation();

    let url = getDocumentUrl(message);
    if (!url) return;

    try {
      // Try to fetch the document
      const response = await fetch(url, { method: 'HEAD' });

      // If URL expired (403/401), refresh it
      if (response.status === 403 || response.status === 401) {
        const newUrl = await refreshDocumentUrl(message._id);
        if (newUrl) {
          url = newUrl;
        } else {
          console.error('Failed to refresh expired document URL');
          return;
        }
      }

      // Open the document
      window.open(url, '_blank');
    } catch {
      // If fetch fails, try to refresh and open
      const newUrl = await refreshDocumentUrl(message._id);
      if (newUrl) {
        window.open(newUrl, '_blank');
      }
    }
  }, [getDocumentUrl, refreshDocumentUrl]);

  // Render message content
  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'text':
        return <p className="break-words whitespace-pre-wrap">{message.content}</p>;

      case 'document':
        const documentUrl = getDocumentUrl(message);
        const isSentMessage = message.senderId === user?._id;
        return (
          <div className="space-y-2">
            {/* Caption/text message if present */}
            {message.content && message.content !== message.documentName && (
              <p className="break-words whitespace-pre-wrap">{message.content}</p>
            )}
            {/* Document attachment */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              isSentMessage
                ? 'bg-blue-500 bg-opacity-40'
                : 'bg-gray-300 bg-opacity-50'
            }`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                isSentMessage
                  ? 'bg-blue-400 bg-opacity-50'
                  : 'bg-gray-400 bg-opacity-50'
              }`}>
                <PaperClipIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{message.documentName || 'Document'}</p>
                {message.documentSize && (
                  <p className="text-xs opacity-80">
                    {(message.documentSize / 1024).toFixed(0)} KB
                  </p>
                )}
              </div>
              {documentUrl && (
                <button
                  onClick={(e) => handleDocumentDownload(e, message)}
                  className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                    isSentMessage
                      ? 'hover:bg-blue-400 hover:bg-opacity-40'
                      : 'hover:bg-gray-400 hover:bg-opacity-40'
                  }`}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-500 italic">{message.content}</p>
          </div>
        );

      default:
        return <p>{message.content}</p>;
    }
  };

  // Render message
  const renderMessage = (message: Message) => {
    const isSent = message.senderId === user?._id;
    const isOptimistic = message._id.startsWith('optimistic-');
    const isSelected = selectedMessages.has(message._id);

    if (message.type === 'system') {
      return (
        <div key={message._id} className="flex justify-center my-2">
          {renderMessageContent(message)}
        </div>
      );
    }

    const isBeingSwiped = swipedMessageId === message._id;
    const isHighlighted = highlightedMessageId === message._id;
    const swipeTransform = isBeingSwiped ? `translateX(${swipeOffset}px)` : '';
    const swipeOpacity = isBeingSwiped ? Math.min(swipeOffset / swipeThreshold, 1) : 0;

    return (
      <div
        key={message._id}
        ref={(el) => {
          if (el) {
            messageRefs.current.set(message._id, el);
          } else {
            messageRefs.current.delete(message._id);
          }
        }}
        className={`flex items-end gap-2 mb-4 ${isSent ? 'flex-row-reverse' : 'flex-row'} relative ${
          isHighlighted ? 'animate-pulse' : ''
        }`}
        onMouseDown={(e) => {
          if (!selectionMode) {
            handleLongPressStart(message._id);
            handleSwipeStart(e, message._id);
          }
        }}
        onMouseUp={() => {
          handleLongPressEnd();
          handleSwipeEnd();
        }}
        onMouseMove={handleSwipeMove}
        onMouseLeave={() => {
          handleLongPressEnd();
          handleSwipeEnd();
        }}
        onTouchStart={(e) => {
          if (!selectionMode) {
            handleLongPressStart(message._id);
            handleSwipeStart(e, message._id);
          }
        }}
        onTouchMove={handleSwipeMove}
        onTouchEnd={() => {
          handleLongPressEnd();
          handleSwipeEnd();
        }}
        onClick={() => handleMessageClick(message)}
        style={{
          transform: swipeTransform,
          transition: isBeingSwiped ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Reply icon (shown during swipe) */}
        {isBeingSwiped && (
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{
              opacity: swipeOpacity,
              transition: 'opacity 0.1s ease-out',
            }}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              swipeOffset >= swipeThreshold ? 'bg-blue-600' : 'bg-gray-400'
            }`}>
              <ArrowUturnLeftIcon className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Checkbox in selection mode */}
        {selectionMode && (
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
            }`}
          >
            {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
          </div>
        )}

        {/* Avatar (for received messages) */}
        {!isSent && !selectionMode && (
          <div className="flex-shrink-0">
            <img
              src={message.sender?.avatar || '/default-avatar.png'}
              alt={message.sender?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
        )}

        {/* Message bubble */}
        <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
          {/* Sender name (for received messages) */}
          {!isSent && (
            <span className="text-xs text-gray-500 mb-1 ml-2">
              {message.sender?.name || 'Utilisateur'}
            </span>
          )}

          {/* Reply preview */}
          {message.replyTo && (
            <button
              onClick={() => scrollToMessage(message.replyTo!.messageId)}
              className={`mb-1 px-3 py-2 rounded-lg text-xs text-left w-full hover:opacity-80 transition-opacity ${
                isSent ? 'bg-blue-500 bg-opacity-30' : 'bg-gray-200'
              }`}
            >
              <p className="font-medium opacity-80">{message.replyTo.senderName}</p>
              <p className="opacity-70 truncate">{message.replyTo.content}</p>
            </button>
          )}

          {/* Message content */}
          <div
            className={`px-4 py-2 rounded-2xl ${
              isSent
                ? isOptimistic
                  ? 'bg-blue-500 text-white rounded-br-md opacity-80'
                  : 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-200 text-gray-900 rounded-bl-md'
            } ${
              isHighlighted ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
            }`}
            style={{
              transition: 'all 0.3s ease-out',
            }}
          >
            {renderMessageContent(message)}

            {/* Time and status */}
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              isSent ? 'text-blue-100' : 'text-gray-500'
            }`}>
              <span>{formatMessageTime(message.createdAt)}</span>
              {getMessageStatusIcon(message)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Scroll to a specific message
  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 1500);
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  // Get conversation display name - exclude current user
  const getConversationName = () => {
    if (!conversation) return 'Chat';
    const otherParticipants = conversation.participants.filter(p => p._id !== user?._id);
    if (otherParticipants.length === 0) {
      return conversation.participants.map(p => p.name).join(', ');
    }
    return otherParticipants.map(p => p.name).join(', ');
  };

  // Get conversation avatar - exclude current user
  const getConversationAvatar = () => {
    if (!conversation) return undefined;
    const otherParticipant = conversation.participants.find(p => p._id !== user?._id);
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

  // Check if other participant is online
  const isOtherParticipantOnline = (): boolean => {
    if (!conversation) return false;
    return conversation.participants.some(p => p._id !== user?._id && p.isOnline);
  };

  // Loading state
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header skeleton */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Skeleton width="w-10" height="h-10" rounded="rounded-full" />
            <div className="flex-1">
              <Skeleton width="w-32" height="h-5" className="mb-1" />
              <Skeleton width="w-20" height="h-3" />
            </div>
          </div>
        </div>

        {/* Messages skeleton */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
              <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
              <div className="max-w-[70%]">
                <Skeleton width="w-48" height="h-16" rounded="rounded-2xl" />
              </div>
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
        <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
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
                  {selectedMessages.size} sélectionné{selectedMessages.size > 1 ? 's' : ''}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {selectedMessages.size === 1 && (
                  <button
                    onClick={handleReplyFromSelection}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Répondre"
                  >
                    <ArrowUturnLeftIcon className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleForwardClick}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Transférer"
                >
                  <ArrowUturnRightIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Copier"
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDeleteClick}
                  disabled={selectedMessages.size === 0}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                  title="Supprimer"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            // Normal header
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
                >
                  <ArrowUturnLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
              )}

              {conversation && (
                <>
                  <button
                    onClick={handleProfileClick}
                    className="relative hover:opacity-80 transition-opacity"
                  >
                    {getConversationAvatar() ? (
                      <img
                        src={getConversationAvatar()}
                        alt={getConversationName()}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(getConversationName())}`}>
                        {getInitials(getConversationName())}
                      </div>
                    )}
                    {isOtherParticipantOnline() && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">
                      {getConversationName()}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {isOtherParticipantOnline() ? 'En ligne' : 'Hors ligne'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Acceptance Bar (for recipients) */}
        {conversation && user && needsAcceptance(conversation, user._id) && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-yellow-800">
                  Cet utilisateur souhaite démarrer une conversation avec vous
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptConversation}
                  className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Accepter
                </button>
                <button
                  onClick={handleReportConversation}
                  className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Signaler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Initiator Waiting Bar - shown when initiator is waiting for recipient to accept */}
        {conversation && user && isInitiator(conversation, user._id) && conversation.acceptanceStatus === 'pending' && (
          <div className={`border-b p-3 ${hasReachedMessageLimit(conversation, user._id) ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center gap-2">
              {hasReachedMessageLimit(conversation, user._id) ? (
                <>
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-orange-800">
                    En attente de réponse du destinataire. Vous ne pouvez plus envoyer de messages tant que cette personne n'a pas accepté la conversation.
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-800">
                    Conversation en attente d'acceptation. Vous pouvez envoyer {getRemainingMessages(conversation, user._id)} message{getRemainingMessages(conversation, user._id) > 1 ? 's' : ''} de plus.
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Reported/Blocked Status */}
        {conversation && (conversation.acceptanceStatus === 'reported' || conversation.acceptanceStatus === 'blocked') && (
          <div className="bg-red-50 border-b border-red-200 p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-red-800">
                {conversation.acceptanceStatus === 'reported' ? 'Cette conversation a été signalée' : 'Cette conversation est bloquée'}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex justify-center mb-4">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Message groups */}
          {messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex justify-center my-4">
                <div className="px-3 py-1 bg-gray-300 bg-opacity-50 rounded-full">
                  <span className="text-xs font-medium text-gray-700">{group.date}</span>
                </div>
              </div>

              {/* Messages */}
              {group.messages.map((message) => (
                <React.Fragment key={message._id}>
                  {renderMessage(message)}
                </React.Fragment>
              ))}
            </div>
          ))}

          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="flex items-end gap-2 mb-4">
              <div className="flex-shrink-0">
                {getConversationAvatar() ? (
                  <img
                    src={getConversationAvatar()}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${getAvatarColor(getConversationName())}`}>
                    {getInitials(getConversationName())}
                  </div>
                )}
              </div>
              <div className="px-4 py-2 bg-gray-200 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Array.from(typingUsers)[0]} est en train d'écrire...
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-white border-t border-gray-200">
          {/* Selected file preview */}
          {selectedFile && !uploadingDocument && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{getFileIcon(selectedFile.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveSelectedFile}
                className="p-1.5 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}

          {/* Reply preview */}
          {replyToMessage && (
            <div className="mb-3 p-3 bg-gray-100 rounded-lg flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-600">
                  Répondre à {replyToMessage.sender?.name}
                </p>
                <p className="text-sm text-gray-600 truncate">{replyToMessage.content}</p>
              </div>
              <button
                onClick={() => setReplyToMessage(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}

          {/* Upload progress */}
          {uploadingDocument && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Envoi du document...
                </span>
                <span className="text-sm text-blue-700">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2">
            {/* Document upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleDocumentSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDocument}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <PaperClipIcon className="w-6 h-6" />
            </button>

            {/* Text input */}
            <textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                conversation && user && !canSendMessage(conversation, user._id)
                  ? "Vous ne pouvez pas envoyer de messages dans cette conversation"
                  : selectedFile
                    ? "Ajouter un message (optionnel)..."
                    : "Écrivez un message..."
              }
              rows={1}
              disabled={conversation && user ? !canSendMessage(conversation, user._id) : false}
              className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                minHeight: '40px',
                maxHeight: '128px',
                overflowY: inputValue.split('\n').length > 3 ? 'auto' : 'hidden',
              }}
            />

            {/* Send button */}
            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !selectedFile) || uploadingDocument || (conversation && user ? !canSendMessage(conversation, user._id) : false)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Forward Modal */}
      {forwardModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Transférer à
                </h2>
                <button
                  onClick={() => {
                    setForwardModal({ messageIds: [], isOpen: false });
                    setSelectedConversations(new Set());
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => {
                    setSelectedConversations(prev => {
                      const updated = new Set(prev);
                      if (updated.has(conv._id)) {
                        updated.delete(conv._id);
                      } else {
                        updated.add(conv._id);
                      }
                      return updated;
                    });
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
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

                  {(() => {
                    const otherParticipant = conv.participants.find(p => p._id !== user?._id);
                    const name = otherParticipant?.name || conv.participants.map(p => p.name).join(', ');
                    return (
                      <>
                        {otherParticipant?.avatar ? (
                          <img
                            src={otherParticipant.avatar}
                            alt={name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(name)}`}>
                            {getInitials(name)}
                          </div>
                        )}

                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">
                            {name}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={confirmForward}
                disabled={selectedConversations.size === 0}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transférer ({selectedConversations.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Supprimer {selectedMessages.size > 1 ? 'les messages' : 'le message'} ?
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedMessages.size > 1
                ? `Êtes-vous sûr de vouloir supprimer ces ${selectedMessages.size} messages ? Cette action est irréversible.`
                : 'Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Supprimer
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
              ) : otherUserProfile ? (
                <div className="space-y-6">
                  {/* Avatar and Name */}
                  <div className="flex flex-col items-center">
                    {otherUserProfile.avatar ? (
                      <img
                        src={otherUserProfile.avatar}
                        alt={otherUserProfile.name || `${otherUserProfile.firstName} ${otherUserProfile.lastName}`}
                        className="w-24 h-24 rounded-full object-cover mb-3"
                      />
                    ) : (
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3 ${getAvatarColor(otherUserProfile.name || `${otherUserProfile.firstName} ${otherUserProfile.lastName}`)}`}>
                        {getInitials(otherUserProfile.name || `${otherUserProfile.firstName} ${otherUserProfile.lastName}`)}
                      </div>
                    )}
                    <h4 className="text-xl font-bold text-gray-900 text-center">
                      {otherUserProfile.name || `${otherUserProfile.firstName} ${otherUserProfile.lastName}`}
                    </h4>
                    {isOtherParticipantOnline() && (
                      <span className="text-sm text-green-600 font-medium mt-1">En ligne</span>
                    )}
                  </div>

                  {/* Information Cards */}
                  <div className="space-y-3">
                    {/* Email */}
                    {otherUserProfile.email && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Email</p>
                            <p className="text-sm text-gray-900">{otherUserProfile.email}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phone */}
                    {otherUserProfile.phoneNumber && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Téléphone</p>
                            <p className="text-sm text-gray-900">{otherUserProfile.phoneNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Member Since */}
                    {otherUserProfile.createdAt && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Membre depuis</p>
                            <p className="text-sm text-gray-900">
                              {format(parseISO(otherUserProfile.createdAt), 'dd MMMM yyyy', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subscription Type */}
                    {otherUserProfile.subscriptionType && (
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-blue-600 font-medium">Type d'abonnement</p>
                            <p className="text-sm text-gray-900 font-semibold capitalize">
                              {otherUserProfile.subscriptionType}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Language */}
                    {otherUserProfile.language && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Langue</p>
                            <p className="text-sm text-gray-900 capitalize">{otherUserProfile.language}</p>
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
    </>
  );
};
