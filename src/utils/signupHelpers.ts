/**
 * Utility functions for managing signup form data and cache clearing
 */

// Storage keys used by signup form
export const SIGNUP_STORAGE_KEYS = {
  DATA: 'signupFormData',
  STEP: 'signupFormStep',
};

/**
 * Clear all signup-related data from localStorage and URL parameters
 * This should be called when:
 * - User successfully completes signup
 * - User successfully logs in
 * - User manually wants to clear cached data
 */
export const clearSignupCache = (): void => {
  try {
    // Clear localStorage data
    localStorage.removeItem(SIGNUP_STORAGE_KEYS.DATA);
    localStorage.removeItem(SIGNUP_STORAGE_KEYS.STEP);
    
    // Clear URL parameters (affiliation code, etc.) by replacing current URL
    if (window.location.search) {
      const url = new URL(window.location.href);
      url.search = ''; // Remove all query parameters
      window.history.replaceState({}, document.title, url.toString());
    }
    
    console.log('✅ Signup cache cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing signup cache:', error);
  }
};

/**
 * Check if there's cached signup data
 */
export const hasSignupCache = (): boolean => {
  try {
    const hasData = localStorage.getItem(SIGNUP_STORAGE_KEYS.DATA) !== null;
    const hasStep = localStorage.getItem(SIGNUP_STORAGE_KEYS.STEP) !== null;
    return hasData || hasStep;
  } catch (error) {
    console.error('Error checking signup cache:', error);
    return false;
  }
};

/**
 * Get cached signup data
 */
export const getSignupCache = (): { data: any | null; step: number | null } => {
  try {
    const dataStr = localStorage.getItem(SIGNUP_STORAGE_KEYS.DATA);
    const stepStr = localStorage.getItem(SIGNUP_STORAGE_KEYS.STEP);
    
    return {
      data: dataStr ? JSON.parse(dataStr) : null,
      step: stepStr ? parseInt(stepStr, 10) : null,
    };
  } catch (error) {
    console.error('Error getting signup cache:', error);
    return { data: null, step: null };
  }
};

/**
 * Clear signup cache and show success message
 */
export const clearSignupCacheWithFeedback = (): void => {
  const hadCache = hasSignupCache();
  clearSignupCache();
  
  if (hadCache) {
    console.log('🧹 Previous signup data cleared for better security');
  }
};