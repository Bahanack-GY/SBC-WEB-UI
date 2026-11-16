import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fail, ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  getLoveStatus: vi.fn(),
  getMyLoveProfile: vi.fn(),
  getMyLoveInterests: vi.fn(),
  browseLoveProfiles: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

import SbcLove from './SbcLove';

const STATUS = { enabled: true, timezone: 'Africa/Douala', activeWeekday: 3, openHour: 18, closeHour: 21, nextOpenAt: null, minPhotos: 2, maxPhotos: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  api.getMyLoveProfile.mockResolvedValue(fail(404, 'Not found'));
  api.getMyLoveInterests.mockResolvedValue(ok([]));
  api.browseLoveProfiles.mockResolvedValue(ok([]));
});

describe('SBC Love: session status', () => {
  it('says the session is closed, with the next opening, when sbclove says so', async () => {
    api.getLoveStatus.mockResolvedValue(ok({ ...STATUS, isOpen: false }));
    renderPage(<SbcLove />, '/sbclove');
    expect(await screen.findByText('La session est fermée')).toBeInTheDocument();
    expect(screen.getAllByText(/Ouvre mercredi à 18h/).length).toBeGreaterThan(0);
  });

  it('never says "fermé" when the status cannot be read (members saw it on a Wednesday at 18h), and retries', async () => {
    api.getLoveStatus.mockResolvedValue(fail(401, 'Invalid or expired authentication token'));
    renderPage(<SbcLove />, '/sbclove');
    expect(await screen.findByText(/Impossible de vérifier la session/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByText('La session est fermée')).not.toBeInTheDocument();

    api.getLoveStatus.mockResolvedValue(ok({ ...STATUS, isOpen: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText(/Ouvert jusqu'à 21h/)).toBeInTheDocument();
  });
});
