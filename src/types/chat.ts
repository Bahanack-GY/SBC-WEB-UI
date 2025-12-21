// Chat & Status Service Type Definitions

export type StatusCategory =
  | 'projects_testimonials'
  | 'events_news'
  | 'needs_jobs'
  | 'business_opportunities'
  | 'culture_tourism';

export type MessageType = 'text' | 'document' | 'system' | 'ad';
export type ConversationType = 'direct' | 'status_reply';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ContentType = 'text' | 'image' | 'video' | 'flyer';
export type ConversationAcceptanceStatus = 'pending' | 'accepted' | 'reported' | 'blocked';

export interface ConversationParticipant {
  _id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
}

export interface Conversation {
  _id: string;
  type: ConversationType;
  participants: ConversationParticipant[];
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  lastMessageAt?: string;
  unreadCount: number;
  statusId?: string;
  acceptanceStatus: ConversationAcceptanceStatus;
  initiatorId?: string;
  messageCounts?: Record<string, number>;
  acceptedAt?: string;
  reportedAt?: string;
  reportedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReplyTo {
  messageId: string;
  content: string;
  senderId: string;
  senderName: string;
  type: MessageType;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  sender?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  type: MessageType;
  content: string;
  replyTo?: MessageReplyTo;
  documentUrl?: string;
  documentSignedUrl?: string;
  documentName?: string;
  documentMimeType?: string;
  documentSize?: number;
  adImageUrl?: string;
  adRedirectUrl?: string;
  adCta?: string;
  status: MessageStatus;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Status {
  _id: string;
  userId: string;
  user?: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  category: StatusCategory;
  contentType: ContentType;
  content?: string;
  textContent?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  mediaDuration?: number;
  likesCount: number;
  repostsCount: number;
  viewsCount: number;
  repliesCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isViewed: boolean;
  originalStatusId?: string;
  originalStatus?: Status;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoryGroup {
  userId: string;
  authorName: string;
  authorAvatar: string;
  statuses: Status[];
  hasUnviewed: boolean;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationMeta;
  message?: string;
  error?: string;
}

// Socket event payloads
export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName: string;
}

export interface MessageStatusEvent {
  messageId: string;
  status: MessageStatus;
  readBy: string[];
}

export interface MessageDeletedEvent {
  messageId: string;
  conversationId: string;
}

export interface UserPresenceEvent {
  userId: string;
}

export interface StatusUpdateEvent {
  statusId: string;
  likesCount?: number;
  repostsCount?: number;
  viewsCount?: number;
}

export interface ConversationAcceptedEvent {
  conversationId: string;
}

export interface ConversationReportedEvent {
  conversationId: string;
  reportedBy: string;
}

export interface SocketError {
  message: string;
  code: string;
}

// Category configurations
export const CATEGORY_CONFIG: Record<StatusCategory, { label: string; color: string; adminOnly: boolean }> = {
  projects_testimonials: {
    label: 'Projets & Témoignages',
    color: '#FFD700',
    adminOnly: true,
  },
  events_news: {
    label: 'Événements & Actualités',
    color: '#007BFF',
    adminOnly: true,
  },
  needs_jobs: {
    label: 'Besoins & Emplois',
    color: '#28A745',
    adminOnly: false,
  },
  business_opportunities: {
    label: 'Business & Opportunités',
    color: '#6F42C1',
    adminOnly: false,
  },
  culture_tourism: {
    label: 'Culture & Tourisme',
    color: '#FD7E14',
    adminOnly: false,
  },
};

// User categories (non-admin users can only post to these)
export const USER_CATEGORIES: StatusCategory[] = [
  'needs_jobs',
  'business_opportunities',
  'culture_tourism',
];
