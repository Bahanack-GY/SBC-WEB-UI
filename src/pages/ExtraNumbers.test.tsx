import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  getExtraNumbers: vi.fn(),
  addExtraNumber: vi.fn(),
  deleteExtraNumber: vi.fn(),
  purchaseExtraNumberSlot: vi.fn(),
  generatePaymentUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { country: 'CM' }, isAuthenticated: true, loading: false }),
}));
const nav = vi.hoisted(() => ({ redirectTo: vi.fn() }));
vi.mock('../utils/redirect', () => nav);

import ExtraNumbers from './ExtraNumbers';
import { DEFAULT_DIAL_CODE, toInternationalDigits, worldCountryCodes } from '../utils/countriesData';

const state = (numbers: Array<{ _id: string; number: string }>, slots = 2) => ({
  slots,
  numbers: numbers.map((n) => ({ ...n, addedAt: '2026-11-01T10:00:00.000Z' })),
  pricePerSlot: 500,
  currency: 'XAF',
});

beforeEach(() => {
  vi.clearAllMocks();
  api.getExtraNumbers.mockResolvedValue(ok(state([{ _id: 'n1', number: '237699001122' }])));
  api.generatePaymentUrl.mockImplementation((id: string) => `https://pay.example/payments/page/${id}`);
});

describe('toInternationalDigits', () => {
  const france = worldCountryCodes.find((c) => c.value === 'France')!;
  it('joins the dial code and the national number, without "+"', () => {
    expect(toInternationalDigits('677 12 34 56', DEFAULT_DIAL_CODE)).toEqual({ digits: '237677123456' });
    expect(toInternationalDigits('+33 6 12 34 56 78', DEFAULT_DIAL_CODE)).toEqual({ digits: '33612345678' });
    expect(toInternationalDigits('6 12 34 56 78', france)).toEqual({ digits: '33612345678' });
    expect(toInternationalDigits('67a', DEFAULT_DIAL_CODE)).toHaveProperty('error');
    expect(toInternationalDigits('+999 123456', DEFAULT_DIAL_CODE)).toHaveProperty('error');
  });
});

describe('Numéros en plus', () => {
  it('explains the page, lists the numbers and adds one in international digits', async () => {
    api.addExtraNumber.mockResolvedValue(ok(state([
      { _id: 'n1', number: '237699001122' },
      { _id: 'n2', number: '237677123456' },
    ])));
    renderPage(<ExtraNumbers />, '/numeros-supplementaires');

    expect(await screen.findByText(/plus vos statuts sont vus/)).toBeInTheDocument();
    expect(await screen.findByText('🇨🇲 +237 699 001 122')).toBeInTheDocument();
    expect(screen.getByTestId('slots-count')).toHaveTextContent('1 sur 2 utilisé');

    await userEvent.type(screen.getByLabelText('Numéro WhatsApp'), '677 12 34 56');
    expect(screen.getByText('+237677123456')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter ce numéro' }));

    await waitFor(() => expect(api.addExtraNumber).toHaveBeenCalledWith('237677123456'));
    expect(await screen.findByText('🇨🇲 +237 677 123 456')).toBeInTheDocument();
    // No free slot left: the form gives way to buying one.
    expect(screen.queryByLabelText('Numéro WhatsApp')).not.toBeInTheDocument();
    expect(screen.getByText(/Tous vos emplacements sont pris/)).toBeInTheDocument();
  });

  it('shows the server’s reason when a number is refused', async () => {
    api.addExtraNumber.mockResolvedValue(fail(400, 'Ce numéro est déjà enregistré.'));
    renderPage(<ExtraNumbers />, '/numeros-supplementaires');
    await userEvent.type(await screen.findByLabelText('Numéro WhatsApp'), '699001122');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter ce numéro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce numéro est déjà enregistré.');
  });

  it('asks before removing a number', async () => {
    api.deleteExtraNumber.mockResolvedValue(ok(state([])));
    renderPage(<ExtraNumbers />, '/numeros-supplementaires');
    await userEvent.click(await screen.findByRole('button', { name: 'Retirer le +237699001122' }));

    const sheet = await screen.findByRole('dialog', { name: 'Retirer ce numéro ?' });
    expect(api.deleteExtraNumber).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Retirer' }));

    await waitFor(() => expect(api.deleteExtraNumber).toHaveBeenCalledWith('n1'));
    expect(await screen.findByText('Aucun numéro pour le moment.')).toBeInTheDocument();
  });

  it('buys a slot and opens the payment page in the same tab', async () => {
    api.purchaseExtraNumberSlot.mockResolvedValue(ok({ sessionId: 'sess_slot' }));
    renderPage(<ExtraNumbers />, '/numeros-supplementaires');
    await userEvent.click(await screen.findByRole('button', { name: /^Acheter un emplacement · 500 FCFA$/ }));
    await waitFor(() => expect(nav.redirectTo).toHaveBeenCalledWith('https://pay.example/payments/page/sess_slot'));
    expect(api.purchaseExtraNumberSlot).toHaveBeenCalledWith('traditional');
  });
});
