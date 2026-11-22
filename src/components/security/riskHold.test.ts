import { describe, expect, it } from 'vitest';
import { isRiskHold, RISK_HOLD_PATH } from './riskHold';

describe('withdrawal held by the security check', () => {
    it('recognises payment-service’s RISK_HOLD refusal only', () => {
        expect(isRiskHold({ statusCode: 403, body: { success: false, code: 'RISK_HOLD', message: 'bloqué' } } as never)).toBe(true);
        expect(isRiskHold({ statusCode: 403, body: { success: false, code: 'AUTHENTICATOR_REQUIRED' } } as never)).toBe(false);
        expect(isRiskHold(null)).toBe(false);
        expect(RISK_HOLD_PATH).toBe('/aide/identite?motif=fraud_hold');
    });
});
