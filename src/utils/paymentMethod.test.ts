import { describe, expect, it } from 'vitest';
import { defaultPaymentMethod } from './paymentMethod';

// Guinée and Tchad pay by Mobile Money through MoneyFusion (2026-11-19); they
// used to land on crypto by default.
describe('defaultPaymentMethod', () => {
  it.each(['GN', 'TD', 'CD', 'GH', 'CM', 'CI'])('%s defaults to Mobile Money', (cc) => {
    expect(defaultPaymentMethod(cc)).toBe('traditional');
  });
  it('a country without Mobile Money still defaults to crypto', () => {
    expect(defaultPaymentMethod('MA')).toBe('crypto');
  });
});
