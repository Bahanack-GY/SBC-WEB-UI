/**
 * Balance conversion utilities and error handling
 * Based on SBC Frontend Currency API Guide
 */

// Exchange rates from corrected API guide
export const EXCHANGE_RATES = {
  // Conversion rates (corrected)
  CONVERSION: {
    USD_TO_XAF: 500,  // 1 USD = 500 XAF (better rate for users converting USD to XAF)
    XAF_TO_USD: 1/660  // 660 XAF = 1 USD (less favorable to discourage XAF to USD conversions)
  },
  // For display purposes
  DISPLAY: {
    USD_TO_XAF_RATE: 500,  // When converting USD → XAF
    XAF_TO_USD_RATE: 660   // When converting XAF → USD (660 XAF needed for 1 USD)
  }
};

// Minimum conversion amounts from API guide
export const CONVERSION_MINIMUMS = {
  USD_TO_XAF: 1,    // Minimum 1 USD
  XAF_TO_USD: 660   // Minimum 660 XAF (updated based on corrected rate)
};

// Crypto withdrawal minimums from API guide - $15 USD minimum
export const CRYPTO_MINIMUMS = {
  USD: 15 // Minimum $15 USD for all crypto withdrawals
};

export interface BalanceConversionError {
  type: 'insufficient_funds' | 'conversion_rate' | 'network' | 'validation' | 'unknown';
  message: string;
  details?: string;
}

/**
 * Parse and categorize balance conversion errors
 */
export function parseBalanceConversionError(error: unknown): BalanceConversionError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Insufficient funds
    if (message.includes('insufficient') || message.includes('balance') || message.includes('funds')) {
      return {
        type: 'insufficient_funds',
        message: 'Solde insuffisant pour effectuer cette conversion',
        details: error.message
      };
    }
    
    // Conversion rate issues
    if (message.includes('rate') || message.includes('conversion') || message.includes('exchange')) {
      return {
        type: 'conversion_rate',
        message: 'Impossible d\'obtenir le taux de change. Veuillez réessayer.',
        details: error.message
      };
    }
    
    // Network/API issues
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return {
        type: 'network',
        message: 'Problème de connexion. Vérifiez votre connexion internet.',
        details: error.message
      };
    }
    
    // Validation errors
    if (message.includes('invalid') || message.includes('validation') || message.includes('required')) {
      return {
        type: 'validation',
        message: 'Données invalides. Vérifiez les montants saisis.',
        details: error.message
      };
    }
    
    return {
      type: 'unknown',
      message: error.message || 'Une erreur inattendue s\'est produite',
      details: error.message
    };
  }
  
  return {
    type: 'unknown',
    message: 'Une erreur inattendue s\'est produite',
    details: String(error)
  };
}

/**
 * Format balance amounts with proper currency symbols and localization
 */
