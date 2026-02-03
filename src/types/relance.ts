/**
 * Relance Feature TypeScript Type Definitions
 * Email-based automated campaign follow-up system for unpaid referrals
 */

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
export type TargetStatus = 'active' | 'completed' | 'paused' | 'failed';

/**
 * Exit reason for referral leaving the loop
 */
export type ExitReason =
  | 'paid'                    // Target subscribed
  | 'completed_7_days'        // Finished all 7 days
  | 'subscription_expired'    // Referrer's subscription expired
  | 'manual'                  // Manually removed
  | 'referrer_inactive';      // Referrer became inactive

/**
 * Supported languages for messages
 */
export type RelanceLanguage = 'fr' | 'en';

/**
 * Message delivery record
 */
export interface MessageDelivery {
  _id?: string;
  day: number;
  sentAt: string;
  status: string;                // 'delivered' | 'failed' etc.
  errorMessage?: string;
}

/**
 * Relance configuration (user settings)
 */
export interface RelanceConfig {
  _id: string;
  userId: string;
  enabled: boolean;                    // Master on/off switch
  enrollmentPaused: boolean;           // Pause new enrollments
  sendingPaused: boolean;              // Pause message sending
  messagesSentToday: number;           // Daily counter
  lastResetDate: string;               // When counter was last reset
  createdAt: string;
  updatedAt: string;
}

/**
 * Populated referral user fields
 */
export interface PopulatedReferralUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  avatar?: string;
}

/**
 * Relance target (referral in campaign)
 */
export interface RelanceTarget {
  _id: string;
  referralUserId: string;              // The unpaid referral's user ID
  referrerUserId: string;              // The user who referred them
  campaignId?: string;                 // If part of a campaign
  waveId?: string;                     // Processing batch ID
  enteredLoopAt: string;               // When they entered the loop
  currentDay: number;                  // Current day in sequence (1-7)
  nextMessageDue: string;              // When next email should be sent
  lastMessageSentAt?: string;          // Last email timestamp
  messagesDelivered: MessageDelivery[];// History of sent messages
  exitedLoopAt?: string;               // When they left the loop
  exitReason?: ExitReason;             // Why they left
  status: TargetStatus;                // Current status
  language: RelanceLanguage;           // User's language preference
  createdAt: string;
  updatedAt: string;

  // Populated fields (when using populate)
  referralUser?: PopulatedReferralUser;
}

/**
 * Relance status response (flat shape from API)
 */
export interface RelanceStatus {
  channel: string;
  enabled: boolean;
  enrollmentPaused: boolean;
  sendingPaused: boolean;
  messagesSentToday: number;
  maxMessagesPerDay: number;
}

/**
 * Relance status API response
 */
export interface RelanceStatusResponse {
  success: boolean;
  data: RelanceStatus;
}

/**
 * Media attachment for messages
 */
export interface MediaAttachment {
  url: string;
  type: 'image' | 'video' | 'pdf';
  filename?: string;
}

/**
 * CTA button for email messages
 */
export interface MessageButton {
  label: string;
  url: string;
  color?: string; // Hex color, defaults to #F59E0B
}

/**
 * Custom message template for a specific day
 */
export interface CustomMessage {
  dayNumber: number; // 1-7
  subject?: string; // Custom email subject line
  messageTemplate: {
    fr: string; // French message
    en: string; // English message
  };
  mediaUrls?: MediaAttachment[];
  buttons?: MessageButton[];
}

/**
 * Recent message from the API
 */
export interface RecentMessage {
  day: number;
  sentAt: string;
  status: string;
  errorMessage?: string;
  referralUser?: PopulatedReferralUser;
  campaignId?: string | null;
  campaignName?: string | null;
  renderedHtml?: string;
}

/**
 * Campaign detail stats from admin endpoint
 */
export interface CampaignDetailStats {
  campaign: {
    _id: string;
    name: string;
    status: CampaignStatus;
    type: CampaignType;
    actualStartDate?: string;
    actualEndDate?: string;
  };
  totalEnrolled: number;
  activeTargets: number;
  completedRelance: number;
  targetsConverted: number;      // NEW: Users who paid during campaign
  targetsExited: number;          // Only manual/referrer_inactive exits
  targetsCompleted: number;       // Legacy field (backward compatibility)
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  totalMessagesFailed: number;
  deliveryPercentage: number;
  // Email engagement tracking
  totalMessagesOpened?: number;      // Unique emails opened at least once
  totalMessagesClicked?: number;     // Unique emails with at least one click
  totalOpens?: number;               // Total open events (includes multiple opens)
  totalClicks?: number;              // Total click events (includes multiple clicks)
  openRate?: number;                 // Percentage of delivered emails opened
  clickRate?: number;                // Percentage of delivered emails clicked
  clickThroughRate?: number;         // Percentage of opened emails that were clicked
  dayProgression: Array<{ day: number; count: number }>;
  exitReasons: {
    paid: number;
    completed_7_days: number;
    manual: number;
    referrer_inactive: number;
  };
}

