# Withdrawal Approval System - Frontend Implementation Guide

## Overview

This document describes the frontend implementation of the new withdrawal approval system where all withdrawals now require admin approval before processing.

## Changes Implemented

### 1. ✅ Transaction Types Updated

**File:** `src/types/api.ts`

Added new transaction status enum and updated Transaction interface:

```typescript
export enum TransactionStatus {
  PENDING = 'pending',
  PENDING_OTP_VERIFICATION = 'pending_otp_verification',
  PENDING_ADMIN_APPROVAL = 'pending_admin_approval',  // NEW
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED_BY_ADMIN = 'rejected_by_admin',           // NEW
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}
```

**New Transaction Fields:**
- `approvedBy?: string` - Admin user ID who approved
- `approvedAt?: string` - Timestamp of approval
- `rejectedBy?: string` - Admin user ID who rejected
- `rejectedAt?: string` - Timestamp of rejection
- `rejectionReason?: string` - Reason for rejection
- `adminNotes?: string` - Optional admin notes

### 2. ✅ Translation Keys Added

**Files:** `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`

Added comprehensive translation keys:

```json
"common": {
  "statuses": {
    "pending": "En attente",
    "pendingOTP": "En attente de vérification OTP",
    "pendingAdminApproval": "En attente d'approbation",
    "processing": "En cours de traitement",
    "completed": "Terminé",
    "failed": "Échoué",
    "rejectedByAdmin": "Rejeté",
    "cancelled": "Annulé",
    "refunded": "Remboursé"
  },
  "withdrawal": {
    "pendingApprovalTitle": "En attente d'approbation",
    "pendingApprovalMessage": "Votre demande de retrait est en cours de vérification par notre équipe...",
    "rejectedTitle": "Retrait rejeté",
    "submittedSuccessTitle": "Retrait soumis!",
    "submittedSuccessMessage": "Votre demande de retrait a été soumise avec succès.",
    "estimatedApprovalTime": "Temps d'approbation estimé: 1-24 heures",
    // ... and more
  }
}
```

### 3. ✅ Helper Utilities Created

**File:** `src/utils/transactionHelpers.ts`

Provides utility functions for transaction status handling:

```typescript
// Get translation key for status
getStatusTranslationKey(status: string): string

// Get color for status display
getStatusColor(status: string): string  // Returns hex color

// Get icon name for status
getStatusIcon(status: string): string

// Status checking utilities
isPendingAdminApproval(status: string): boolean
isRejectedByAdmin(status: string): boolean
isPendingState(status: string): boolean
isFinalState(status: string): boolean
canCancelWithdrawal(status: string): boolean
isProcessing(status: string): boolean

// Formatting utilities
getStatusDescription(status: string, t?: any): string
formatTransactionAmount(amount: number, type: string, currency?: string): string
```

### 4. ✅ Components Created

#### TransactionApprovalInfo Component
**File:** `src/components/TransactionApprovalInfo.tsx`

Displays approval-related information in transaction details:
- Shows pending approval message with estimated time
- Displays rejection reason if withdrawal was rejected
- Shows refund confirmation message
- Includes admin notes if available

**Usage:**
```typescript
import TransactionApprovalInfo from '@/components/TransactionApprovalInfo';

<TransactionApprovalInfo transaction={transaction} />
```

#### WithdrawalSuccessModal Component
**File:** `src/components/WithdrawalSuccessModal.tsx`

Updated success modal that shows:
- Success message with new approval notice
- Estimated approval time (1-24 hours)
- Amount being withdrawn
- Call-to-action buttons to view transactions
- Information about pending approval status

**Usage:**
```typescript
import WithdrawalSuccessModal from '@/components/WithdrawalSuccessModal';

<WithdrawalSuccessModal
  isOpen={showSuccess}
  onClose={() => setShowSuccess(false)}
  amount={withdrawalAmount}
  currency="XAF"
/>
```

## Status Flow Implementation

### Before (Old Flow)
```
User initiates withdrawal
  ↓
OTP verification
  ↓
Immediately processing
  ↓
Completed/Failed
```

### After (New Flow)
```
User initiates withdrawal
  ↓
OTP verification
  ↓
PENDING_ADMIN_APPROVAL (waiting for admin)
  ↓
[Admin reviews and decides]
  ↓
  ├─→ APPROVED → PROCESSING → COMPLETED/FAILED
  │
  └─→ REJECTED_BY_ADMIN → Balance refunded
```