export function formatBalance(amount: number, currency: 'FCFA' | 'USD'): string {
  if (currency === 'FCFA') {
    return `${amount.toLocaleString('fr-FR')} F`;
  } else {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Validate conversion amount against available balance and API requirements
 */
export function validateConversionAmount(
  amount: number, 
  availableBalance: number, 
  fromCurrency: 'FCFA' | 'USD',
  toCurrency: 'FCFA' | 'USD'
): { isValid: boolean; error?: string } {
  if (!amount || amount <= 0) {
    return {
      isValid: false,
      error: 'Veuillez entrer un montant valide supérieur à zéro'
    };
  }
  
  if (amount > availableBalance) {
    return {
      isValid: false,
      error: `Montant insuffisant. Solde disponible: ${formatBalance(availableBalance, fromCurrency)}`
    };
  }
  
  // API-specific minimum conversion amounts
  let minAmount: number;
  if (fromCurrency === 'USD' && toCurrency === 'FCFA') {
    minAmount = CONVERSION_MINIMUMS.USD_TO_XAF; // 1 USD minimum
  } else if (fromCurrency === 'FCFA' && toCurrency === 'USD') {
    minAmount = CONVERSION_MINIMUMS.XAF_TO_USD; // 660 XAF minimum
  } else {
    return {
      isValid: false,
      error: 'Paire de devises non prise en charge'
    };
  }
  
  if (amount < minAmount) {
    return {
      isValid: false,
      error: `Montant minimum requis: ${formatBalance(minAmount, fromCurrency)}`
    };
  }
  
  return { isValid: true };
}

/**
 * Validate crypto withdrawal amount
 */
export function validateCryptoAmount(
  amount: number,
  _currency: string,
  availableUsdBalance: number
): { isValid: boolean; error?: string } {
  if (!amount || amount <= 0) {
    return {
      isValid: false,
      error: 'Veuillez entrer un montant valide supérieur à zéro'
    };
  }
  
  if (amount > availableUsdBalance) {
    return {
      isValid: false,
      error: `Solde USD insuffisant. Disponible: $${availableUsdBalance.toFixed(2)}`
    };
  }
  
  // Check minimum USD amount for crypto withdrawals
  if (amount < CRYPTO_MINIMUMS.USD) {
    return {
      isValid: false,
      error: `Montant minimum pour les retraits crypto: $${CRYPTO_MINIMUMS.USD} USD`
    };
  }
  
  return { isValid: true };
}

/**
 * Get user-friendly error messages for common balance operations
 */
export function getBalanceErrorMessage(errorType: string, context?: string): string {
  switch (errorType) {
    case 'insufficient_balance':
      return 'Solde insuffisant pour effectuer cette opération';
    case 'currency_not_supported':
      return 'Cette devise n\'est pas prise en charge';
    case 'conversion_failed':
      return 'Échec de la conversion. Veuillez réessayer.';
    case 'rate_unavailable':
      return 'Taux de change indisponible. Veuillez réessayer plus tard.';
    case 'minimum_amount':
      return 'Le montant est inférieur au minimum requis';
    case 'maximum_amount':
      return 'Le montant dépasse la limite autorisée';
    case 'invalid_amount':
      return 'Montant invalide. Veuillez vérifier la valeur saisie.';
    case 'network_error':
      return 'Erreur de connexion. Vérifiez votre connexion internet.';
    case 'server_error':
      return 'Erreur du serveur. Veuillez réessayer plus tard.';
    case 'unauthorized':
      return 'Session expirée. Veuillez vous reconnecter.';
    default:
      return context || 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
  }
}

/**
 * Currency conversion rate formatter using corrected fixed rates
 */
export function formatConversionRate(_fromAmount: number, fromCurrency: 'FCFA' | 'USD', _toAmount: number, toCurrency: 'FCFA' | 'USD'): string {
  // Use corrected conversion rates for display
  if (fromCurrency === 'USD' && toCurrency === 'FCFA') {
    return `1 USD = ${EXCHANGE_RATES.DISPLAY.USD_TO_XAF_RATE} F (Taux favorable)`;
  } else if (fromCurrency === 'FCFA' && toCurrency === 'USD') {
    return `${EXCHANGE_RATES.DISPLAY.XAF_TO_USD_RATE} F = 1 USD`;
  }
  
  return `Taux non disponible`;
}

/**
 * Calculate conversion preview using corrected fixed rates
 */
export function calculateConversionPreview(amount: number, fromCurrency: 'FCFA' | 'USD', toCurrency: 'FCFA' | 'USD'): { convertedAmount: number; rate: number } {
  if (fromCurrency === 'USD' && toCurrency === 'FCFA') {
    // USD to XAF: 1 USD = 500 XAF (better rate for users)
    const convertedAmount = Math.round(amount * EXCHANGE_RATES.CONVERSION.USD_TO_XAF);
    return {
      convertedAmount,
      rate: EXCHANGE_RATES.CONVERSION.USD_TO_XAF
    };
  } else if (fromCurrency === 'FCFA' && toCurrency === 'USD') {
    // XAF to USD: 660 XAF = 1 USD (less favorable to discourage conversions)
    const convertedAmount = Math.round((amount * EXCHANGE_RATES.CONVERSION.XAF_TO_USD) * 100) / 100; // Round to 2 decimals
    return {
      convertedAmount,
      rate: EXCHANGE_RATES.CONVERSION.XAF_TO_USD
    };
  }
  
  throw new Error('Invalid currency pair');
}

/**
 * Get current exchange rates for display
 */
export function getCurrentRates() {
  return EXCHANGE_RATES;
}