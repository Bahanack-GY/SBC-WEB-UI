/**
 * Relance Feature TypeScript Type Definitions
 * WhatsApp-based automated campaign follow-up system for unpaid referrals
 */

/**
 * WhatsApp connection status
 */
export type WhatsAppStatus = 'connected' | 'disconnected' | 'expired';

/**
 * Campaign type
 */
export type CampaignType = 'default' | 'filtered';

/**
 * Campaign status
 */
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';

/**
 * Relance target status
 */
export type RelanceTargetStatus = 'active' | 'completed' | 'paused' | 'exited';

/**
 * Exit reason for referral leaving the loop
 */
export type ExitReason = 'paid' | 'completed_7days' | 'manual' | 'referrer_inactive' | 'campaign_cancelled';

/**
 * Message delivery status
 */
export type MessageDeliveryStatus = 'delivered' | 'failed';

/**
 * Supported languages for messages
 */
export type RelanceLanguage = 'fr' | 'en';

/**
 * Message delivery record
 */
export interface MessageDelivery {
  day: number; // 1-7
  sentAt: string; // ISO date
  status: MessageDeliveryStatus;
  errorMessage?: string; // If failed
}

/**
 * Relance configuration (user settings)
 */
export interface RelanceConfig {
  _id: string;
  userId: string; // SBC member ID
  enabled: boolean; // Master switch
  enrollmentPaused: boolean; // Pause new enrollments only
  sendingPaused: boolean; // Pause sending only
  whatsappAuthData?: string; // Encrypted session (backend only)
  whatsappStatus: WhatsAppStatus;
  lastQrScanDate?: string; // ISO date
  lastConnectionCheck?: string; // ISO date
  messagesSentToday: number; // Rate limiting counter
  lastResetDate: string; // ISO date
  createdAt: string;
  updatedAt: string;
}

/**
 * Relance target (referral in campaign)
 */
export interface RelanceTarget {
  _id: string;
  referralUserId: string | { _id: string; name: string; email: string }; // Can be populated
  referrerUserId: string; // Your user ID
  campaignId: string; // Campaign this target belongs to
  enteredLoopAt: string; // ISO date
  currentDay: number; // 1-7
  nextMessageDue: string; // ISO date
  lastMessageSentAt?: string; // ISO date
  messagesDelivered: MessageDelivery[];
  exitedLoopAt?: string; // ISO date (if exited)
  exitReason?: ExitReason;
  status: RelanceTargetStatus;
  language: RelanceLanguage;
  createdAt: string;
  updatedAt: string;
}

/**
 * Relance status response
 */
export interface RelanceStatus {
  whatsappStatus: WhatsAppStatus;
  enabled: boolean;
  enrollmentPaused: boolean;
  sendingPaused: boolean;
  defaultCampaignPaused: boolean;
  allowSimultaneousCampaigns: boolean;
  messagesSentToday: number;
  maxMessagesPerDay: number;
  maxTargetsPerCampaign: number;
  lastQrScanDate?: string;
  lastConnectionCheck?: string;
  connectionFailureCount: number; // 0-3, session deleted after 3
  lastConnectionFailure?: string | null; // null if no recent failures
}

/**
 * QR code connection response
 */
export interface RelanceConnectResponse {
  qr: string; // Base64 QR code image
}

/**
 * Campaign filter options
 */
export interface CampaignFilter {
  // Primary filters
  countries?: string[];
  registrationDateFrom?: string; // ISO date string
  registrationDateTo?: string; // ISO date string
  subscriptionStatus?: 'subscribed' | 'non-subscribed' | 'all';

  // Additional filters (optional)
  hasUnpaidReferrals?: boolean;
  excludeCurrentTargets?: boolean;
}

/**
 * Sample user for filter preview
 */
export interface SampleUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  country: string;
  gender: string;
  profession: string;
  age: number;
  createdAt: string;
}

/**
 * Filter preview response
 */
export interface FilterPreviewResponse {
  totalCount: number;
  sampleUsers: SampleUser[];
  message: string;
}

/**
 * Campaign data
 */
export interface Campaign {
  _id: string;
  userId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  targetFilter?: CampaignFilter;
  estimatedTargetCount: number;
  actualTargetCount: number;
  targetsEnrolled: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  targetsCompleted: number;
  targetsExited: number;
  maxMessagesPerDay: number;
  scheduledStartDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  estimatedEndDate?: string;
  runAfterCampaignId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Campaign creation request
 */
export interface CreateCampaignRequest {
  name: string;
  targetFilter: CampaignFilter;
  maxMessagesPerDay?: number;
  scheduledStartDate?: string | null;
  runAfterCampaignId?: string;
}

/**
 * Campaign details response (with targets)
 */
export interface CampaignDetailsResponse {
  campaign: Campaign;
  targets: RelanceTarget[];
}

/**
 * Configuration update request
 */
export interface RelanceConfigUpdate {
  allowSimultaneousCampaigns?: boolean;
  maxMessagesPerDay?: number;
  maxTargetsPerCampaign?: number;
  defaultCampaignPaused?: boolean;
}

/**
 * Default relance statistics
 * Default relance is NOT a campaign - it's tracked separately
 */
export interface DefaultRelanceStats {
  isPaused: boolean;                      // defaultCampaignPaused status
  totalEnrolled: number;                  // Total enrolled in default relance
  activeTargets: number;                  // Currently in the 7-day loop
  completedRelance: number;               // Completed or exited
  totalMessagesSent: number;              // Total messages sent
  totalMessagesDelivered: number;         // Successfully delivered
  deliveryPercentage: number;             // Delivery success rate (0-100%)
  dayProgression: Array<{                 // Day-by-day progression
    day: number;                          // 1-7
    count: number;                        // Number of active targets on this day
  }>;
  // Legacy fields for backward compatibility
  completedTargets?: number;
  totalTargets?: number;
  successRate?: number;
  targetsEnrolled?: number;
  messagesSent?: number;
  messagesDelivered?: number;
  messagesFailed?: number;
  targetsCompleted?: number;
  targetsExited?: number;
  isActive?: boolean;
}
