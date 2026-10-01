import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ok } from '../../test/api';

const api = vi.hoisted(() => ({ relanceGetPacks: vi.fn(), relancePurchasePack: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ user: { country: 'CM' } as { country?: string } }));
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
