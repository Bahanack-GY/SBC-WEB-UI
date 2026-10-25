import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ok, fail } from '../../test/api';

const api = vi.hoisted(() => ({ relanceGetPacks: vi.fn(), relancePurchasePack: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({
  user: { country: 'CM' } as { country?: string; balance?: number },
  refreshUser: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));

import RelancePacksModal from './RelancePacksModal';

const packs = {
  emailPacks: [{ id: 'email_3k', type: 'email', credits: 3000, priceXAF: 3000 }],
  smsPacks: [{ id: 'sms_250', type: 'sms', credits: 250, priceXAF: 5000 }],
};

beforeEach(() => api.relanceGetPacks.mockResolvedValue(ok(packs)));

// Rufus: SMS relance is for Cameroonian parrains and their +237 filleuls only.
describe('relance packs — SMS is for Cameroon', () => {
  it('offers SMS packs to a parrain from Cameroon', async () => {
    auth.user = { country: 'CM' };
    render(<RelancePacksModal isOpen onClose={() => undefined} />);
    expect(await screen.findByText('Packs SMS')).toBeInTheDocument();
  });

  it('offers only email packs to a parrain from anywhere else', async () => {
    auth.user = { country: 'BJ' };
    render(<RelancePacksModal isOpen onClose={() => undefined} />);
    expect(await screen.findByText('Packs Email')).toBeInTheDocument();
    expect(screen.queryByText('Packs SMS')).not.toBeInTheDocument();
  });

  it('offers only email packs when the country is unknown', async () => {
    auth.user = {};
    render(<RelancePacksModal isOpen onClose={() => undefined} />);
    expect(await screen.findByText('Packs Email')).toBeInTheDocument();
    expect(screen.queryByText('Packs SMS')).not.toBeInTheDocument();
  });
});

// Rufus, 2026-10-20: « ça marche seulement avec les campagnes, pas encore avec la relance ».
describe('relance packs — paying with the SBC balance', () => {
  beforeEach(() => {
    api.relancePurchasePack.mockReset();
    auth.refreshUser.mockReset();
  });

  const pickEmailPack = async () => fireEvent.click(await screen.findByText(/3\s000 crédits email/));

  it('pays the whole pack from the balance and credits it without a payment page', async () => {
    auth.user = { country: 'CM', balance: 10000 };
    api.relancePurchasePack.mockResolvedValue(ok({ paidWithBalance: true, credits: 3000, pack: packs.emailPacks[0] }));
    const onPurchased = vi.fn();
    render(<RelancePacksModal isOpen onClose={() => undefined} onPurchased={onPurchased} />);

    await pickEmailPack();
    fireEvent.click(screen.getByText('Payer avec mon solde SBC'));

    expect(await screen.findByRole('status')).toHaveTextContent(/Pack acheté : 3\s000 crédits email ajoutés/);
    expect(api.relancePurchasePack).toHaveBeenCalledWith('email_3k', { useBalance: true, requestId: expect.any(String) });
    expect(auth.refreshUser).toHaveBeenCalled();
    expect(onPurchased).toHaveBeenCalled();
  });

  it('keeps the same request id when the member taps again after an error', async () => {
    auth.user = { country: 'CM', balance: 10000 };
    api.relancePurchasePack
      .mockResolvedValueOnce(fail(502, "Le pack n'a pas pu être crédité."))
      .mockResolvedValueOnce(ok({ paidWithBalance: true, credits: 3000, pack: packs.emailPacks[0] }));
    render(<RelancePacksModal isOpen onClose={() => undefined} />);

    await pickEmailPack();
    fireEvent.click(screen.getByText('Payer avec mon solde SBC'));
    expect(await screen.findByText("Le pack n'a pas pu être crédité.")).toBeInTheDocument();
    fireEvent.click(screen.getByText('Payer avec mon solde SBC'));
    await screen.findByRole('status');

    const [first, second] = api.relancePurchasePack.mock.calls.map(c => c[1].requestId);
    expect(second).toBe(first);
  });

  it('says so when the balance does not cover the pack, and still offers Mobile Money', async () => {
    auth.user = { country: 'CM', balance: 1000 };
    render(<RelancePacksModal isOpen onClose={() => undefined} />);

    await pickEmailPack();
    expect(screen.getByText('Payer avec mon solde SBC').closest('button')).toBeDisabled();
    expect(screen.getByText(/ne couvre pas ce pack/)).toBeInTheDocument();
    expect(screen.getByText('Payer par Mobile Money').closest('button')).toBeEnabled();
  });

  it('shows the server refusal (e.g. a debt on the account)', async () => {
    auth.user = { country: 'CM', balance: 10000 };
    api.relancePurchasePack.mockResolvedValue(fail(409, 'Votre solde SBC ne couvre pas ce pack.'));
    render(<RelancePacksModal isOpen onClose={() => undefined} />);

    await pickEmailPack();
    fireEvent.click(screen.getByText('Payer avec mon solde SBC'));
    expect(await screen.findByText('Votre solde SBC ne couvre pas ce pack.')).toBeInTheDocument();
    expect(auth.refreshUser).not.toHaveBeenCalled();
  });

  it('goes straight to Mobile Money when the balance is empty', async () => {
    auth.user = { country: 'CM', balance: 0 };
    api.relancePurchasePack.mockResolvedValue(ok({ sessionId: 'S', checkoutUrl: '', pack: packs.emailPacks[0] }));
    render(<RelancePacksModal isOpen onClose={() => undefined} />);

    await pickEmailPack();
    expect(screen.queryByText('Comment payer ?')).not.toBeInTheDocument();
    expect(api.relancePurchasePack).toHaveBeenCalledWith('email_3k');
  });
});
