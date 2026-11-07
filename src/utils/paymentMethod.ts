import type { PaymentMethod } from '../types/api';
import { findAnyCountry } from './countriesData';

/**
 * Mobile Money where the member's country has it, crypto elsewhere. An unknown
 * country keeps Mobile Money: most members are in Mobile Money countries.
 */
export const defaultPaymentMethod = (country?: string | null): PaymentMethod => {
  if (!country) return 'traditional';
  return findAnyCountry(country)?.supportsMomo ? 'traditional' : 'crypto';
};
