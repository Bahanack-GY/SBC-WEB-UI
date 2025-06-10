# Backend API Documentation for React/Vite Integration

This documentation provides a comprehensive guide for React developers to integrate with the same backend API used by the Flutter application. The documentation is based on the Flutter `ApiService` and `ApiResponse` classes.

## Table of Contents
1. [Base Configuration](#base-configuration)
2. [API Response Structure](#api-response-structure)
3. [Authentication](#authentication)
4. [Core API Service Implementation](#core-api-service-implementation)
5. [API Endpoints](#api-endpoints)
6. [Error Handling](#error-handling)
7. [Usage Examples](#usage-examples)

## Base Configuration

### Base URL
```javascript
const BASE_URL = 'https://sniperbuisnesscenter.com/api';
// Alternative URLs for development:
// const BASE_URL = 'http://127.0.0.1:3000/api'; // localhost
// const BASE_URL = 'http://192.168.225.234:5000/api'; // local network
```

### Payment URL
```javascript
const PAYMENT_URL = 'https://sniperbuisnesscenter.com/api/payment/';
```

## API Response Structure

All API responses follow a consistent structure:

```typescript
interface ApiResponse {
  statusCode: number;
  body: {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
    [key: string]: any;
  };
  isSuccessByStatusCode: boolean;
  apiReportedSuccess: boolean;
  message: string;
  rawError?: any;
}
```

### Success Determination
- `isSuccessByStatusCode`: HTTP status code is 200-299
- `apiReportedSuccess`: Response body contains `success: true`
- `isOverallSuccess`: Both conditions above are true

## Authentication

### Token Management
The API uses Bearer token authentication stored in localStorage:

```javascript
// Store token
localStorage.setItem('token', 'your-jwt-token');

// Retrieve token
const token = localStorage.getItem('token');

// Remove token (logout)
localStorage.removeItem('token');
```

### Headers
```javascript
const getHeaders = (requiresAuth = true, isFormData = false) => {
  const headers = {
    'Accept': 'application/json'
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (requiresAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};
```

## Core API Service Implementation

### ApiResponse Class
```javascript
class ApiResponse {
  constructor(statusCode, body, isSuccessByStatusCode, apiReportedSuccess, message, rawError = null) {
    this.statusCode = statusCode;
    this.body = body;
    this.isSuccessByStatusCode = isSuccessByStatusCode;
    this.apiReportedSuccess = apiReportedSuccess;
    this.message = message;
    this.rawError = rawError;
  }

  get isOverallSuccess() {
    return this.isSuccessByStatusCode && this.apiReportedSuccess;
  }

  static fromHttpResponse(response, responseText) {
    let body = {};
    let message = '';
    let apiSuccess = false;

    try {
      if (responseText) {
        body = JSON.parse(responseText);
        message = body.message || '';
        apiSuccess = Boolean(body.success);
      }
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      message = 'Failed to parse server response.';
      apiSuccess = false;
    }

    const successByStatusCode = response.status >= 200 && response.status < 300;

    if (!message && successByStatusCode && apiSuccess) {
      message = 'Operation successful.';
    } else if (!message && !successByStatusCode) {
      message = 'An unknown error occurred.';
    }

    return new ApiResponse(
      response.status,
      body,
      successByStatusCode,
      apiSuccess,
      message
    );
  }

  static fromError(error, statusCode = 0) {
    let errorMessage = 'An unexpected error occurred.';
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new ApiResponse(
      statusCode,
      { error: errorMessage, success: false },
      false,
      false,
      errorMessage,
      error
    );
  }
}
```

### ApiService Class
```javascript
class ApiService {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  async handleHttpResponse(response) {
    console.log('Response Status:', response.status);

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json') ?? false;

    const responseText = await response.text();

    if (responseText.length > 1024) {
      console.log('Response Body: [Truncated due to length > 1024 characters]');
    } else {
      console.log('Response Body:', responseText);
    }

    if (isJson) {
      return ApiResponse.fromHttpResponse(response, responseText);
    } else {
      // For non-JSON responses (like files)
      const success = response.status >= 200 && response.status < 300;
      const mockJson = success
        ? '{"data": "File content type, not JSON. Handled by caller.", "message": "File retrieval successful."}'
        : '{"message": "File retrieval failed."}';

      return ApiResponse.fromHttpResponse(response, mockJson);
    }
  }

  async get(endpoint, { requiresAuth = true, queryParameters = null } = {}) {
    const headers = getHeaders(requiresAuth);
    let url = `${this.baseUrl}${endpoint}`;

    if (queryParameters) {
      const params = new URLSearchParams(queryParameters);
      url += `?${params.toString()}`;
    }

    console.log('GET Request:', url);
    console.log('Headers:', headers);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error in GET ${endpoint}:`, error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error: Please check your connection and try again.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred: ${error.message}`,
        -3
      );
    }
  }

  async post(endpoint, { body, requiresAuth = true } = {}) {
    const headers = getHeaders(requiresAuth);
    const url = `${this.baseUrl}${endpoint}`;

    console.log('POST Request:', url);
    console.log('Headers:', headers);
    console.log('Body:', JSON.stringify(body));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error in POST ${endpoint}:`, error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error: Please check your connection and try again.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred: ${error.message}`,
        -3
      );
    }
  }

  async put(endpoint, { body, requiresAuth = true } = {}) {
    const headers = getHeaders(requiresAuth);
    const url = `${this.baseUrl}${endpoint}`;

    console.log('PUT Request:', url);
    console.log('Headers:', headers);
    console.log('Body:', JSON.stringify(body));

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error in PUT ${endpoint}:`, error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error: Please check your connection and try again.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred: ${error.message}`,
        -3
      );
    }
  }

  async delete(endpoint, { body = null, requiresAuth = true } = {}) {
    const headers = getHeaders(requiresAuth);
    const url = `${this.baseUrl}${endpoint}`;

    console.log('DELETE Request:', url);
    console.log('Headers:', headers);
    if (body) console.log('Body:', JSON.stringify(body));

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: body ? JSON.stringify(body) : null
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error in DELETE ${endpoint}:`, error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error: Please check your connection and try again.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred: ${error.message}`,
        -3
      );
    }
  }

  async uploadFiles({
    endpoint,
    files,
    fieldName,
    fields = null,
    requiresAuth = true,
    httpMethod = 'POST'
  }) {
    const headers = getHeaders(requiresAuth, true); // isFormData = true
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`File Upload Request (${httpMethod}):`, url);
    console.log('Headers:', headers);
    console.log('Files:', files.map(f => f.name));
    console.log('FieldName:', fieldName);
    if (fields) console.log('Fields:', fields);

    try {
      const formData = new FormData();

      if (fields) {
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      files.forEach(file => {
        formData.append(fieldName, file);
      });

      const response = await fetch(url, {
        method: httpMethod,
        headers,
        body: formData
      });

      return await this.handleHttpResponse(response);
    } catch (error) {
      console.error(`Error during file upload ${endpoint}:`, error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return ApiResponse.fromError(
          'Network error during file upload. Please check your connection.',
          -1
        );
      }

      return ApiResponse.fromError(
        `An unexpected error occurred during file upload: ${error.message}`,
        -3
      );
    }
  }
}
```

## User Flows & API Integration

### Authentication Flow

The authentication system uses a two-step process: initial login with email/password, followed by OTP verification.

#### Login Flow

**Step 1: Initial Login**
```javascript
const handleInitialLogin = async (email, password) => {
  try {
    const response = await apiService.loginUser(email, password);

    if (response.statusCode === 200 && response.apiReportedSuccess) {
      const data = response.body.data;
      const userId = data.userId;

      // Store userId temporarily for OTP verification
      sessionStorage.setItem('tempUserId', userId);

      // Show OTP input screen
      setShowOtpScreen(true);
      setMessage('Please enter the OTP sent to your email');
    } else {
      // Handle login errors
      setError(response.message || 'Login failed');
    }
  } catch (error) {
    setError('Network error. Please try again.');
  }
};
```

**Step 2: OTP Verification**
```javascript
const handleOtpVerification = async (otp) => {
  try {
    const userId = sessionStorage.getItem('tempUserId');
    const response = await apiService.verifyOtp(userId, otp);

    if (response.statusCode === 200 && response.apiReportedSuccess) {
      const data = response.body.data;

      // Store authentication data
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('balance', data.user.balance?.toString() || '0');

      // Store user profile data
      if (data.user.avatar) {
        localStorage.setItem('avatar', data.user.avatar);
      }
      if (data.user.momoNumber) {
        localStorage.setItem('momo', data.user.momoNumber);
        localStorage.setItem('momoCorrespondent', data.user.momoOperator);
      }

      // Clean up temporary data
      sessionStorage.removeItem('tempUserId');

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      setError(response.message || 'Invalid OTP');
    }
  } catch (error) {
    setError('OTP verification failed. Please try again.');
  }
};
```

#### Registration Flow

**Step 1: User Registration**
```javascript
const handleRegistration = async (userData) => {
  try {
    const registrationData = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phoneNumber: userData.phoneNumber,
      region: userData.region,
      city: userData.city,
      country: userData.country,
      referralCode: userData.referralCode, // Optional
      language: userData.language || ['en'],
      profession: userData.profession,
      interests: userData.interests || [],
      shareContactInfo: userData.shareContactInfo || false
    };

    const response = await apiService.registerUser(registrationData);

    if (response.statusCode === 201 && response.apiReportedSuccess) {
      const data = response.body.data;
      const userId = data.userId;

      // Store userId for OTP verification
      sessionStorage.setItem('tempUserId', userId);

      // Show OTP verification screen
      setShowOtpScreen(true);
      setMessage('Registration successful! Please verify your email with the OTP sent.');
    } else {
      setError(response.message || 'Registration failed');
    }
  } catch (error) {
    setError('Registration failed. Please try again.');
  }
};
```

**Step 2: Email Verification**
```javascript
// Use the same OTP verification flow as login
const handleEmailVerification = async (otp) => {
  // Same as handleOtpVerification above
  await handleOtpVerification(otp);
};
```

#### Resend OTP
```javascript
const handleResendOtp = async () => {
  try {
    const userId = sessionStorage.getItem('tempUserId');
    const response = await apiService.resendVerificationOtp(userId);

    if (response.apiReportedSuccess) {
      setMessage('OTP resent successfully');
    } else {
      setError(response.message || 'Failed to resend OTP');
    }
  } catch (error) {
    setError('Failed to resend OTP');
  }
};
```

### Password Reset Flow

**Step 1: Request Password Reset**
```javascript
const handlePasswordResetRequest = async (email) => {
  try {
    const response = await apiService.requestPasswordResetOtp(email);

    if (response.apiReportedSuccess) {
      sessionStorage.setItem('resetEmail', email);
      setShowOtpScreen(true);
      setMessage('Password reset OTP sent to your email');
    } else {
      setError(response.message || 'Failed to send reset OTP');
    }
  } catch (error) {
    setError('Failed to request password reset');
  }
};
```

**Step 2: Reset Password with OTP**
```javascript
const handlePasswordReset = async (otp, newPassword) => {
  try {
    const email = sessionStorage.getItem('resetEmail');
    const response = await apiService.resetPassword(email, otp, newPassword);

    if (response.apiReportedSuccess) {
      sessionStorage.removeItem('resetEmail');
      setMessage('Password reset successful. Please login with your new password.');
      // Redirect to login
      window.location.href = '/login';
    } else {
      setError(response.message || 'Password reset failed');
    }
  } catch (error) {
    setError('Password reset failed');
  }
};
```

## API Endpoints

### User Authentication & Management

#### Login
```javascript
async loginUser(email, password) {
  return await this.post('/users/login', {
    body: { email, password },
    requiresAuth: false
  });
}
```

#### Register
```javascript
async registerUser(userData) {
  return await this.post('/users/register', {
    body: userData,
    requiresAuth: false
  });
}
```

#### Verify OTP
```javascript
async verifyOtp(userId, otp) {
  return await this.post('/users/verify-otp', {
    body: { userId, otpCode: otp },
    requiresAuth: false
  });
}
```

#### Resend Verification OTP
```javascript
async resendVerificationOtp(userId) {
  return await this.post('/users/resend-otp', {
    body: { userId },
    requiresAuth: false
  });
}
```

#### Get User Profile
```javascript
async getUserProfile() {
  return await this.get('/users/me');
}
```

#### Update User Profile
```javascript
async updateUserProfile(updates) {
  return await this.put('/users/me', { body: updates });
}
```

#### Upload Avatar
```javascript
async uploadAvatar(file, fileName) {
  // For web applications, you might need to handle base64 uploads
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
        fileName: fileName
      }
    });
  }
}
```

#### Get User Profile by ID
```javascript
async getUserProfileById(userId) {
  return await this.get(`/users/${userId}`);
}
```

#### Logout
```javascript
async logoutUser() {
  return await this.post('/users/logout', { body: {} });
}
```

### Password Management

#### Request Password Reset OTP
```javascript
async requestPasswordResetOtp(email) {
  return await this.post('/users/request-password-reset', {
    body: { email },
    requiresAuth: false
  });
}
```

#### Reset Password
```javascript
async resetPassword(email, otp, newPassword) {
  return await this.post('/users/reset-password', {
    body: { email, otpCode: otp, newPassword },
    requiresAuth: false
  });
}
```

### Email Management

#### Request Email Change OTP
```javascript
async requestEmailChangeOtp(newEmail) {
  return await this.post('/users/request-email-change', {
    body: { newEmail }
  });
}
```

#### Confirm Email Change
```javascript
async confirmEmailChange(newEmail, otpCode) {
  return await this.post('/users/confirm-change-email', {
    body: { newEmail, otpCode }
  });
}
```

#### Verify Email Change
```javascript
async verifyEmailChange(newEmail, otp) {
  return await this.post('/users/verify-email-change', {
    body: { newEmail, otp }
  });
}
```

#### Resend OTP by Email
```javascript
async resendOtpByEmail(email, purpose) {
  return await this.post('/users/resend-otp', {
    body: { email, purpose }
  });
}
```

### Products

#### Get Products
```javascript
async getProducts(filters = null) {
  return await this.get('/products/search', {
    queryParameters: filters
  });
}
```

#### Get Product Details
```javascript
async getProductDetails(productId) {
  return await this.get(`/products/${productId}`);
}
```

#### Get Product Ratings
```javascript
async getProductRatings(productId, page = 1, limit = 10) {
  return await this.get(`/products/${productId}/ratings`, {
    queryParameters: {
      page: page.toString(),
      limit: limit.toString()
    }
  });
}
```

#### Add Product
```javascript
async addProduct(productData, imageFiles = null) {
  if (imageFiles && imageFiles.length > 0) {
    // Convert productData values to strings for form fields
    const stringProductData = Object.fromEntries(
      Object.entries(productData).map(([key, value]) => [key, String(value)])
    );

    return await this.uploadFiles({
      endpoint: '/products',
      files: imageFiles,
      fieldName: 'images',
      fields: stringProductData,
      httpMethod: 'POST'
    });
  } else {
    return await this.post('/products', { body: productData });
  }
}
```

#### Update Product
```javascript
async updateProduct(productId, updates) {
  return await this.put(`/products/${productId}`, { body: updates });
}
```

#### Delete Product
```javascript
async deleteProduct(productId) {
  return await this.delete(`/products/${productId}`);
}
```

#### Rate Product
```javascript
async rateProduct(productId, rating, review = null) {
  const body = { rating };
  if (review) {
    body.review = review;
  }
  return await this.post(`/products/${productId}/ratings`, { body });
}
```

#### Get User Products
```javascript
async getUserProducts(filters = null) {
  return await this.get('/products/user', {
    queryParameters: filters
  });
}
```

### Contacts

#### Search Contacts
```javascript
async searchContacts(filters) {
  const queryParams = Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, String(value || '')])
  );
  return await this.get('/contacts/search', {
    queryParameters: queryParams
  });
}
```

#### Export Contacts
```javascript
async exportContacts(filters) {
  const queryParams = Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, String(value || '')])
  );
  return await this.get('/contacts/export', {
    queryParameters: queryParams
  });
}
```

#### Request Contacts Export OTP
```javascript
async requestContactsExportOtp() {
  return await this.post('/contacts/request-otp', { body: {} });
}
```

### Subscriptions & Payments

#### Get Subscription Plans
```javascript
async getSubscriptionPlans() {
  return await this.get('/subscriptions/plans', { requiresAuth: false });
}
```

#### Get Current Subscription
```javascript
async getCurrentSubscription() {
  return await this.get('/subscriptions/me');
}
```

#### Purchase Subscription
```javascript
async purchaseSubscription(planTypeString) {
  return await this.post('/subscriptions/purchase', {
    body: { planType: planTypeString }
  });
}
```

#### Upgrade Subscription
```javascript
async upgradeSubscription() {
  return await this.post('/subscriptions/upgrade', { body: {} });
}
```

#### Create Payment Intent
```javascript
async createPaymentIntent(planId, paymentMethod) {
  return await this.post('/payments/create-intent', {
    body: { planId, paymentMethod }
  });
}
```

#### Confirm Payment
```javascript
async confirmPayment(paymentId, confirmationData) {
  return await this.post(`/payments/${paymentId}/confirm`, {
    body: confirmationData
  });
}
```

#### Generate Payment URL
```javascript
generatePaymentUrl(sessionId) {
  return `${this.baseUrl}/payments/page/${sessionId}`;
}
```

### Wallet & Transactions

#### Get Wallet Details
```javascript
async getWalletDetails() {
  return await this.get('/wallet/me');
}
```

#### Initiate Withdrawal (New Payout System)
```javascript
async initiateWithdrawal(amount) {
  return await this.post('/withdrawals/user', {
    body: { amount }
  });
}
```

#### Update Momo Details
```javascript
async updateMomoDetails(momoNumber, momoOperator) {
  return await this.put('/users/me', {
    body: {
      momoNumber,
      momoOperator
    }
  });
}
```

#### Legacy Withdrawal Methods (Deprecated)
```javascript
// These methods are deprecated in favor of the new payout system

async requestWithdrawal(operator, phoneNumber, amount, password) {
  return await this.post('/wallet/withdraw', {
    body: { operator, phoneNumber, amount, password }
  });
}

async requestWithdrawalOtp(withdrawalData) {
  return await this.post('/wallet/request-withdrawal-otp', {
    body: withdrawalData
  });
}

async confirmWithdrawal(withdrawalData) {
  return await this.post('/wallet/confirm-withdrawal', {
    body: withdrawalData
  });
}
```

#### Convert Currency
```javascript
async convertCurrency(amount, fromCurrency, toCurrency) {
  return await this.post('/wallet/convert-currency', {
    body: { amount, fromCurrency, toCurrency }
  });
}
```

#### Legacy Currency Conversion (Payment Service)
```javascript
// Alternative currency conversion endpoints
async convertToXAF(amount, fromCurrency) {
  return await this.post('/payments/convertxfa', {
    body: { amount, fromCurrency },
    requiresAuth: false
  });
}

async convertCurrencyPayment(amount, fromCurrency, toCurrency) {
  return await this.post('/payments/convertcurrency', {
    body: { amount, fromCurrency, toCurrency },
    requiresAuth: false
  });
}
```

#### Get Transaction History
```javascript
async getTransactionHistory(filters = null) {
  return await this.get('/transactions/history', {
    queryParameters: filters
  });
}
```

#### Get Transaction by ID
```javascript
async getTransactionById(transactionId) {
  return await this.get(`/transactions/${transactionId}`);
}
```

#### Get Transaction Stats
```javascript
async getTransactionStats() {
  return await this.get('/transactions/stats');
}
```

#### Get Partner Transactions
```javascript
async getPartnerTransactions(filters = null) {
  return await this.get('/partners/me/transactions', {
    queryParameters: filters
  });
}
```

### Affiliation & Referrals

#### Get Affiliation Details
```javascript
async getAffiliationDetails() {
  return await this.get('/users/affiliation/me');
}
```

#### Get My Affiliator
```javascript
async getMyAffiliator() {
  return await this.get('/users/affiliator');
}
```

#### Get Affiliation Info
```javascript
async getAffiliationInfo(code) {
  return await this.get('/users/get-affiliation', {
    queryParameters: { referralCode: code }
  });
}
```

#### Get Referral Stats
```javascript
async getReferralStats() {
  return await this.get('/users/get-referals');
}
```

#### Get Referred Users
```javascript
async getReferredUsers(filters) {
  return await this.get('/users/get-refered-users', {
    queryParameters: filters
  });
}
```

### Notifications

#### Get Notifications
```javascript
async getNotifications() {
  return await this.get('/notifications/me');
}
```

#### Mark Notification as Read
```javascript
async markNotificationAsRead(notificationId) {
  return await this.post(`/notifications/${notificationId}/mark-read`, {
    body: {}
  });
}
```

### Support

#### Get FAQs
```javascript
async getFaqs() {
  return await this.get('/support/faq', { requiresAuth: false });
}
```

#### Submit Support Ticket
```javascript
async submitSupportTicket(ticketData) {
  return await this.post('/support/tickets', { body: ticketData });
}
```

### App Settings

#### Get App Settings
```javascript
async getAppSettings() {
  return await this.get('/settings', { requiresAuth: false });
}
```

### File Management

#### Get Settings File
```javascript
async getSettingsFile(fileId) {
  return await this.get(`/settings/files/${fileId}`, { requiresAuth: false });
}
```

#### Get File Thumbnail
```javascript
async getFileThumbnail(fileId) {
  return await this.get(`/settings/thumbnails/${fileId}`, { requiresAuth: false });
}
```

#### Generate Settings File URL
```javascript
generateSettingsFileUrl(fileId) {
  return `${this.baseUrl}/settings/files/${fileId}`;
}

generateSettingsThumbnailUrl(fileId) {
  return `${this.baseUrl}/settings/thumbnails/${fileId}`;
}
```

### Events

#### Get Events
```javascript
async getEvents(page = 1, limit = 10) {
  return await this.get('/events', {
    queryParameters: {
      page: page.toString(),
      limit: limit.toString()
    },
    requiresAuth: false
  });
}
```

#### Get Event by ID
```javascript
async getEventById(eventId) {
  return await this.get(`/events/${eventId}`, { requiresAuth: false });
}
```

#### Create Event
```javascript
async createEvent(eventData, imageFiles = null) {
  if (imageFiles && imageFiles.length > 0) {
    const stringEventData = Object.fromEntries(
      Object.entries(eventData).map(([key, value]) => [key, String(value)])
    );

    return await this.uploadFiles({
      endpoint: '/events',
      files: imageFiles,
      fieldName: 'images',
      fields: stringEventData,
      httpMethod: 'POST'
    });
  } else {
    return await this.post('/events', { body: eventData });
  }
}
```

#### Update Event
```javascript
async updateEvent(eventId, eventData, imageFiles = null) {
  if (imageFiles && imageFiles.length > 0) {
    const stringEventData = Object.fromEntries(
      Object.entries(eventData).map(([key, value]) => [key, String(value)])
    );

    return await this.uploadFiles({
      endpoint: `/events/${eventId}`,
      files: imageFiles,
      fieldName: 'images',
      fields: stringEventData,
      httpMethod: 'PUT'
    });
  } else {
    return await this.put(`/events/${eventId}`, { body: eventData });
  }
}
```

#### Delete Event
```javascript
async deleteEvent(eventId) {
  return await this.delete(`/events/${eventId}`);
}
```

### Partner Related

#### Get Partner Details
```javascript
async getPartnerDetails() {
  return await this.get('/partners/me');
}
```

### Payout & Withdrawal System

The SBC Payout System provides comprehensive money transfer capabilities using CinetPay's API, supporting user withdrawals across 9 African countries with mobile money integration.

#### Supported Countries & Operators

| Country | Country Code | Currency | momoOperator Values | Payment Methods |
|---------|--------------|----------|-------------------|------------------|
| **Cameroun** | CM | XAF | `MTN`, `ORANGE`, `mtn`, `orange` | Auto-detected |
| **Côte d'Ivoire** | CI | XOF | `ORANGE`, `MTN`, `MOOV`, `WAVE` | OM, MOMO, FLOOZ, WAVECI |
| **Sénégal** | SN | XOF | `ORANGE`, `FREE`, `WAVE` | OMSN, FREESN, WAVESN |
| **Togo** | TG | XOF | `TMONEY`, `FLOOZ` | TMONEYTG, FLOOZTG |
| **Benin** | BJ | XOF | `MTN`, `MOOV` | MTNBJ, MOOVBJ |
| **Mali** | ML | XOF | `ORANGE`, `MOOV` | OMML, MOOVML |
| **Burkina Faso** | BF | XOF | `ORANGE`, `MOOV` | OMBF, MOOVBF |
| **Guinea** | GN | GNF | `ORANGE`, `MTN` | OMGN, MTNGN |
| **Congo (RDC)** | CD | CDF | `ORANGE`, `MPESA`, `AIRTEL` | OMCD, MPESACD, AIRTELCD |

#### Valid momoNumber Format

The `momoNumber` field should include the **full international number with country code**:

**✅ Correct Formats:**
```
237675080477    (Cameroon MTN)
237655123456    (Cameroon Orange)
225070123456    (Côte d'Ivoire)
221771234567    (Sénégal)
228901234567    (Togo)
229901234567    (Benin)
223701234567    (Mali)
226701234567    (Burkina Faso)
224621234567    (Guinea)
243901234567    (Congo RDC)
```

**❌ Incorrect Formats:**
```
675080477       (Missing country code)
+237675080477   (Plus sign not needed)
0675080477      (Leading zero with country code)
```

#### Country Code Detection

The system automatically detects country codes from momoNumber:

| Country Code Prefix | Country | Example |
|-------------------|---------|----------|
| **237** | Cameroun | 237675080477 |
| **225** | Côte d'Ivoire | 225070123456 |
| **221** | Sénégal | 221771234567 |
| **228** | Togo | 228901234567 |
| **229** | Benin | 229901234567 |
| **223** | Mali | 223701234567 |
| **226** | Burkina Faso | 226701234567 |
| **224** | Guinea | 224621234567 |
| **243** | Congo (RDC) | 243901234567 |

#### User Withdrawal

Initiate a withdrawal using stored momo details. Users must have `momoNumber` and `momoOperator` configured in their profile.

```javascript
async initiateWithdrawal(amount) {
  return await this.post('/withdrawals/user', {
    body: { amount }
  });
}
```

**Requirements:**
- User must be authenticated
- User must have sufficient balance
- User must have `momoNumber` and `momoOperator` configured
- Amount must be ≥ 500 and multiple of 5

**Response:**
```javascript
{
  "success": true,
  "message": "Withdrawal initiated successfully",
  "data": {
    "transactionId": "SBC_user123_1640995200000",
    "cinetpayTransactionId": "EA250601.001443.R477918",
    "amount": 5000,
    "recipient": "+237675080477",
    "status": "pending",
    "estimatedCompletion": "2024-01-01T13:05:00.000Z"
  }
}
```

#### Update Momo Details

Users need to configure their mobile money details before withdrawing:

```javascript
async updateMomoDetails(momoNumber, momoOperator) {
  return await this.put('/users/me', {
    body: {
      momoNumber,
      momoOperator
    }
  });
}
```

**Example:**
```javascript
// Configure momo details
await apiService.updateMomoDetails('237675080477', 'MTN');

// Then initiate withdrawal
await apiService.initiateWithdrawal(5000);
```

#### Minimum Withdrawal Amounts by Country

| Country | Currency | Minimum Amount |
|---------|----------|----------------|
| **Cameroun** | XAF | 500 |
| **Côte d'Ivoire** | XOF | 200 |
| **Sénégal** | XOF | 200 |
| **Togo** | XOF | 150 |
| **Benin** | XOF | 500 |
| **Mali** | XOF | 500 |
| **Burkina Faso** | XOF | 500 |
| **Guinea** | GNF | 1000 |
| **Congo RDC** | CDF | 1000 |

#### Transaction Status

| Status | Description |
|--------|-------------|
| `pending` | Transaction created, awaiting processing |
| `processing` | Being processed by mobile operator |
| `completed` | Successfully completed |
| `failed` | Transaction failed |

#### Get Withdrawal History

```javascript
async getWithdrawalHistory(filters = null) {
  return await this.get('/transactions/history', {
    queryParameters: {
      ...filters,
      type: 'withdrawal'
    }
  });
}
```

#### Check Withdrawal Status

```javascript
async getWithdrawalStatus(transactionId) {
  return await this.get(`/transactions/${transactionId}`);
}
```

## Error Handling

### Error Codes
- `-1`: Network error (connection issues)
- `-2`: HTTP error (server connection failed)
- `-3`: Unexpected error (parsing, etc.)
- `0`: Generic error from `ApiResponse.fromError`

### Error Handling Pattern
```javascript
const handleApiResponse = (response) => {
  if (response.isOverallSuccess) {
    // Success - use response.body.data
    console.log('Success:', response.message);
    return response.body.data;
  } else {
    // Error - handle based on status code
    console.error('Error:', response.message);

    if (response.statusCode === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (response.statusCode === -1) {
      // Network error
      alert('Network error. Please check your connection.');
    } else {
      // Other errors
      alert(response.message || 'An error occurred');
    }

    throw new Error(response.message);
  }
};
```

## Usage Examples

### React Hook for API Service
```javascript
import { useState, useEffect } from 'react';

const useApiService = () => {
  const [apiService] = useState(() => new ApiService());

  return apiService;
};

// Usage in component
const MyComponent = () => {
  const apiService = useApiService();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await apiService.getProducts();
      const data = handleApiResponse(response);
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {products.map(product => (
            <li key={product.id}>{product.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### Login Example
```javascript
const LoginComponent = () => {
  const apiService = useApiService();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await apiService.loginUser(email, password);
      const data = handleApiResponse(response);

      // Store token
      localStorage.setItem('token', data.token);

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
};
```

### File Upload Example
```javascript
const ProductUpload = () => {
  const apiService = useApiService();
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: ''
  });
  const [images, setImages] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await apiService.addProduct(productData, images);
      const data = handleApiResponse(response);

      alert('Product added successfully!');
      // Reset form
      setProductData({ name: '', description: '', price: '' });
      setImages([]);
    } catch (error) {
      console.error('Failed to add product:', error);
    }
  };

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files));
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={productData.name}
        onChange={(e) => setProductData({...productData, name: e.target.value})}
        placeholder="Product Name"
        required
      />
      <textarea
        value={productData.description}
        onChange={(e) => setProductData({...productData, description: e.target.value})}
        placeholder="Description"
        required
      />
      <input
        type="number"
        value={productData.price}
        onChange={(e) => setProductData({...productData, price: e.target.value})}
        placeholder="Price"
        required
      />
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageChange}
      />
      <button type="submit">Add Product</button>
    </form>
  );
};
```

### Settings and File Management Example
```javascript
const SettingsComponent = () => {
  const apiService = useApiService();
  const [appSettings, setAppSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiService.getAppSettings();
        const data = handleApiResponse(response);
        setAppSettings(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const downloadFile = (fileId, filename) => {
    const fileUrl = apiService.generateSettingsFileUrl(fileId);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.click();
  };

  return (
    <div>
      {appSettings && (
        <div>
          <h3>App Settings</h3>
          {appSettings.logoUrl && (
            <img
              src={apiService.generateSettingsFileUrl(appSettings.logoFileId)}
              alt="App Logo"
              style={{ maxWidth: '200px' }}
            />
          )}

          {appSettings.termsPdfId && (
            <button onClick={() => downloadFile(appSettings.termsPdfId, 'terms.pdf')}>
              Download Terms & Conditions
            </button>
          )}

          {appSettings.presentationPdfId && (
            <button onClick={() => downloadFile(appSettings.presentationPdfId, 'presentation.pdf')}>
              Download Presentation
            </button>
          )}
        </div>
      )}
    </div>
  );
};
```

### Currency Conversion Example
```javascript
const CurrencyConverter = () => {
  const apiService = useApiService();
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('XAF');
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleConversion = async () => {
    if (!amount) return;

    setLoading(true);
    try {
      const response = await apiService.convertCurrency(amount, fromCurrency, toCurrency);
      const data = handleApiResponse(response);

      // Handle different response formats
      if (typeof data === 'object' && data.amount) {
        setConvertedAmount(data.amount);
      } else if (typeof data === 'number') {
        setConvertedAmount(data);
      }
    } catch (error) {
      console.error('Currency conversion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Currency Converter</h3>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="XAF">XAF</option>
        <option value="XOF">XOF</option>
      </select>
      <span> to </span>
      <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
        <option value="XAF">XAF</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="XOF">XOF</option>
      </select>
      <button onClick={handleConversion} disabled={loading}>
        {loading ? 'Converting...' : 'Convert'}
      </button>

      {convertedAmount && (
        <p>Converted Amount: {convertedAmount} {toCurrency}</p>
      )}
    </div>
  );
};
```

### Withdrawal Example
```javascript
const WithdrawalComponent = () => {
  const apiService = useApiService();
  const [amount, setAmount] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoOperator, setMomoOperator] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Load user profile to check momo details
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await apiService.getUserProfile();
        const data = handleApiResponse(response);
        setUserProfile(data);
        setMomoNumber(data.momoNumber || '');
        setMomoOperator(data.momoOperator || '');
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    loadProfile();
  }, []);

  // Update momo details if needed
  const updateMomoDetails = async () => {
    try {
      const response = await apiService.updateMomoDetails(momoNumber, momoOperator);
      handleApiResponse(response);
      alert('Momo details updated successfully!');
    } catch (error) {
      console.error('Failed to update momo details:', error);
    }
  };

  // Initiate withdrawal
  const handleWithdrawal = async (e) => {
    e.preventDefault();

    if (!userProfile?.momoNumber || !userProfile?.momoOperator) {
      alert('Please configure your mobile money details first.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.initiateWithdrawal(parseInt(amount));
      const data = handleApiResponse(response);

      alert(`Withdrawal initiated successfully! Transaction ID: ${data.transactionId}`);
      setAmount('');
    } catch (error) {
      console.error('Withdrawal failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Mobile Money Configuration</h3>
      <div>
        <input
          type="text"
          value={momoNumber}
          onChange={(e) => setMomoNumber(e.target.value)}
          placeholder="Mobile Money Number (e.g., 237675080477)"
        />
        <select
          value={momoOperator}
          onChange={(e) => setMomoOperator(e.target.value)}
        >
          <option value="">Select Operator</option>
          <option value="MTN">MTN</option>
          <option value="ORANGE">Orange</option>
          <option value="MOOV">Moov</option>
          <option value="WAVE">Wave</option>
          <option value="FREE">Free</option>
          <option value="TMONEY">T-Money</option>
          <option value="FLOOZ">Flooz</option>
          <option value="MPESA">M-Pesa</option>
          <option value="AIRTEL">Airtel</option>
        </select>
        <button onClick={updateMomoDetails}>Update Momo Details</button>
      </div>

      <h3>Withdraw Funds</h3>
      <form onSubmit={handleWithdrawal}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (minimum 500)"
          min="500"
          step="5"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Withdraw'}
        </button>
      </form>

      <div>
        <h4>Important Notes:</h4>
        <ul>
          <li>Amount must be at least 500 and multiple of 5</li>
          <li>Use full international number format (e.g., 237675080477)</li>
          <li>Ensure sufficient balance before withdrawal</li>
          <li>Processing time: 1-5 minutes</li>
        </ul>
      </div>
    </div>
  );
};
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
# or
yarn install
```

### 2. Create API Service Files
Create the following files in your React project:

- `src/services/ApiService.js` - Main API service class
- `src/services/ApiResponse.js` - Response handling class
- `src/utils/apiHelpers.js` - Helper functions

### 3. Environment Configuration
Create a `.env` file:
```
VITE_API_BASE_URL=https://sniperbuisnesscenter.com/api
VITE_PAYMENT_URL=https://sniperbuisnesscenter.com/payment/
```

### 4. Usage in React
```javascript
import { ApiService } from './services/ApiService';

// Create a singleton instance
const apiService = new ApiService();

export default apiService;
```

## Additional API Features

### File Management
- **Settings Files**: Access to app logos, terms PDFs, presentation files
- **File URLs**: Generate direct URLs for file access
- **Thumbnails**: Access to file thumbnails when available
- **Download Support**: Direct file download capabilities

### Currency Conversion
- **Multi-Currency Support**: Convert between various African and international currencies
- **Real-time Rates**: Live currency conversion rates
- **Multiple Endpoints**: Both wallet and payment service conversion endpoints
- **Flexible Response**: Handle different response formats (object or number)

### Events Management
- **Event Listing**: Paginated event listings
- **Event Details**: Individual event information
- **Event Creation**: Create events with image uploads
- **Event Updates**: Update existing events
- **Public Access**: Most event endpoints don't require authentication

### Advanced Features
- **Pagination**: Consistent pagination across product, transaction, and event endpoints
- **Filtering**: Advanced filtering options for products, transactions, and contacts
- **File Uploads**: Support for multiple file types (images, documents)
- **Base64 Support**: Web-compatible base64 file uploads
- **Error Recovery**: Comprehensive error handling patterns

## Payout System Features

### Key Features
- **Multi-Country Support**: 9 African countries with mobile money
- **Auto-Detection**: Automatic operator detection from phone numbers
- **Real-time Status**: Transaction status updates
- **Secure Transfers**: CinetPay integration for reliable money transfers
- **Balance Protection**: Prevents overdrafts and validates sufficient funds

### Security & Validation
- **Authentication**: JWT tokens required for all withdrawal operations
- **Input Validation**: Comprehensive validation of amounts and phone numbers
- **Balance Verification**: Real-time balance checking before withdrawal
- **Rate Limiting**: Prevents abuse of withdrawal endpoints
- **Audit Trail**: Complete transaction logging for accountability

### Error Handling for Withdrawals
```javascript
const handleWithdrawalError = (error, response) => {
  if (response?.statusCode === 400) {
    if (response.message.includes('insufficient balance')) {
      alert('Insufficient balance for withdrawal');
    } else if (response.message.includes('momo details')) {
      alert('Please configure your mobile money details first');
    } else if (response.message.includes('minimum amount')) {
      alert('Amount must be at least 500 and multiple of 5');
    }
  } else if (response?.statusCode === 401) {
    alert('Please log in to continue');
    // Redirect to login
  } else {
    alert('Withdrawal failed. Please try again later.');
  }
};
```

### Common Query Parameters

Many endpoints support these common query parameters:

```javascript
// Pagination
{
  page: '1',
  limit: '10'
}

// Sorting
{
  sortBy: 'createdAt',
  sortOrder: 'desc' // or 'asc'
}

// Filtering
{
  status: 'completed', // or 'pending', 'failed'
  search: 'search term',
  category: 'category name',
  subcategory: 'subcategory name'
}

// Date filtering
{
  startDate: '2024-01-01',
  endDate: '2024-12-31'
}
```

### Product Management Flow

#### Product Listing with Search and Filters
```javascript
const ProductListingFlow = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: ''
  });

  const loadProducts = async (loadMore = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const currentPage = loadMore ? page : 1;
      const queryFilters = {
        page: currentPage.toString(),
        limit: '10',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        )
      };

      const response = await apiService.getProducts(queryFilters);
      const data = handleApiResponse(response);

      if (loadMore) {
        setProducts(prev => [...prev, ...data.products]);
      } else {
        setProducts(data.products);
      }

      setHasMore(data.products.length === 10);
      setPage(loadMore ? page + 1 : 2);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load products when filters change
  useEffect(() => {
    setPage(1);
    loadProducts();
  }, [filters]);

  return (
    <div>
      {/* Search and Filter UI */}
      <div>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          placeholder="Search products..."
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
        >
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="fashion">Fashion</option>
          {/* Add more categories */}
        </select>
      </div>

      {/* Product Grid */}
      <div className="product-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <button onClick={() => loadProducts(true)} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};
```

#### Product Creation Flow
```javascript
const ProductCreationFlow = () => {
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    condition: 'new',
    location: ''
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageSelection = (e) => {
    const files = Array.from(e.target.files);

    // Validate file size (max 5MB per image)
    const validFiles = files.filter(file => {
      if (file.size > 5242880) {
        alert(`${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    // Limit to 5 images total
    const remainingSlots = 5 - images.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    setImages(prev => [...prev, ...filesToAdd]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiService.addProduct(productData, images);
      const data = handleApiResponse(response);

      alert('Product created successfully!');

      // Reset form
      setProductData({
        name: '',
        description: '',
        price: '',
        category: '',
        subcategory: '',
        condition: 'new',
        location: ''
      });
      setImages([]);

      // Redirect to product list or product detail
      window.location.href = `/products/${data.productId}`;
    } catch (error) {
      console.error('Product creation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={productData.name}
        onChange={(e) => setProductData({...productData, name: e.target.value})}
        placeholder="Product Name"
        required
      />

      <textarea
        value={productData.description}
        onChange={(e) => setProductData({...productData, description: e.target.value})}
        placeholder="Product Description"
        required
      />

      <input
        type="number"
        value={productData.price}
        onChange={(e) => setProductData({...productData, price: e.target.value})}
        placeholder="Price"
        required
      />

      {/* Image Upload */}
      <div>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageSelection}
          disabled={images.length >= 5}
        />
        <p>{images.length}/5 images selected</p>

        {/* Image Preview */}
        <div className="image-preview">
          {images.map((image, index) => (
            <div key={index}>
              <img
                src={URL.createObjectURL(image)}
                alt={`Preview ${index}`}
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => setImages(images.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Product'}
      </button>
    </form>
  );
};
```

### User Profile & Info Management Flow

#### Profile Loading and Display
```javascript
const ProfileManagementFlow = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const response = await apiService.getUserProfile();
      const data = handleApiResponse(response);

      setProfile(data);

      // Update localStorage with fresh data
      localStorage.setItem('balance', data.balance?.toString() || '0');
      localStorage.setItem('userName', data.name || '');
      if (data.avatar) {
        localStorage.setItem('avatar', data.avatar);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const response = await apiService.updateUserProfile(updates);
      handleApiResponse(response);

      // Reload profile to get updated data
      await loadProfile();
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) return <div>Loading profile...</div>;

  return (
    <div>
      {!editing ? (
        <ProfileDisplay profile={profile} onEdit={() => setEditing(true)} />
      ) : (
        <ProfileEditor
          profile={profile}
          onSave={updateProfile}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
};
```

#### Avatar Upload Flow
```javascript
const AvatarUploadFlow = () => {
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(
    localStorage.getItem('avatar')
  );

  const handleAvatarUpload = async (file) => {
    if (!file) return;

    // Validate file
    if (file.size > 5242880) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    setUploading(true);
    try {
      const fileName = `avatar_${Date.now()}.${file.name.split('.').pop()}`;
      const response = await apiService.uploadAvatar(file, fileName);
      const data = handleApiResponse(response);

      // Update avatar URL
      const newAvatarUrl = data.avatarUrl || data.url;
      if (newAvatarUrl) {
        setCurrentAvatar(newAvatarUrl);
        localStorage.setItem('avatar', newAvatarUrl);
        alert('Avatar updated successfully!');
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="avatar-display">
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt="Avatar"
            style={{ width: '100px', height: '100px', borderRadius: '50%' }}
          />
        ) : (
          <div className="avatar-placeholder">No Avatar</div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleAvatarUpload(e.target.files[0])}
        disabled={uploading}
      />

      {uploading && <p>Uploading...</p>}
    </div>
  );
};
```

### Transaction & Wallet Flow

#### Wallet Dashboard
```javascript
const WalletDashboardFlow = () => {
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadWalletData = async () => {
    try {
      // Load wallet, transactions, and stats concurrently
      const [walletResponse, transactionsResponse, statsResponse] = await Promise.all([
        apiService.getWalletDetails(),
        apiService.getTransactionHistory({
          limit: '5',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }),
        apiService.getTransactionStats()
      ]);

      const wallet = handleApiResponse(walletResponse);
      const transactionData = handleApiResponse(transactionsResponse);
      const statsData = handleApiResponse(statsResponse);

      setWalletData(wallet);
      setTransactions(transactionData.transactions || []);
      setStats(statsData);

      // Update localStorage balance
      localStorage.setItem('balance', wallet.balance?.toString() || '0');
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  if (loading) return <div>Loading wallet...</div>;

  return (
    <div>
      <WalletCard balance={walletData?.balance} />
      <TransactionStats stats={stats} />
      <RecentTransactions transactions={transactions} />
    </div>
  );
};
```

### File Management Flow

#### Settings File Access
```javascript
const SettingsFileFlow = () => {
  const [appSettings, setAppSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAppSettings = async () => {
    try {
      const response = await apiService.getAppSettings();
      const data = handleApiResponse(response);

      setAppSettings(data);

      // Cache settings in localStorage
      localStorage.setItem('appSettings_logoUrl', data.logoUrl || '');
      localStorage.setItem('appSettings_termsPdfId', data.termsPdfId || '');
      localStorage.setItem('appSettings_presentationPdfId', data.presentationPdfId || '');
      localStorage.setItem('appSettings_telegramUrl', data.telegramUrl || '');
      localStorage.setItem('appSettings_whatsappUrl', data.whatsappUrl || '');
    } catch (error) {
      console.error('Failed to load app settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (fileId, filename) => {
    if (!fileId) {
      alert('File not available');
      return;
    }

    const fileUrl = apiService.generateSettingsFileUrl(fileId);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.target = '_blank';
    link.click();
  };

  const openExternalLink = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Link not available');
    }
  };

  useEffect(() => {
    loadAppSettings();
  }, []);

  return (
    <div>
      {appSettings && (
        <div>
          {/* App Logo */}
          {appSettings.logoFileId && (
            <img
              src={apiService.generateSettingsFileUrl(appSettings.logoFileId)}
              alt="App Logo"
              style={{ maxHeight: '100px' }}
            />
          )}

          {/* Download Links */}
          <div>
            <button
              onClick={() => downloadFile(appSettings.termsPdfId, 'terms-and-conditions.pdf')}
              disabled={!appSettings.termsPdfId}
            >
              Download Terms & Conditions
            </button>

            <button
              onClick={() => downloadFile(appSettings.presentationPdfId, 'presentation.pdf')}
              disabled={!appSettings.presentationPdfId}
            >
              Download Presentation
            </button>
          </div>

          {/* External Links */}
          <div>
            <button onClick={() => openExternalLink(appSettings.telegramUrl)}>
              Join Telegram
            </button>

            <button onClick={() => openExternalLink(appSettings.whatsappUrl)}>
              Join WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Notification Management Flow

```javascript
const NotificationFlow = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const response = await apiService.getNotifications();
      const data = handleApiResponse(response);

      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiService.markNotificationAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div>
      {loading ? (
        <div>Loading notifications...</div>
      ) : (
        <div>
          {notifications.length === 0 ? (
            <div>No notifications</div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification ${notification.read ? 'read' : 'unread'}`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <p>{notification.message}</p>
                <small>{new Date(notification.createdAt).toLocaleDateString()}</small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
```

### Error Handling Best Practices

```javascript
// Global error handler for API responses
const handleApiResponse = (response) => {
  if (response.isOverallSuccess) {
    return response.body.data || response.body;
  } else {
    // Handle specific error cases
    if (response.statusCode === 401) {
      // Unauthorized - redirect to login
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    } else if (response.statusCode === 403) {
      throw new Error('Access denied. You do not have permission for this action.');
    } else if (response.statusCode === 404) {
      throw new Error('Resource not found.');
    } else if (response.statusCode === 429) {
      throw new Error('Too many requests. Please wait and try again.');
    } else if (response.statusCode >= 500) {
      throw new Error('Server error. Please try again later.');
    } else {
      throw new Error(response.message || 'An error occurred');
    }
  }
};

// Network error handler
const handleNetworkError = (error) => {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  } else if (error.message.includes('timeout')) {
    return 'Request timeout. Please try again.';
  } else {
    return error.message || 'An unexpected error occurred.';
  }
};
```

This documentation provides a complete guide for React developers to integrate with the same backend API used by the Flutter application, including comprehensive user flows for authentication, product management, profile handling, file management, and more. The implementation maintains the same structure and error handling patterns while adapting to JavaScript/React conventions.
