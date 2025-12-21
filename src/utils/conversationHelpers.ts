import type { Conversation } from '../types/chat';

/**
 * Check if a conversation needs acceptance from the current user
 * Returns true if the current user is the recipient and conversation is pending
 */
export const needsAcceptance = (
  conversation: Conversation,
  currentUserId: string
): boolean => {
  return (
    conversation.acceptanceStatus === 'pending' &&
    conversation.initiatorId !== currentUserId
  );
};

/**
 * Check if the current user can send messages in this conversation
 */
export const canSendMessage = (
  conversation: Conversation,
  currentUserId: string
): boolean => {
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
 * Returns Infinity if no limit applies
 */
export const getRemainingMessages = (
  conversation: Conversation,
  currentUserId: string
): number => {
  if (conversation.acceptanceStatus !== 'pending') {
    return Infinity;
  }

  const messageCount = conversation.messageCounts?.[currentUserId] || 0;
  return Math.max(0, 3 - messageCount);
};

/**
 * Check if the current user is the initiator of the conversation
 */
export const isInitiator = (
  conversation: Conversation,
  currentUserId: string
): boolean => {
  return conversation.initiatorId === currentUserId;
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
        return 'Limite de messages atteinte. En attente de réponse.';
      }
      return `Vous pouvez envoyer ${remaining} message${remaining > 1 ? 's' : ''} de plus avant que le destinataire ne réponde.`;
    } else {
      return 'Cet utilisateur souhaite démarrer une conversation avec vous';
    }
  }

  return null;
};
