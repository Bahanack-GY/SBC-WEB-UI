import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type {
  Message,
  Status,
  TypingEvent,
  MessageStatusEvent,
  MessageDeletedEvent,
  UserPresenceEvent,
  SocketError,
  ConversationAcceptedEvent,
  ConversationReportedEvent,
} from '../types/chat';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;

  // Chat methods
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string, type: 'text', replyToId?: string) => void;
  markAsRead: (conversationId: string, messageIds?: string[]) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;

  // Status methods
  subscribeToStatuses: (categories?: string[]) => void;
  unsubscribeFromStatuses: () => void;
  likeStatus: (statusId: string) => void;
  unlikeStatus: (statusId: string) => void;
  repostStatus: (statusId: string) => void;
  viewStatus: (statusId: string) => void;

  // Event listeners
  onNewMessage: (callback: (message: Message) => void) => () => void;
  onMessageSent: (callback: (message: Message) => void) => () => void;
  onMessageStatus: (callback: (event: MessageStatusEvent) => void) => () => void;
  onMessageDeleted: (callback: (event: MessageDeletedEvent) => void) => () => void;
  onTyping: (callback: (event: TypingEvent) => void) => () => void;
  onStoppedTyping: (callback: (event: TypingEvent) => void) => () => void;
  onNewStatus: (callback: (status: Status) => void) => () => void;
  onStatusUpdated: (callback: (status: Status) => void) => () => void;
  onStatusDeleted: (callback: (event: { statusId: string }) => void) => () => void;
  onUserOnline: (callback: (event: UserPresenceEvent) => void) => () => void;
  onUserOffline: (callback: (event: UserPresenceEvent) => void) => () => void;
  onConversationAccepted: (callback: (event: ConversationAcceptedEvent) => void) => () => void;
  onConversationReported: (callback: (event: ConversationReportedEvent) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Get socket URL from environment or use default
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Presence events
    newSocket.on('user:online', ({ userId }: UserPresenceEvent) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    newSocket.on('user:offline', ({ userId }: UserPresenceEvent) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    // Error handling
    newSocket.on('error', ({ message, code }: SocketError) => {
      console.error('Socket error:', code, message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user, SOCKET_URL]);

  // Chat methods
  const joinConversation = useCallback((conversationId: string) => {
    socket?.emit('conversation:join', conversationId);
  }, [socket]);

  const leaveConversation = useCallback((conversationId: string) => {
    socket?.emit('conversation:leave', conversationId);
  }, [socket]);

  const sendMessage = useCallback((conversationId: string, content: string, type: 'text' = 'text', replyToId?: string) => {
    socket?.emit('message:send', {
      conversationId,
      content,
      type,
      replyToId,
    });
  }, [socket]);

  const markAsRead = useCallback((conversationId: string, messageIds?: string[]) => {
    socket?.emit('message:read', {
      conversationId,
      messageIds,
    });
  }, [socket]);

  const startTyping = useCallback((conversationId: string) => {
    socket?.emit('typing:start', conversationId);
  }, [socket]);

  const stopTyping = useCallback((conversationId: string) => {
    socket?.emit('typing:stop', conversationId);
  }, [socket]);

  // Status methods
  const subscribeToStatuses = useCallback((categories?: string[]) => {
    socket?.emit('status:subscribe', categories);
  }, [socket]);

  const unsubscribeFromStatuses = useCallback(() => {
    socket?.emit('status:unsubscribe');
  }, [socket]);

  const likeStatus = useCallback((statusId: string) => {
    socket?.emit('status:like', statusId);
  }, [socket]);

  const unlikeStatus = useCallback((statusId: string) => {
    socket?.emit('status:unlike', statusId);
  }, [socket]);

  const repostStatus = useCallback((statusId: string) => {
    socket?.emit('status:repost', statusId);
  }, [socket]);

  const viewStatus = useCallback((statusId: string) => {
    socket?.emit('status:view', statusId);
  }, [socket]);

  // Event listeners (return cleanup functions)
  const onNewMessage = useCallback((callback: (message: Message) => void) => {
    socket?.on('message:new', callback);
    return () => { socket?.off('message:new', callback); };
  }, [socket]);

  const onMessageSent = useCallback((callback: (message: Message) => void) => {
    socket?.on('message:sent', callback);
    return () => { socket?.off('message:sent', callback); };
  }, [socket]);

  const onMessageStatus = useCallback((callback: (event: MessageStatusEvent) => void) => {
    socket?.on('message:status', callback);
    return () => { socket?.off('message:status', callback); };
  }, [socket]);

  const onMessageDeleted = useCallback((callback: (event: MessageDeletedEvent) => void) => {
    socket?.on('message:deleted', callback);
    return () => { socket?.off('message:deleted', callback); };
  }, [socket]);

  const onTyping = useCallback((callback: (event: TypingEvent) => void) => {
    socket?.on('user:typing', callback);
    return () => { socket?.off('user:typing', callback); };
  }, [socket]);

  const onStoppedTyping = useCallback((callback: (event: TypingEvent) => void) => {
    socket?.on('user:stopped_typing', callback);
    return () => { socket?.off('user:stopped_typing', callback); };
  }, [socket]);

  const onNewStatus = useCallback((callback: (status: Status) => void) => {
    socket?.on('status:new', callback);
    return () => { socket?.off('status:new', callback); };
  }, [socket]);

  const onStatusUpdated = useCallback((callback: (status: Status) => void) => {
    socket?.on('status:updated', callback);
    return () => { socket?.off('status:updated', callback); };
  }, [socket]);

  const onStatusDeleted = useCallback((callback: (event: { statusId: string }) => void) => {
    socket?.on('status:deleted', callback);
    return () => { socket?.off('status:deleted', callback); };
  }, [socket]);

  const onUserOnline = useCallback((callback: (event: UserPresenceEvent) => void) => {
    socket?.on('user:online', callback);
    return () => { socket?.off('user:online', callback); };
  }, [socket]);

  const onUserOffline = useCallback((callback: (event: UserPresenceEvent) => void) => {
    socket?.on('user:offline', callback);
    return () => { socket?.off('user:offline', callback); };
  }, [socket]);

  const onConversationAccepted = useCallback((callback: (event: ConversationAcceptedEvent) => void) => {
    socket?.on('conversation:accepted', callback);
    return () => { socket?.off('conversation:accepted', callback); };
  }, [socket]);

  const onConversationReported = useCallback((callback: (event: ConversationReportedEvent) => void) => {
    socket?.on('conversation:reported', callback);
    return () => { socket?.off('conversation:reported', callback); };
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    subscribeToStatuses,
    unsubscribeFromStatuses,
    likeStatus,
    unlikeStatus,
    repostStatus,
    viewStatus,
    onNewMessage,
    onMessageSent,
    onMessageStatus,
    onMessageDeleted,
    onTyping,
    onStoppedTyping,
    onNewStatus,
    onStatusUpdated,
    onStatusDeleted,
    onUserOnline,
    onUserOffline,
    onConversationAccepted,
    onConversationReported,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