## Integration Guide

### Step 1: Update Wallet.tsx Transaction List

Replace the transaction display logic to use new helper functions:

```typescript
import { getStatusColor, getStatusIcon, getStatusTranslationKey } from '@/utils/transactionHelpers';
import TransactionApprovalInfo from '@/components/TransactionApprovalInfo';

// In your transaction item rendering:
<div className="flex items-center gap-2">
  <span style={{ color: getStatusColor(transaction.status) }}>
    {getStatusIcon(transaction.status)}
  </span>
  <span>{t(getStatusTranslationKey(transaction.status))}</span>
</div>
```

### Step 2: Add Approval Info to Transaction Details

When displaying transaction details:

```typescript
<TransactionApprovalInfo transaction={transaction} />

{/* Rest of transaction details */}
```

### Step 3: Update Withdrawal Initiation

When showing withdrawal success:

```typescript
<WithdrawalSuccessModal
  isOpen={isSuccess}
  onClose={handleClose}
  amount={withdrawalAmount}
  currency="XAF"
/>
```

### Step 4: Handle Pending Withdrawal Errors

Add error handling for the new error codes:

```typescript
try {
  const response = await withdrawalService.initiate(amount);
  // Show success modal
} catch (error) {
  if (error.code === 'PENDING_WITHDRAWAL_EXISTS') {
    // Show error about existing pending withdrawal
    showErrorDialog(t('common.withdrawal.pendingWithdrawalExists'),
                   t('common.withdrawal.waitForProcessing'));
  } else if (error.code === 'TOO_MANY_PENDING_WITHDRAWALS') {
    // Handle too many pending withdrawals
  }
}
```

## API Response Handling

The API now returns additional fields in transaction responses:

```typescript
// Example API response for pending approval
{
  success: true,
  data: {
    transaction: {
      _id: "65d2b0344a7e2b9e...",
      transactionId: "TXN_1234567890",
      status: "pending_admin_approval",  // NEW STATUS
      amount: 5000,
      currency: "XAF",
      type: "withdrawal",
      createdAt: "2025-01-24T10:00:00.000Z",
      // ... other fields
      // NEW FIELDS:
      approvedBy: undefined,
      approvedAt: undefined,
      rejectedBy: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
      adminNotes: undefined,
      metadata: {
        withdrawalType: "mobile_money",
        accountInfo: { ... }
      }
    }
  }
}
```

## Notification Types

Handle new notification types for approval updates:

```typescript
enum NotificationType {
  WITHDRAWAL_PENDING_APPROVAL = 'withdrawal_pending_approval',  // NEW
  WITHDRAWAL_APPROVED = 'withdrawal_approved',                  // NEW
  WITHDRAWAL_REJECTED = 'withdrawal_rejected',                  // NEW
  WITHDRAWAL_PROCESSING = 'withdrawal_processing',
  WITHDRAWAL_COMPLETED = 'withdrawal_completed',
  WITHDRAWAL_FAILED = 'withdrawal_failed',
}

// Expected notification payloads:
// 1. Pending Approval
{
  type: 'withdrawal_pending_approval',
  title: 'Retrait en attente',
  message: 'Votre demande de retrait de 5000 XAF est en attente d\'approbation.',
  data: { transactionId: 'TXN_123456', amount: 5000 }
}

// 2. Approved (Processing)
{
  type: 'withdrawal_approved',
  title: 'Retrait approuvé',
  message: 'Votre retrait de 5000 XAF a été approuvé et est en cours de traitement.',
  data: { transactionId: 'TXN_123456', amount: 5000 }
}

// 3. Rejected
{
  type: 'withdrawal_rejected',
  title: 'Retrait rejeté',
  message: 'Votre retrait a été rejeté. Raison: Documents non valides. Votre solde a été remboursé.',
  data: {
    transactionId: 'TXN_123456',
    amount: 5000,
    rejectionReason: 'Documents non valides'
  }
}
```

## UI/UX Changes

### Transaction List Display

