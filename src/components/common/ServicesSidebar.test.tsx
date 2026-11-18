import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ supportTickets: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
import ServicesSidebar from './ServicesSidebar';

describe('services menu', () => {
  it('lists Relance, and no longer Packs publicité (retired 2026-11-07)', () => {
    renderPage(<ServicesSidebar open onClose={() => {}} />);
    expect(screen.getByText('Relance')).toBeInTheDocument();
    expect(screen.queryByText('Packs publicité')).not.toBeInTheDocument();
  });

  it('offers Aide and « Signaler un problème », which opens a new request', async () => {
    renderPage(
      <Routes>
        <Route path="*" element={<ServicesSidebar open onClose={() => {}} />} />
        <Route path="/aide/demandes/nouvelle" element={<h1>Nouvelle demande</h1>} />
      </Routes>,
    );
    expect(screen.getByText('Aide et support')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByText('Signaler un problème'));
    expect(await screen.findByRole('heading', { name: 'Nouvelle demande' })).toBeInTheDocument();
  });

  describe('« Mes demandes »', () => {
    afterEach(() => { localStorage.removeItem('token'); api.supportTickets.mockReset(); });

    it('appears once the member has requests, with how many wait for their reply', async () => {
      localStorage.setItem('token', 't');
      api.supportTickets.mockResolvedValue(ok([
        { id: 'a', status: 'en_attente_membre' }, { id: 'b', status: 'en_attente_membre' }, { id: 'c', status: 'ouvert' }, { id: 'd', status: 'ferme' },
      ]));
      renderPage(
        <Routes>
          <Route path="*" element={<ServicesSidebar open onClose={() => {}} />} />
          <Route path="/aide/demandes" element={<h1>Mes demandes</h1>} />
        </Routes>,
      );
      const entry = await screen.findByRole('button', { name: /Mes demandes/ });
      expect(screen.getByLabelText('2 demandes attendent votre réponse')).toHaveTextContent('2');
      await userEvent.setup().click(entry);
      expect(await screen.findByRole('heading', { name: 'Mes demandes' })).toBeInTheDocument();
    });

    it('stays hidden for a member who never wrote to the support', async () => {
      localStorage.setItem('token', 't');
      api.supportTickets.mockResolvedValue(ok([]));
      renderPage(<ServicesSidebar open onClose={() => {}} />);
      await vi.waitFor(() => expect(api.supportTickets).toHaveBeenCalled());
      expect(screen.queryByText('Mes demandes')).toBeNull();
    });
  });
});
