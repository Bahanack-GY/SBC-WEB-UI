import type { ApiResponse } from '../../services/ApiResponse';

/**
 * Security plan Phase 4 + KYC level 3: payment-service answers 403 `RISK_HOLD` when the security
 * check holds the member's withdrawals. The way out is an identity check (ID + selfie) reviewed by
 * support, at /aide/identite?motif=fraud_hold.
 */
export const RISK_HOLD_PATH = '/aide/identite?motif=fraud_hold';
export const isRiskHold = (r: ApiResponse | null | undefined) => r?.body?.code === 'RISK_HOLD';