/**
 * Campaign filter options
 */
export interface CampaignFilter {
  countries?: string[];                // e.g., ['CM', 'CI', 'SN']
  registrationDateFrom?: string;       // ISO date string
  registrationDateTo?: string;         // ISO date string
  gender?: 'male' | 'female' | 'other' | 'all';
  professions?: string[];
  minAge?: number;
  maxAge?: number;
  excludeCurrentTargets?: boolean;     // Exclude already enrolled targets
  subscriptionStatus?: 'subscribed' | 'non-subscribed' | 'all'; // Filter by payment status
}

/**
 * Sample user for filter preview
 */
export interface SampleUser {
  _id: string;
  name: string;
  email: string;
  country: string;
}

/**
 * Filter preview response
 */
export interface FilterPreviewResponse {
  estimatedCount: number;
  sampleUsers: SampleUser[];
}

/**
 * Preview API response
 */
export interface PreviewResponse {
  success: boolean;
  data: FilterPreviewResponse;
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

  // Filter options (for 'filtered' type)
  targetFilter?: CampaignFilter;

  // Scheduling
  scheduledStartDate?: string;
  runAfterCampaignId?: string;         // Chain campaigns
  priority?: number;

  // Custom messages (optional override of default messages)
  customMessages?: CustomMessage[];

  // Limits
  maxMessagesPerDay?: number;
  messagesSentToday?: number;

  // Statistics
  estimatedTargetCount?: number;
  actualTargetCount?: number;
  targetsEnrolled: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  targetsCompleted: number;
  targetsExited: number;

  // Timestamps
  startedAt?: string;
  actualEndDate?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Campaign creation request
 */
export interface CreateCampaignRequest {
  name: string;
  type?: CampaignType;
  targetFilter: CampaignFilter;
  customMessages?: CustomMessage[];
  maxMessagesPerDay?: number;
  scheduledStartDate?: string;
  runAfterCampaignId?: string;
}

/**
 * Campaigns API response
 */
export interface CampaignsResponse {
  success: boolean;
  data: {
    campaigns: Campaign[];
    total: number;
    page: number;
    totalPages: number;
  };
}

/**
 * Targets API response
 */
export interface TargetsResponse {
  success: boolean;
  data: {
    targets: RelanceTarget[];
    total: number;
    page: number;
    totalPages: number;
  };
}

/**
 * Configuration update request
 */
export interface RelanceConfigUpdate {
  enabled?: boolean;
  enrollmentPaused?: boolean;
  sendingPaused?: boolean;
  maxMessagesPerDay?: number;
}

/**
 * Settings update request
 */
export interface RelanceSettingsUpdate {
  enabled?: boolean;
  enrollmentPaused?: boolean;
  sendingPaused?: boolean;
}

/**
 * Relance statistics
 */
export interface RelanceStats {
  totalActiveTargets: number;
  totalCompletedTargets: number;
  totalMessagesSent: number;
  totalSuccessRate: number;            // Percentage (0-100)
  targetsEnrolledToday: number;
  messagesSentToday: number;
  exitReasons: {
    paid: number;
    completed_7_days: number;
    subscription_expired: number;
    manual: number;
  };
}

/**
 * Campaign statistics
 */
export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalTargetsEnrolled: number;
  totalMessagesSent: number;
  averageSuccessRate: number;
}

/**
 * Default relance statistics
 */
export interface DefaultRelanceStats {
  isPaused: boolean;
  totalEnrolled: number;
  activeTargets: number;
  completedRelance: number;
  targetsConverted: number;      // NEW: Users who paid during campaign
  targetsExited: number;          // Only manual/referrer_inactive exits
  targetsCompleted: number;       // Legacy field (backward compatibility)
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  deliveryPercentage: number;
  // Email engagement tracking
  totalMessagesOpened?: number;      // Unique emails opened at least once
  totalMessagesClicked?: number;     // Unique emails with at least one click
  totalOpens?: number;               // Total open events (includes multiple opens)
  totalClicks?: number;              // Total click events (includes multiple clicks)
  openRate?: number;                 // Percentage of delivered emails opened
  clickRate?: number;                // Percentage of delivered emails clicked
  clickThroughRate?: number;         // Percentage of opened emails that were clicked
  dayProgression: Array<{
    day: number;
    count: number;
  }>;
}

// Legacy type aliases for backward compatibility
export type RelanceTargetStatus = TargetStatus;
