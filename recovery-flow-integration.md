# Recovery Flow Integration for Conflict Scenarios

## Overview

When a 409 Conflict error occurs during the registration process, the system should consider integrating with the recovery flow to allow users to recover their existing accounts instead of being blocked from registration.

## Current Implementation

The current implementation handles 409 Conflict errors by:
1. Detecting the conflict via `parseConflictError()` method in `SBCApiService`
2. Displaying appropriate error messages in the Signup form
3. Preventing form progression when conflicts are detected

## Proposed Recovery Flow Integration

### 1. Enhanced Error Messages with Recovery Options

Instead of just showing error messages, we could add recovery suggestions:

```typescript
// Enhanced conflict error handling
if (conflictError.conflictType === 'PHONE_TAKEN') {
  setErrors(prev => ({
    ...prev,
    whatsappExists: `${conflictError.message} Voulez-vous récupérer votre compte existant ?`,
    general: undefined
  }));

  // Show recovery button or link
  setShowRecoveryOption(true);
}
```

### 2. Recovery Modal/Overlay

When a conflict is detected, show a modal with recovery options:

```typescript
// Recovery modal state
const [showRecoveryModal, setShowRecoveryModal] = useState(false);
const [conflictData, setConflictData] = useState<any>(null);

// In conflict handling
if (conflictError) {
  setConflictData(conflictError);
  setShowRecoveryModal(true);
}
```

### 3. Recovery Options UI

The recovery modal could offer:
- **Login with existing account**: Redirect to login page
- **Reset password**: If email exists, offer password reset
- **Contact support**: For complex cases
- **Continue registration**: If `canProceedWithRegistration` is true

### 4. Smart Recovery Flow

```typescript
// Smart recovery based on conflict type
const getRecoveryOptions = (conflictType: string) => {
  switch (conflictType) {
    case 'PHONE_TAKEN':
      return {
        title: 'Numéro de téléphone déjà utilisé',
        message: 'Un compte existe déjà avec ce numéro.',
        options: [
          { label: 'Se connecter', action: 'login' },
          { label: 'Mot de passe oublié', action: 'reset_password' },
          { label: 'Contacter le support', action: 'support' }
        ]
      };
    case 'EMAIL_TAKEN':
      return {
        title: 'Email déjà utilisé',
        message: 'Un compte existe déjà avec cette adresse email.',
        options: [
          { label: 'Se connecter', action: 'login' },
          { label: 'Mot de passe oublié', action: 'reset_password' },
          { label: 'Contacter le support', action: 'support' }
        ]
      };
    case 'BOTH_TAKEN':
      return {
        title: 'Informations déjà utilisées',
        message: 'Un compte existe déjà avec ces informations.',
        options: [
          { label: 'Se connecter', action: 'login' },
          { label: 'Mot de passe oublié', action: 'reset_password' },
          { label: 'Contacter le support', action: 'support' }
        ]
      };
    default:
      return {
        title: 'Conflit détecté',
        message: 'Un conflit a été détecté lors de la vérification.',
        options: [
          { label: 'Réessayer', action: 'retry' },
          { label: 'Contacter le support', action: 'support' }
        ]
      };
  }
};
```

### 5. Integration with Existing Recovery System

The current recovery system already checks for pending recoveries. We could enhance it to also handle conflicts:

```typescript
// Enhanced recovery check
const checkRecoveryAndConflicts = async (email: string, phoneNumber?: string) => {
  try {
    const recoveryResponse = await safeRecoveryApiCall(
      () => sbcApiService.checkRecoveryRegistration(email, fullPhoneNumber)
    );

    // Check for conflicts first
    const conflictError = sbcApiService.parseConflictError(recoveryResponse);
    if (conflictError) {
      handleConflictError(conflictError);
      return;
    }

    // Then check for normal recoveries
    const recoveryData = handleApiResponse(recoveryResponse);
    if (recoveryData?.hasPendingRecoveries) {
      handlePendingRecovery(recoveryData);
    }

  } catch (error) {
    console.error('Recovery check error:', error);
  }
};
```

## Benefits of Recovery Flow Integration

1. **Better User Experience**: Users aren't blocked, they get helpful options
2. **Reduced Support Tickets**: Users can resolve issues themselves
3. **Account Recovery**: Helps users regain access to existing accounts
4. **Data Integrity**: Prevents duplicate accounts while helping users

## Implementation Priority

1. **High Priority**: Enhanced error messages with recovery suggestions
2. **Medium Priority**: Recovery modal with basic options (login, password reset)
3. **Low Priority**: Advanced recovery flows and support integration

## Testing Scenarios

1. Test conflict detection with different error types
2. Test recovery modal display and functionality
3. Test navigation to login/password reset from recovery modal
4. Test fallback behavior when recovery options fail
5. Test integration with existing recovery system

## Future Enhancements

1. **Auto-recovery**: If conflict data matches existing account, offer auto-login
2. **Account linking**: Allow users to link multiple identifiers to one account
3. **Conflict resolution wizard**: Step-by-step process to resolve conflicts
4. **Analytics**: Track conflict types and recovery success rates
