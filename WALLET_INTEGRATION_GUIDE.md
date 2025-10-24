# Wallet.tsx Integration Guide for Withdrawal Approval System

## Overview
This document provides step-by-step instructions to integrate the withdrawal approval system into the existing Wallet.tsx file.

## Current Status Detection
The code currently handles these statuses:
- `pending`
- `pending_otp_verification`
- `processing`
- `completed`
- `failed`
- `refunded`

**NEW statuses to add:**
- `pending_admin_approval`
- `rejected_by_admin`

## Step 1: Add Imports

At the top of Wallet.tsx (around line 1-20), add these new imports:

```typescript
// Add these imports after the existing ones
import { useTranslation } from 'react-i18next';
import {
  getStatusColor,
  getStatusTranslationKey,
  isPendingAdminApproval,
  isRejectedByAdmin
} from '../utils/transactionHelpers';
import TransactionApprovalInfo from '../components/TransactionApprovalInfo';
import WithdrawalSuccessModal from '../components/WithdrawalSuccessModal';
```

## Step 2: Add Translation Hook

Inside the Wallet component function (around line 100), add:

```typescript
function Wallet() {
  const { t } = useTranslation();
  // ... rest of existing state
```

## Step 3: Update getStatusStyle Function

**Find this function (around line 77-93):**

```typescript
const getStatusStyle = (status: string) => {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-700';

  if (status === 'failed') {
    bgColor = 'bg-red-200';
    textColor = 'text-red-700';
  } else if (status === 'completed' || status === 'refunded') {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
  } else if (
    status === 'pending' ||
    status === 'processing' ||
    status === 'pending_otp_verification'
  ) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-700';
  }

  return `${bgColor} ${textColor}`;
};
```

**Replace with this updated version:**

```typescript
const getStatusStyle = (status: string) => {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-700';

  if (status === 'failed' || status === 'rejected_by_admin') {
    bgColor = 'bg-red-200';
    textColor = 'text-red-700';
  } else if (status === 'completed' || status === 'refunded') {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
  } else if (
    status === 'pending' ||
    status === 'processing' ||
    status === 'pending_otp_verification' ||
    status === 'pending_admin_approval'  // NEW
  ) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-700';
  }

  return `${bgColor} ${textColor}`;
};
```

## Step 4: Update Transaction Status Display

**Find the status display in transaction list (around line 1244-1246):**

```typescript
<div className={`font-bold ${String(tx.status) === 'completed' ? 'text-white' :
  (String(tx.status) === 'pending' || String(tx.status) === 'processing' || String(tx.status) === 'pending_otp_verification') ? 'text-yellow-400' :
    String(tx.status) === 'failed' ? 'text-red-400' : 'text-white'
  } text-sm truncate max-w-[160px]`}>{formatTransactionName(tx)}</div>
```

**Replace with:**

```typescript
<div className={`font-bold text-sm truncate max-w-[160px]`}
  style={{ color: getStatusColor(tx.status) }}>
  {formatTransactionName(tx)}
</div>
```

## Step 5: Update Transaction Detail Modal Status Display

**Find the status display in detail modal (around line 1321-1330):**

```typescript
<div className="text-xs text-gray-400 mb-1">Statut</div>
<div className={`font-semibold mb-2 ${String(selectedTx.status) === 'completed' ? 'text-green-600' :
  (String(selectedTx.status) === 'pending' || String(selectedTx.status) === 'processing' || String(selectedTx.status) === 'pending_otp_verification') ? 'text-yellow-600' :
    String(selectedTx.status) === 'failed' ? 'text-red-600' : 'text-gray-600'
  }`}>
  {String(selectedTx.status) === 'completed' ? 'Terminé' :
    String(selectedTx.status) === 'pending' ? 'En attente' :
      String(selectedTx.status) === 'processing' ? 'En cours' :
        String(selectedTx.status) === 'pending_otp_verification' ? 'En attente OTP' :
          String(selectedTx.status) === 'failed' ? 'Échoué' : selectedTx.status}
</div>
```

**Replace with:**

```typescript
<div className="text-xs text-gray-400 mb-1">{t('wallet.status')}</div>
<div className="font-semibold mb-2" style={{ color: getStatusColor(selectedTx.status) }}>
  {t(getStatusTranslationKey(selectedTx.status))}
</div>
```

## Step 6: Add Approval Info Section to Transaction Detail Modal

**After the status display in the modal, add:**

```typescript
{/* Add this right after the status div */}
{selectedTx && (
  <div className="mb-4">
    <TransactionApprovalInfo transaction={selectedTx} />
  </div>
)}
```

**Complete section should look like:**

```typescript
{selectedTx && (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
      {/* ... existing header ... */}

      <div className="space-y-4">
        {/* Transaction ID */}
        {/* ... existing fields ... */}

        {/* Status */}
        <div className="text-xs text-gray-400 mb-1">{t('wallet.status')}</div>
        <div className="font-semibold mb-2" style={{ color: getStatusColor(selectedTx.status) }}>
          {t(getStatusTranslationKey(selectedTx.status))}
        </div>

        {/* NEW: Approval Info Section */}
        <TransactionApprovalInfo transaction={selectedTx} />

        {/* ... rest of existing modal content ... */}
      </div>
    </div>
  </div>
)}
```

## Step 7: Update Withdrawal Success Handling

**Find the withdrawal success flow (around line 485-500):**

When handling withdrawal OTP verification success, update to show new modal:

```typescript
// Add state for success modal at top of component
const [showWithdrawalSuccess, setShowWithdrawalSuccess] = useState(false);
const [successWithdrawalAmount, setSuccessWithdrawalAmount] = useState<number>(0);
const [successWithdrawalCurrency, setSuccessWithdrawalCurrency] = useState<string>('XAF');
```

**Then in the OTP success handling:**

```typescript
if (data.status === 'pending_otp_verification' && data.transactionId) {
  // Store withdrawal details for success modal
  setSuccessWithdrawalAmount(withdrawAmount);
  setSuccessWithdrawalCurrency(selectedBalanceType);

  // Navigate to OTP page
  navigate('/withdrawal-otp-verification', {
    state: {
      transactionId: data.transactionId,
      amount: withdrawAmount,
      currency: selectedBalanceType,
      // Add callback for after OTP success
      onSuccess: () => {
        setShowWithdrawalSuccess(true);
      }
    }
  });
}
```

**Add the success modal at the end of JSX return:**

```typescript
{/* Add before the closing </div> of main component */}
<WithdrawalSuccessModal
  isOpen={showWithdrawalSuccess}
  onClose={() => {
    setShowWithdrawalSuccess(false);
    setShowWithdrawForm(false);
    refreshTransactions();
  }}
  amount={successWithdrawalAmount}
  currency={successWithdrawalCurrency}
/>
```

## Step 8: Handle New Error Codes

**Add error handling for pending withdrawal conflicts:**

```typescript
} catch (err: any) {
  console.error("Withdrawal error:", err);

  // NEW: Check for pending withdrawal error
  if (err.message && err.message.includes('PENDING_WITHDRAWAL_EXISTS')) {
    setModalContent({
      type: 'error',
      title: t('common.withdrawal.pendingWithdrawalExists'),
      message: t('common.withdrawal.waitForProcessing'),
      showViewWithdrawals: true // Add button to view pending withdrawals
    });
    return;
  }

  // NEW: Check for too many pending withdrawals
  if (err.message && err.message.includes('TOO_MANY_PENDING_WITHDRAWALS')) {
    setModalContent({
      type: 'error',
      title: t('common.error'),
      message: 'Vous avez atteint la limite de retraits en attente. Veuillez attendre qu\'au moins un retrait soit traité.',
    });
    return;
  }

  // ... existing error handling ...
}
```

## Step 9: Update Cancel Button Logic

**Find cancel button logic (around line 1262-1280):**

Update to handle pending admin approval:

```typescript
{(tx.status === 'pending_otp_verification' || tx.status === 'pending_admin_approval') && tx.type === 'withdrawal' && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleCancelWithdrawal(tx.transactionId || tx.id);
    }}
    className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
  >
    {t('common.cancel')}
  </button>
)}
```

## Step 10: Add Information Banner (Optional)

**Add an info banner above the withdrawal form:**

```typescript
{showWithdrawForm && (
  <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-start">
      <svg className="h-5 w-5 text-blue-500 mt-0.5 mr-3" /* ... info icon ... */>
        {/* SVG path */}
      </svg>
      <div className="flex-1 text-sm">
        <p className="font-medium text-blue-900 mb-1">
          {t('common.withdrawal.importantInfo')}
        </p>
        <p className="text-blue-800">
          {t('common.withdrawal.allWithdrawalsVerified')}
        </p>
        <div className="mt-2 text-xs text-blue-700 space-y-1">
          <div>⏱️ {t('common.withdrawal.approvalTime')}</div>
          <div>📬 {t('common.withdrawal.willBeNotified')}</div>
        </div>
      </div>
    </div>
  </div>
)}
```

## Testing Checklist

After implementing these changes:

- [ ] Status colors display correctly for all transaction types
- [ ] Translation keys work for all statuses (FR/EN)
- [ ] Approval info section shows for `pending_admin_approval` transactions
- [ ] Rejection info shows reason and refund confirmation for `rejected_by_admin`
- [ ] Withdrawal success modal shows new approval messaging
- [ ] Cancel button shows for `pending_admin_approval` transactions
- [ ] Error handling works for pending withdrawal conflicts
- [ ] Information banner displays before withdrawal initiation
- [ ] All transactions display correctly in history modal

## Summary of Files to Modify

1. ✅ `src/pages/Wallet.tsx` - Main integration (follow steps above)
2. Already created:
   - ✅ `src/utils/transactionHelpers.ts`
   - ✅ `src/components/TransactionApprovalInfo.tsx`
   - ✅ `src/components/WithdrawalSuccessModal.tsx`
   - ✅ `src/types/api.ts`
   - ✅ Translation files

## Quick Reference: Translation Keys

```typescript
// Status labels
t('common.statuses.pending')
t('common.statuses.pendingOTP')
t('common.statuses.pendingAdminApproval')    // NEW
t('common.statuses.processing')
t('common.statuses.completed')
t('common.statuses.failed')
t('common.statuses.rejectedByAdmin')         // NEW
t('common.statuses.cancelled')
t('common.statuses.refunded')

// Withdrawal messages
t('common.withdrawal.pendingApprovalTitle')
t('common.withdrawal.pendingApprovalMessage')
t('common.withdrawal.rejectedTitle')
t('common.withdrawal.submittedSuccessTitle')
t('common.withdrawal.estimatedApprovalTime')
// ... and more in common.withdrawal.*
```

## Need Help?

- Check WITHDRAWAL_APPROVAL_FRONTEND.md for detailed documentation
- Review src/utils/transactionHelpers.ts for available helper functions
- Test components individually before full integration
- Use browser dev tools to check translation keys are working
