import { ApiService } from './ApiService';
import { ApiResponse } from './ApiResponse';
// import { getPaymentUrl, getBaseUrl } from '../utils/apiHelpers';

/**
 * SBC API Service with all endpoint methods
 * Comprehensive implementation based on API documentation
 */
export class SBCApiService extends ApiService {

  // ==================== USER AUTHENTICATION & MANAGEMENT ====================

  /**
   * Login user
   */
  async loginUser(email: string, password: string): Promise<ApiResponse> {
    return await this.post('/users/login', {
      body: { email, password },
      requiresAuth: false
    });
  }

  /**
   * Register new user
   */
  async registerUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    referralCode?: string;
  }): Promise<ApiResponse> {
    return await this.post('/users/register', {
      body: userData,
      requiresAuth: false
    });
  }

  /**
   * Verify OTP for registration/login
   */
  async verifyOtp(userId: string, otp: string): Promise<ApiResponse> {
    return await this.post('/users/verify-otp', {
      body: { userId, otpCode: otp },
      requiresAuth: false
    });
  }

  /**
   * Resend verification OTP
   */
  async resendVerificationOtp(userId: string, email: string, purpose: string): Promise<ApiResponse> {
    return await this.post('/users/resend-otp', {
      body: { userId, email, purpose },
      requiresAuth: false
    });
  }

  /**
   * Resend OTP with enhanced options (supports identifier and channel override)
   */
  async resendOtpEnhanced(options: {
    identifier?: string;
    email?: string; // Legacy support
    purpose: string;
    channel?: 'email' | 'whatsapp';
    userId?: string;
  }): Promise<ApiResponse> {
    return await this.post('/users/resend-otp', {
      body: options,
      requiresAuth: false
    });
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<ApiResponse> {
    return await this.get('/users/me');
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: Record<string, any>): Promise<ApiResponse> {
    return await this.put('/users/me', { body: updates });
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File | string, fileName?: string): Promise<ApiResponse> {
    if (file instanceof File) {
      // Standard file upload
      return await this.uploadFiles({
        endpoint: '/users/me/avatar',
        files: [file],
        fieldName: 'avatar'
      });
    } else {
      // Base64 upload for web (if needed)
      return await this.post('/users/me/avatar-base64', {
        body: {
          avatarBase64: file,
          fileName: fileName || 'avatar.jpg'
        }
      });
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfileById(userId: string): Promise<ApiResponse> {
    return await this.get(`/users/${userId}`);
  }

  /**
   * Logout user
   */
  async logoutUser(): Promise<ApiResponse> {
    return await this.post('/users/logout', { body: {} });
  }

  /**
   * Get affiliation info by referral code
   */
  async getAffiliationInfo(code: string): Promise<ApiResponse> {
    return await this.get('/users/get-affiliation', {
      queryParameters: { referralCode: code },
      requiresAuth: false
    });
  }

  /**
   * Get my affiliator
   */
  async getMyAffiliator(): Promise<ApiResponse> {
    return await this.get('/users/affiliator');
  }

  /**
   * Get referral stats
   */
  async getReferralStats(): Promise<ApiResponse> {
    return await this.get('/users/get-referals');
  }

  /**
   * Get referred users
   */
  async getReferredUsers(filters?: Record<string, any>): Promise<ApiResponse> {
    return await this.get('/users/get-refered-users', {
      queryParameters: filters
    });
  }

  /**
   * Get user products
   */
  async getUserProducts(filters?: Record<string, any>): Promise<ApiResponse> {
    return await this.get('/products/user', {
      queryParameters: filters
    });
  }

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Request password reset OTP (enhanced with channel support)
   */
  async requestPasswordResetOtp(identifier: string, channel?: 'email' | 'whatsapp'): Promise<ApiResponse> {
    const body: any = { identifier };
    if (channel) {
      body.channel = channel;
    }
    return await this.post('/users/request-password-reset-otp', {
      body,
      requiresAuth: false
    });
  }

  /**
   * Verify password reset OTP
   */
  async verifyPasswordResetOtp(email: string, otpCode: string): Promise<ApiResponse> {
    return await this.post('/users/verify-password-reset-otp', {
      body: { email, otpCode },
      requiresAuth: false
    });
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, passwordResetToken: string, newPassword: string): Promise<ApiResponse> {
    return await this.post('/users/reset-password', {
      body: { email, passwordResetToken, newPassword },
      requiresAuth: false
    });
  }

  // ==================== EMAIL MANAGEMENT ====================

  /**
   * Request email change OTP
   */
  async requestEmailChangeOtp(newEmail: string): Promise<ApiResponse> {
    return await this.post('/users/request-email-change', {
      body: { newEmail }
    });
  }

  /**
   * Confirm email change
   */
  async confirmEmailChange(newEmail: string, otpCode: string): Promise<ApiResponse> {
    return await this.post('/users/confirm-change-email', {
      body: { newEmail, otpCode }
    });
  }

  /**
   * Verify email change
   */
  async verifyEmailChange(newEmail: string, otp: string): Promise<ApiResponse> {
    return await this.post('/users/verify-email-change', {
      body: { newEmail, otp }
    });
  }

  /**
   * Resend OTP by email
   */
  async resendOtpByEmail(email: string, purpose: string): Promise<ApiResponse> {
    return await this.post('/users/resend-otp', {
      body: { email, purpose }
    });
  }

  // ==================== PHONE NUMBER MANAGEMENT ====================

  /**
   * Request phone number change OTP
   */
  async requestPhoneChangeOtp(newPhoneNumber: string): Promise<ApiResponse> {
    return await this.post('/users/request-change-phone', {
      body: { newPhoneNumber }
    });
  }

  /**
   * Confirm phone number change
   */
  async confirmPhoneChange(newPhoneNumber: string, otpCode: string): Promise<ApiResponse> {
    return await this.post('/users/confirm-change-phone', {
      body: { newPhoneNumber, otpCode }
    });
  }

  // ==================== PRODUCTS ====================

  /**
   * Get products with search/filter
   */
  async getProducts(filters?: Record<string, any>): Promise<ApiResponse> {
    return await this.get('/products/search', {
      queryParameters: filters,
      requiresAuth: false
    });
  }

  /**
   * Get product details
   */
  async getProductDetails(productId: string): Promise<ApiResponse> {
    return await this.get(`/products/${productId}`, {
      requiresAuth: false
    });
  }

  /**
   * Get product ratings
   */
  async getProductRatings(productId: string, page: number = 1, limit: number = 10): Promise<ApiResponse> {
    return await this.get(`/products/${productId}/ratings`, {
      queryParameters: {
        page: page.toString(),
        limit: limit.toString()
      },
      requiresAuth: false
    });
  }

  /**
   * Creates a new product with associated images.
   * Uses multipart/form-data.
   * @param productData - Object containing product details (name, category, subcategory, description, price).
   * @param imageFiles - Array of File objects to upload as product images.
   */
  async createProduct(productData: {
    name: string;
    category: string;
    subcategory: string;
    description: string;
    price: number;
  }, imageFiles: File[]): Promise<ApiResponse> {
    const fields: Record<string, string> = {
      name: productData.name,
      category: productData.category,
      subcategory: productData.subcategory,
      description: productData.description,
      price: productData.price.toString(), // Convert price to string for form data
    };

    return this.uploadFiles({
      endpoint: '/products', // As per prdt.md: POST /api/products
      files: imageFiles,
      fieldName: 'images', // As per prdt.md
      fields: fields,
      httpMethod: 'POST',
    });
  }

  /**
   * Fetches a single product by its ID.
   * @param productId The ID of the product to fetch.
   */
  async getProductById(productId: string): Promise<ApiResponse> {
    return this.get(`/products/${productId}`);
  }

  /**
   * Updates an existing product with new data and optional new images.
   * @param productId The ID of the product to update.
   * @param productData Object containing updated product details.
   * @param newImageFiles Optional array of new File objects to upload.
   *                       If provided, this implies a multipart/form-data request.
   *                       If empty, a JSON PUT request is made for text data only.
   */
  async updateProduct(
    productId: string,
    productData: {
      name?: string;
      category?: string;
      subcategory?: string;
      description?: string;
      price?: number;
      // Add any other fields that can be updated via JSON
    },
    newImageFiles: File[] = [] // Default to empty array if no new images
  ): Promise<ApiResponse> {
    const endpoint = `/products/${productId}`;

    const fields: Record<string, string> = {};
    if (productData.name !== undefined) fields.name = productData.name;
    if (productData.category !== undefined) fields.category = productData.category;
    if (productData.subcategory !== undefined) fields.subcategory = productData.subcategory;
    if (productData.description !== undefined) fields.description = productData.description;
    if (productData.price !== undefined) fields.price = productData.price.toString();

    // If new image files are provided, use multipart/form-data upload method
    // Otherwise, send a standard JSON PUT request
    if (newImageFiles.length > 0) {
      return this.uploadFiles({
        endpoint: endpoint,
        files: newImageFiles,
        fieldName: 'images', // Assuming 'images' is the field name for file uploads
        fields: fields,
        httpMethod: 'PUT', // Specify PUT method for update
      });
    } else {
      return this.put(endpoint, { body: productData });
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string): Promise<ApiResponse> {
    return await this.delete(`/products/${productId}`);
  }

  /**
   * Rate product
   */
  async rateProduct(productId: string, rating: number, review?: string): Promise<ApiResponse> {
    const body: any = { rating };
    if (review) {
      body.review = review;
    }
    return await this.post(`/products/${productId}/ratings`, { body });
  }

  /**
   * Delete rating
   */
  async deleteRating(ratingId: string): Promise<ApiResponse> {
    return await this.delete(`/products/ratings/${ratingId}`);
  }

  /**
   * Mark rating as helpful
   */
  async markRatingHelpful(ratingId: string): Promise<ApiResponse> {
    return await this.post(`/products/ratings/${ratingId}/helpful`, { body: {} });
  }

  // ==================== FLASH SALES ====================

  /**
   * Get active flash sales
   */
  async getFlashSales(): Promise<ApiResponse> {
    return await this.get('/flash-sales', { requiresAuth: false });
  }

  /**
   * Track flash sale view
   */
  async trackFlashSaleView(flashSaleId: string): Promise<ApiResponse> {
    return await this.post(`/flash-sales/${flashSaleId}/track-view`, {
      body: {},
      requiresAuth: false
    });
  }

  /**
   * Track WhatsApp click on flash sale
   */
  async trackFlashSaleWhatsAppClick(flashSaleId: string): Promise<ApiResponse> {
    return await this.post(`/flash-sales/${flashSaleId}/track-whatsapp-click`, {
      body: {},
      requiresAuth: false
    });
  }

  /**
   * Create flash sale
   */
  async createFlashSale(flashSaleData: Record<string, any>): Promise<ApiResponse> {
    return await this.post('/flash-sales', { body: flashSaleData });
  }

  /**
   * Get my flash sales
   */
  async getMyFlashSales(): Promise<ApiResponse> {
    return await this.get('/flash-sales/my');
  }

  /**
   * Update flash sale
   */
  async updateFlashSale(flashSaleId: string, updates: Record<string, any>): Promise<ApiResponse> {
    return await this.put(`/flash-sales/${flashSaleId}`, { body: updates });
  }

  /**
   * Cancel flash sale
   */
  async cancelFlashSale(flashSaleId: string): Promise<ApiResponse> {
    return await this.delete(`/flash-sales/${flashSaleId}`);
  }

  // ==================== CONTACTS ====================

  /**
   * Search contacts
   */
  async searchContacts(filters: Record<string, any>): Promise<ApiResponse> {
    // Filter out empty values to avoid sending empty string parameters
    const queryParams = Object.fromEntries(
      Object.entries(filters)
        .filter(([, value]) => value !== null && value !== undefined && value !== '' && value !== 0)
        .map(([key, value]) => [key, String(value)])
    );
    return await this.get('/contacts/search', {
      queryParameters: queryParams
    });
  }

  /**
   * Export contacts
   */
  async exportContacts(filters: Record<string, any>): Promise<ApiResponse> {
    // Filter out empty values to avoid sending empty string parameters
    const queryParams = Object.fromEntries(
      Object.entries(filters)
        .filter(([, value]) => value !== null && value !== undefined && value !== '' && value !== 0)
        .map(([key, value]) => [key, String(value)])
    );
    return await this.get('/contacts/export', {
      queryParameters: queryParams
    });
  }

  /**
   * Request contacts export OTP
   */
  async requestContactsExportOtp(): Promise<ApiResponse> {
    return await this.post('/contacts/request-otp', { body: {} });
  }

  // ==================== SUBSCRIPTIONS & PAYMENTS ====================

  /**
   * Get subscription plans
   */
  async getSubscriptionPlans(): Promise<ApiResponse> {
    return await this.get('/subscriptions/plans', { requiresAuth: false });
  }

  /**
   * Get current user subscription
   */
  async getCurrentSubscription(): Promise<ApiResponse> {
    return await this.get('/subscriptions');
  }

  /**
   * Get active subscriptions
   */
  async getActiveSubscriptions(): Promise<ApiResponse> {
    return await this.get('/subscriptions/active');
  }

  /**
   * Get expired subscriptions
   */
  async getExpiredSubscriptions(): Promise<ApiResponse> {
    return await this.get('/subscriptions/expired');
  }

  /**
   * Check subscription by type
   */
  async checkSubscription(type: string): Promise<ApiResponse> {
    return await this.get(`/subscriptions/check/${type}`);
  }

  /**
   * Purchase subscription
   */
  async purchaseSubscription(planType: string): Promise<ApiResponse> {
    return await this.post('/subscriptions/purchase', {
      body: { planType }
    });
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(): Promise<ApiResponse> {
    return await this.post('/subscriptions/upgrade', { body: {} });
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(data: Record<string, any>): Promise<ApiResponse> {
    return await this.post('/payments/intents', {
      body: data,
      requiresAuth: false
    });
  }

  /**
   * Submit payment details
   */
  async submitPaymentDetails(sessionId: string, paymentData: Record<string, any>): Promise<ApiResponse> {
    return await this.post(`/payments/intents/${sessionId}/submit`, {
      body: paymentData,
      requiresAuth: false
    });
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(sessionId: string): Promise<ApiResponse> {
    return await this.get(`/payments/intents/${sessionId}/status`, {
      requiresAuth: false
    });
  }

  /**
   * Generate payment URL
   */
  generatePaymentUrl(sessionId: string): string {
    return `${this.baseUrl}/payments/page/${sessionId}`;
  }

  // ==================== TRANSACTIONS & WALLET ====================

  /**
   * Get wallet details
   */
  async getWalletDetails(): Promise<ApiResponse> {
    return await this.get('/wallet/me');
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(filters?: Record<string, any>): Promise<ApiResponse> {
    return await this.get('/transactions/history', {
      queryParameters: filters
    });
  }

  /**
   * Get transaction stats
   */
  async getTransactionStats(): Promise<ApiResponse> {
    return await this.get('/transactions/stats');
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<ApiResponse> {
    return await this.get(`/transactions/${transactionId}`);
  }

  /**
   * Initiate deposit
   */
  async initiateDeposit(amount: number): Promise<ApiResponse> {
    return await this.post('/transactions/deposit/initiate', {
      body: { amount }
    });
  }

  /**
   * Initiate withdrawal (User-initiated as per withdrawal.md)
   * Expects amount and currency.
   */
  async initiateWithdrawal(amount: number): Promise<ApiResponse> {
    return await this.post('/transactions/withdrawal/initiate', { // Correct endpoint
      body: { amount } // Correct payload format
    });
  }

  /**
   * Verify withdrawal OTP (User-initiated as per withdrawal.md)
   */
  async verifyWithdrawal({ transactionId, verificationCode }: { transactionId: string, verificationCode: string }): Promise<ApiResponse> {
    return await this.post('/transactions/withdrawal/verify', { // Correct endpoint
      body: { transactionId, verificationCode } // Correct payload format
    });
  }

  /**
   * Cancel withdrawal (User-initiated as per withdrawal.md)
   */
  async cancelWithdrawal(transactionId: string): Promise<ApiResponse> {
    return await this.delete(`/transactions/withdrawal/${transactionId}/cancel`); // Correct endpoint and method
  }

  /**
   * Process payment
   */
  async processPayment(paymentData: Record<string, any>): Promise<ApiResponse> {
    return await this.post('/transactions/payment', {
      body: paymentData
    });
  }

  /**
   * Update momo details
   */
  async updateMomoDetails(momoNumber: string, momoOperator: string): Promise<ApiResponse> {
    return await this.put('/users/me', {
      body: {
        momoNumber,
        momoOperator
      }
    });
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Get notifications
   */
  async getNotifications(): Promise<ApiResponse> {
    return await this.get('/notifications/me');
  }

  /**
   * Get notification stats
   */
  async getNotificationStats(): Promise<ApiResponse> {
    return await this.get('/notifications/me/stats');
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return await this.post(`/notifications/${notificationId}/mark-read`, {
      body: {}
    });
  }

  // ==================== SETTINGS & EVENTS ====================

  /**
   * Get app settings
   */
  async getAppSettings(): Promise<ApiResponse> {
    return await this.get('/settings', { requiresAuth: false });
  }

  /**
   * Update settings
   */
  async updateSettings(settings: Record<string, any>): Promise<ApiResponse> {
    return await this.put('/settings', { body: settings });
  }

  /**
   * Upload logo
   */
  async uploadLogo(file: File): Promise<ApiResponse> {
    return await this.uploadFiles({
      endpoint: '/settings/logo',
      files: [file],
      fieldName: 'logo'
    });
  }

  /**
   * Upload terms PDF
   */
  async uploadTermsPdf(file: File): Promise<ApiResponse> {
    return await this.uploadFiles({
      endpoint: '/settings/terms-pdf',
      files: [file],
      fieldName: 'terms'
    });
  }

  /**
   * Upload presentation video
   */
  async uploadPresentationVideo(file: File): Promise<ApiResponse> {
    return await this.uploadFiles({
      endpoint: '/settings/presentation-video',
      files: [file],
      fieldName: 'video'
    });
  }

  /**
   * Upload presentation PDF
   */
  async uploadPresentationPdf(file: File): Promise<ApiResponse> {
    return await this.uploadFiles({
      endpoint: '/settings/presentation-pdf',
      files: [file],
      fieldName: 'pdf'
    });
  }

  /**
   * Upload generic file
   */
  async uploadFile(file: File): Promise<ApiResponse> {
    return await this.uploadFiles({
      endpoint: '/settings/files/upload',
      files: [file],
      fieldName: 'file'
    });
  }

  /**
   * Get events
   */
  async getEvents(): Promise<ApiResponse> {
    return await this.get('/events', { requiresAuth: false });
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<ApiResponse> {
    return await this.get(`/events/${id}`, { requiresAuth: false });
  }

  /**
   * Create event
   */
  async createEvent(eventData: Record<string, any>, files?: File[]): Promise<ApiResponse> {
    if (files && files.length > 0) {
      const stringEventData = Object.fromEntries(
        Object.entries(eventData).map(([key, value]) => [key, String(value)])
      );

      return await this.uploadFiles({
        endpoint: '/events',
        files: files,
        fieldName: 'images',
        fields: stringEventData,
        httpMethod: 'POST'
      });
    } else {
      return await this.post('/events', { body: eventData });
    }
  }

  /**
   * Update event
   */
  async updateEvent(id: string, eventData: Record<string, any>, files?: File[]): Promise<ApiResponse> {
    if (files && files.length > 0) {
      const stringEventData = Object.fromEntries(
        Object.entries(eventData).map(([key, value]) => [key, String(value)])
      );

      return await this.uploadFiles({
        endpoint: `/events/${id}`,
        files: files,
        fieldName: 'images',
        fields: stringEventData,
        httpMethod: 'PUT'
      });
    } else {
      return await this.put(`/events/${id}`, { body: eventData });
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(id: string): Promise<ApiResponse> {
    return await this.delete(`/events/${id}`);
  }

  // ==================== TOMBOLA ====================

  /**
   * Get tombolas
   */
  async getTombolas(): Promise<ApiResponse> {
    return await this.get('/tombola', { requiresAuth: false });
  }

  /**
   * Get current tombola
   */
  async getCurrentTombola(): Promise<ApiResponse> {
    return await this.get('/tombola/current', { requiresAuth: false });
  }

  /**
   * Get tombola winners
   */
  async getTombolaWinners(monthId: string): Promise<ApiResponse> {
    return await this.get(`/tombola/${monthId}/winners`, { requiresAuth: false });
  }

  /**
   * Buy tombola ticket
   */
  async buyTombolaTicket(): Promise<ApiResponse> {
    return await this.post('/tombola/current/buy-ticket', { body: {} });
  }

  /**
   * Get my tombola tickets
   */
  async getMyTombolaTickets(): Promise<ApiResponse> {
    return await this.get('/tombola/tickets/me');
  }

  // ==================== ADVERTISING ====================

  /**
   * Get advertising packs
   */
  async getAdvertisingPacks(): Promise<ApiResponse> {
    return await this.get('/advertising/packs', { requiresAuth: false });
  }

  /**
   * Get ads for display
   */
  async getAdsForDisplay(): Promise<ApiResponse> {
    return await this.get('/advertising/ads/display', { requiresAuth: false });
  }

  /**
   * Create advertisement
   */
  async createAdvertisement(adData: Record<string, any>): Promise<ApiResponse> {
    return await this.post('/advertising/ads', { body: adData });
  }

  /**
   * Get my advertisements
   */
  async getMyAdvertisements(): Promise<ApiResponse> {
    return await this.get('/advertising/ads/me');
  }

  /**
   * Get advertisement by ID
   */
  async getAdvertisementById(advertisementId: string): Promise<ApiResponse> {
    return await this.get(`/advertising/ads/${advertisementId}`);
  }

  /**
   * Update advertisement
   */
  async updateAdvertisement(advertisementId: string, updates: Record<string, any>): Promise<ApiResponse> {
    return await this.put(`/advertising/ads/${advertisementId}`, { body: updates });
  }

  // ==================== SUPPORT ====================

  /**
   * Get FAQs
   */
  async getFaqs(): Promise<ApiResponse> {
    return await this.get('/support/faq', { requiresAuth: false });
  }

  /**
   * Submit support ticket
   */
  async submitSupportTicket(ticketData: Record<string, any>): Promise<ApiResponse> {
    return await this.post('/support/tickets', { body: ticketData });
  }

  // ==================== FILE MANAGEMENT ====================

  /**
   * Get settings file
   */
  async getSettingsFile(fileId: string): Promise<ApiResponse> {
    return await this.get(`/settings/files/${fileId}`, { requiresAuth: false });
  }

  /**
   * Get file thumbnail
   */
  async getFileThumbnail(fileId: string): Promise<ApiResponse> {
    return await this.get(`/settings/thumbnails/${fileId}`, { requiresAuth: false });
  }

  /**
   * Generate settings file URL
   */
  generateSettingsFileUrl(fileId: string): string {
    return `${this.baseUrl}/settings/files/${fileId}`;
  }

  /**
   * Generate settings thumbnail URL
   */
  generateSettingsThumbnailUrl(fileId: string): string {
    return `${this.baseUrl}/settings/thumbnails/${fileId}`;
  }

  // ==================== CURRENCY CONVERSION ====================

  /**
   * Convert currency
   */
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<ApiResponse> {
    return await this.post('/wallet/convert-currency', {
      body: { amount, fromCurrency, toCurrency }
    });
  }

  /**
   * Convert to XAF (Payment Service)
   */
  async convertToXAF(amount: number, fromCurrency: string): Promise<ApiResponse> {
    return await this.post('/payments/convertxfa', {
      body: { amount, fromCurrency },
      requiresAuth: false
    });
  }

  /**
   * Convert currency (Payment Service)
   */
  async convertCurrencyPayment(amount: number, fromCurrency: string, toCurrency: string): Promise<ApiResponse> {
    return await this.post('/payments/convertcurrency', {
      body: { amount, fromCurrency, toCurrency },
      requiresAuth: false
    });
  }

  // ==================== PARTNER RELATED ====================

  /**
   * Get partner details
   */
  async getPartnerDetails(): Promise<ApiResponse> {
    return await this.get('/partners/me');
  }

  /**
   * Get partner transactions
   */
  async getPartnerTransactions(filters?: Record<string, any>): Promise<ApiResponse> {
    return await this.get('/partners/me/transactions', {
      queryParameters: filters
    });
  }

  // ==================== AFFILIATION & REFERRALS ====================

  /**
   * Get affiliation details
   */
  async getAffiliationDetails(): Promise<ApiResponse> {
    return await this.get('/users/affiliation/me');
  }

  /**
   * Check if a user exists by email or phone number.
   */
  async checkUserExistence(data: { email?: string; phoneNumber?: string }): Promise<ApiResponse> {
    return await this.post('/users/check-existence', {
      body: data,
      requiresAuth: false
    });
  }

  /**
   * Fetches the list of available formations.
   */
  async getFormations(): Promise<ApiResponse> {
    return this.get('/settings/formations');
  }
}

// Create and export singleton instance
export const sbcApiService = new SBCApiService();
