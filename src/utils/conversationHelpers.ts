import type { Conversation } from '../types/chat';

/**
 * Check if a conversation needs acceptance from the current user
 * Returns true if the current user is the recipient and conversation is pending
 */
export const needsAcceptance = (
  conversation: Conversation,
  currentUserId: string
): boolean => {
  // Use backend-provided isInitiator if available, otherwise fall back to initiatorId check
  const userIsInitiator = conversation.isInitiator !== undefined
    ? conversation.isInitiator
    : conversation.initiatorId === currentUserId;

  return (
    conversation.acceptanceStatus === 'pending' &&
    !userIsInitiator
  );
};

/**
 * Check if the current user can send messages in this conversation
 * Uses backend-provided messagingStatus when available
 */
export const canSendMessage = (
  conversation: Conversation,
  currentUserId: string
): boolean => {
  // Use backend-provided messagingStatus if available
  if (conversation.messagingStatus !== undefined) {
    return conversation.messagingStatus.canSend;
  }

  // Fallback to local calculation
  // Cannot send messages in reported or blocked conversations
  if (
    conversation.acceptanceStatus === 'reported' ||
    conversation.acceptanceStatus === 'blocked'
  ) {
    return false;
  }

  // Can always send if accepted
  if (conversation.acceptanceStatus === 'accepted') {
    return true;
  }

  // For pending conversations, check message count
  const messageCount = conversation.messageCounts?.[currentUserId] || 0;
  return messageCount < 3;
};

/**
 * Get the number of remaining messages the user can send
 * Uses backend-provided messagingStatus when available
 * Returns Infinity if no limit applies
 */
export const getRemainingMessages = (
  conversation: Conversation,
  currentUserId: string
): number => {
  // Use backend-provided messagesRemaining if available
  if (conversation.messagingStatus?.messagesRemaining !== undefined) {
    return conversation.messagingStatus.messagesRemaining;
  }

  // Fallback to local calculation
  if (conversation.acceptanceStatus !== 'pending') {
    return Infinity;
  }

  const messageCount = conversation.messageCounts?.[currentUserId] || 0;
  return Math.max(0, 3 - messageCount);
};

/**
 * Check if the current user is the initiator of the conversation
 * Uses backend-provided isInitiator when available
 */
export const isInitiator = (
  conversation: Conversation,
  currentUserId: string
): boolean => {
  // Use backend-provided isInitiator if available
  if (conversation.isInitiator !== undefined) {
    return conversation.isInitiator;
  }
  // Fallback to initiatorId check
  return conversation.initiatorId === currentUserId;
};

/**
 * Get the messaging status reason from backend
 */
export const getMessagingStatusReason = (
  conversation: Conversation
): string | undefined => {
  return conversation.messagingStatus?.reason;
};

/**
 * Check if the initiator has reached the message limit
 */
export const hasReachedMessageLimit = (
  conversation: Conversation,
  currentUserId: string
): boolean => {
  // Use backend reason if available
  if (conversation.messagingStatus?.reason === 'pending_limit_reached') {
    return true;
  }

  // Fallback to checking if remaining is 0
  return (
    conversation.acceptanceStatus === 'pending' &&
    isInitiator(conversation, currentUserId) &&
    getRemainingMessages(conversation, currentUserId) === 0
  );
};

/**
 * Get a user-friendly status message for the conversation
 */
export const getConversationStatusMessage = (
  conversation: Conversation,
  currentUserId: string
): string | null => {
  if (conversation.acceptanceStatus === 'reported') {
    return 'Cette conversation a été signalée';
  }

  if (conversation.acceptanceStatus === 'blocked') {
    return 'Cette conversation est bloquée';
  }

  if (conversation.acceptanceStatus === 'pending') {
    if (isInitiator(conversation, currentUserId)) {
      const remaining = getRemainingMessages(conversation, currentUserId);
      if (remaining === 0) {
        return 'Limite de messages atteinte. En attente de réponse du destinataire.';
      }
      return `Vous pouvez envoyer ${remaining} message${remaining > 1 ? 's' : ''} de plus avant que le destinataire ne réponde.`;
    } else {
      return 'Cet utilisateur souhaite démarrer une conversation avec vous';
    }
  }

  return null;
};
