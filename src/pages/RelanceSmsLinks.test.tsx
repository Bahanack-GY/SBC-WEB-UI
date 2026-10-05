import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  relanceGetSmsLinks: vi.fn(),
  relanceGetSmsTemplates: vi.fn(),
  relanceUpdateSmsLinks: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../components/common/ProtectedRoute', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import RelanceSmsLinks from './RelanceSmsLinks';

const templates = [
  { _id: 't0', type: 'auto', dayNumber: 0, templateText: 'Bienvenue {{link}}', active: true },
  { _id: 't1', type: 'auto', dayNumber: 1, templateText: 'Jour 1 {{link}}', active: true },
  { _id: 'm1', type: 'manual', dayNumber: 1, templateText: 'Campagne {{link}}', active: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.relanceGetSmsTemplates.mockResolvedValue(ok(templates));
  // Exactly what notification-service answers: { success, data: SmsLink[] }.
  api.relanceGetSmsLinks.mockResolvedValue(ok([
    { type: 'auto', dayNumber: 0, link: 'https://sbc.example/j0' },
    { type: 'manual', dayNumber: 1, link: 'https://sbc.example/campagne' },
  ]));
});

describe('Mes liens SMS', () => {
  it('shows the links that were saved before (they used to come back empty)', async () => {
    renderPage(<RelanceSmsLinks />);
    expect(await screen.findByDisplayValue('https://sbc.example/j0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://sbc.example/campagne')).toBeInTheDocument();
  });

  it('saves every field, so a cleared link is cleared on the server too', async () => {
    api.relanceUpdateSmsLinks.mockImplementation(async (links: unknown) => ok(links));
    renderPage(<RelanceSmsLinks />);
    const j0 = await screen.findByDisplayValue('https://sbc.example/j0');
    await userEvent.clear(j0);
    const [, day1] = screen.getAllByPlaceholderText('https://...');
    await userEvent.type(day1, 'https://sbc.example/j1');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer les liens' }));

    await waitFor(() => expect(api.relanceUpdateSmsLinks).toHaveBeenCalledTimes(1));
    expect(api.relanceUpdateSmsLinks).toHaveBeenCalledWith([
      { type: 'auto', dayNumber: 0, link: '' },
      { type: 'auto', dayNumber: 1, link: 'https://sbc.example/j1' },
      { type: 'manual', dayNumber: 1, link: 'https://sbc.example/campagne' },
    ]);
    expect(await screen.findByText(/Liens enregistrés/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://sbc.example/j1')).toBeInTheDocument();
  });

  it('says so when the save fails instead of claiming success', async () => {
    api.relanceUpdateSmsLinks.mockResolvedValue(fail(500, 'Failed to update SMS links'));
    renderPage(<RelanceSmsLinks />);
    await screen.findByDisplayValue('https://sbc.example/j0');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer les liens' }));
    expect(await screen.findByText('Failed to update SMS links')).toBeInTheDocument();
    expect(screen.queryByText(/Liens enregistrés/)).not.toBeInTheDocument();
  });
});