Status badges should now show different colors:
- **Orange (Pending)**: `#f59e0b` - pending, pending_otp_verification, pending_admin_approval
- **Blue (Processing)**: `#3b82f6` - processing
- **Green (Success)**: `#10b981` - completed
- **Red (Failed)**: `#ef4444` - failed, rejected_by_admin
- **Gray (Cancelled)**: `#9ca3af` - cancelled
- **Purple (Refunded)**: `#a855f7` - refunded

### Status Icons

Use appropriate icons for each status:
- ⏳ Hourglass: pending states
- 🔄 Sync/Refresh: processing
- ✓ Check circle: completed
- ✗ Times circle: failed/rejected
- ⚠️ Warning: cancellation states

### Messages and Alerts

#### Withdrawal Initiation Screen
```
ℹ️ Important
Tous les retraits sont soumis à une vérification pour votre sécurité.
Temps d'approbation: 1-24 heures
Vous serez notifié du statut de votre retrait.
```

#### Withdrawal Success (After OTP)
```
✓ Retrait soumis!

Votre demande de retrait a été soumise avec succès.

ℹ️ Your withdrawal is pending approval. We will notify you as soon as it is processed.

⏱️ Approval time: 1-24 hours
📬 You will be notified of your withdrawal status.

[View my transactions] [OK]
```

#### Pending Approval Details
```
⏳ En attente d'approbation

Votre demande de retrait est en cours de vérification par notre équipe.
Vous serez notifié dès qu'elle sera approuvée.

⏱️ Temps d'approbation estimé: 1-24 heures
```

#### Rejection Details
```
✗ Retrait rejeté

Raison: Documents de vérification manquants
Votre solde a été remboursé.

Date de rejet: 24 janvier 2025 à 12:00
```

## Testing Checklist

- [ ] New status labels display correctly in transaction list
- [ ] Status colors display correctly for each status
- [ ] Approval info section shows in transaction details
- [ ] Rejection info shows rejection reason and refund confirmation
- [ ] Withdrawal success modal shows new messaging
- [ ] Approval time estimate (1-24 hours) is displayed
- [ ] Can navigate to transactions from success modal
- [ ] Error handling for pending withdrawal conflicts works
- [ ] Push notifications for approval events are handled
- [ ] Language switching works for all new strings
- [ ] Mobile responsive design maintained
- [ ] Loading states work correctly

## FAQ for Users

**Q: Why is my withdrawal pending approval?**
A: All withdrawals are verified by our team for your security and to prevent fraud. This ensures your funds are protected.

**Q: How long does approval take?**
A: Most withdrawals are approved within 1-24 hours during business hours. You'll receive a notification when your withdrawal is approved.

**Q: Can I cancel a withdrawal pending approval?**
A: Yes, you can cancel pending withdrawals by contacting our support team with your transaction ID.

**Q: What happens if my withdrawal is rejected?**
A: If rejected, you'll receive a notification with the reason. Your balance will be automatically refunded and you can resubmit once resolved.

**Q: Is my balance blocked during approval?**
A: Yes, the withdrawal amount is temporarily deducted during approval. If rejected, it's refunded immediately.

## Migration Notes

- Old transactions without new fields will still display correctly (fields are optional)
- Graceful degradation if new fields are missing from API response
- No breaking changes to existing transaction display logic
- All changes are additive and backward compatible

## Files Changed/Created

### Modified Files
- ✅ `src/types/api.ts` - Added TransactionStatus enum and new fields
- ✅ `src/i18n/locales/fr.json` - Added translation keys
- ✅ `src/i18n/locales/en.json` - Added translation keys

### Created Files
- ✅ `src/utils/transactionHelpers.ts` - Helper utilities
- ✅ `src/components/TransactionApprovalInfo.tsx` - Approval info display
- ✅ `src/components/WithdrawalSuccessModal.tsx` - Success modal
- ✅ `WITHDRAWAL_APPROVAL_FRONTEND.md` - This documentation

## Next Steps

1. Update Wallet.tsx to use new components and helpers
2. Test with backend API providing new statuses
3. Add FAQ page with user information
4. Deploy with soft launch (10% of users first)
5. Monitor feedback and error rates
6. Full rollout after 24-48 hours

## Support

For questions or issues during implementation:
- Check the components and utilities for usage examples
- Review USER_FRONTEND_WITHDRAWAL_UPDATES.md for detailed requirements
- Test with mock data before connecting to real API
