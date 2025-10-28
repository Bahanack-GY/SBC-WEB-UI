import { ApiResponse } from '../services/ApiResponse';

/**
 * Get headers for API requests
 */
export const getHeaders = (requiresAuth: boolean = true, isFormData: boolean = false): Record<string, string> => {
  const headers: Record<string, string> = {
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

/**
 * Handle API response with consistent error handling
 */
export const handleApiResponse = (response: ApiResponse): any => {
  // Handle critical errors regardless of body.success
  if (response.statusCode === 401) {
    // Unauthorized - Throw a specific error, let the caller handle authentication/redirect
    throw new Error('Mot de passe ou email incorrect');
  } else if (response.statusCode === -1) {
    // Network error (handled by ApiService fetch catch block)
    throw new Error(response.message || 'Network error: Please check your connection and try again.');
  }

  // For 2xx status codes, return data if available, even if body.success is false
  // This allows components to handle partial successes or data returned with errors.
  if (response.isSuccessByStatusCode) {
    if (response.body?.data !== undefined && response.body.data !== null) {
      // If body.success is false but data is present, still return data
      // The calling code (e.g., in Signup.tsx for getAffiliationInfo) can check body.success if needed
      return response.body.data;
    } else if (response.body?.stats !== undefined && response.body.stats !== null) {
      return response.body.stats;
    } else if (response.body?.transactions !== undefined && response.body.transactions !== null) {
      return response.body.transactions;
    } else if (response.body?.success === true) {
      // If status is success and body.success is true, return data or true if no data
      return response.body.data !== undefined && response.body.data !== null ? response.body.data : true; // Return true for success without explicit data
    }
    // If none of the above, return the whole body (for flexible API responses)
    return response.body;
  }

  // If not a successful status code or successful body response with data, throw an error
  // Prefer specific message from body, then ApiResponse message, then a generic one.
  if (response.body?.message) {
    throw new Error(response.body.message);
  } else if (response.message) {
    throw new Error(response.message);
  } else {
    throw new Error('An unexpected API error occurred.');
  }
};

/**
 * Get base URL from environment
 */
export const getBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'https://sniperbuisnesscenter.com/api';
};

/**
 * Get payment URL from environment
 */
export const getPaymentUrl = (): string => {
  return import.meta.env.VITE_PAYMENT_URL || 'https://sniperbuisnesscenter.com/api/payment/';
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Get current user token
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Set user token
 */
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Remove user token (logout)
 */
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Format query parameters for URL
 */
export const formatQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

/**
 * Removes accents from a string.
 */
export const removeAccents = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};
