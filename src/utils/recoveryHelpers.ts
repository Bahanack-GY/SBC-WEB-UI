/**
 * Recovery system utilities and helpers
 */

// Phone number validation and utilities
export const isEmail = (str: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

export const isPhoneNumber = (str: string): boolean => {
  return /^\+?[\d\s-()]+$/.test(str) && str.replace(/\D/g, '').length >= 8;
};

// Phone number normalization for international formats
export const normalizePhoneNumber = (phone: string, countryCode?: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Country prefixes mapping
  const countryPrefixes: Record<string, string> = {
    'CM': '237',  // Cameroon
    'TG': '228',  // Togo
    'GH': '233',  // Ghana
    'BF': '226',  // Burkina Faso
    'CI': '225',  // Côte d'Ivoire
    'SN': '221',  // Senegal
    'BJ': '229',  // Benin
    'CG': '242',  // Congo-Brazzaville
    'CD': '243',  // Congo-Kinshasa
    'ML': '223',  // Mali
    'NE': '227',  // Niger
    'GN': '224',  // Guinea
    'GA': '241',  // Gabon
    'KE': '254',  // Kenya
  };
  
  // If country code is provided and digits don't start with country prefix, add it
  if (countryCode && countryPrefixes[countryCode]) {
    const prefix = countryPrefixes[countryCode];
    if (!digits.startsWith(prefix) && digits.length >= 8) {
      return prefix + digits;
    }
  }
  
  return digits.length >= 8 ? digits : phone;
};

// Detect identifier type (email vs phone)
export const getIdentifierType = (identifier: string): 'email' | 'phone' | 'unknown' => {
  if (isEmail(identifier)) {
    return 'email';
  } else if (isPhoneNumber(identifier)) {
    return 'phone';
  } else {
    return 'unknown';
  }
};

// Safe API call wrapper for recovery endpoints
export const safeRecoveryApiCall = async (
  apiCall: () => Promise<any>
): Promise<any | null> => {
  try {
    const response = await apiCall();
    
    // Check for various error conditions
    if (!response) {
      console.warn('Recovery API: No response received');
      return null;
    }
    
    // Handle HTTP error status codes
    if (response.status && response.status >= 400) {
      if (response.status === 404) {
        console.warn('Recovery API: Endpoint not found (404) - recovery features may not be available');
      } else {
        console.warn(`Recovery API: HTTP ${response.status} error`);
      }
      return null;
    }
    
    // Handle API response structure
    if (response.isOverallSuccess === false) {
      console.warn('Recovery API: Request failed with success=false');
      return null;
    }
    
    return response;
  } catch (error: any) {
    // Handle network errors and other exceptions
    if (error?.message?.includes('404') || error?.status === 404) {
      console.warn('Recovery API: Endpoint not found - recovery endpoints may not be implemented yet');
    } else if (error?.message?.includes('Network Error') || error?.code === 'NETWORK_ERROR') {
      console.warn('Recovery API: Network error - service may be unavailable');
    } else {
      console.error('Recovery API error:', error);
    }
    return null; // Always graceful fallback
  }
};

// Extract country code from phone number
export const extractCountryCode = (phoneNumber: string): string | null => {
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Common country codes (longest first to avoid conflicts)
  const countryCodes = [
    { code: '237', country: 'CM' }, // Cameroon
    { code: '243', country: 'CD' }, // Congo-Kinshasa
    { code: '242', country: 'CG' }, // Congo-Brazzaville
    { code: '233', country: 'GH' }, // Ghana
    { code: '229', country: 'BJ' }, // Benin
    { code: '228', country: 'TG' }, // Togo
    { code: '227', country: 'NE' }, // Niger
    { code: '226', country: 'BF' }, // Burkina Faso
    { code: '225', country: 'CI' }, // Côte d'Ivoire
    { code: '224', country: 'GN' }, // Guinea
    { code: '223', country: 'ML' }, // Mali
    { code: '221', country: 'SN' }, // Senegal
    { code: '254', country: 'KE' }, // Kenya
    { code: '241', country: 'GA' }, // Gabon
  ];
  
  for (const { code, country } of countryCodes) {
    if (digits.startsWith(code)) {
      return country;
    }
  }
  
  return null;
};

// Format phone number for display
export const formatPhoneForDisplay = (phoneNumber: string): string => {
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it looks like an international number, format with +
  if (digits.length > 10) {
    return '+' + digits;
  }
  
  return phoneNumber;
};

// Recovery error handling
export const handleRecoveryError = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error?.body?.message) {
    return error.body.message;
  }
  
  return 'Une erreur est survenue lors de la vérification de récupération';
};

// Debounce utility for recovery checks
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};