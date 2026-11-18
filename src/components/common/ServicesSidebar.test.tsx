import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderPage } from '../../test/api';
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
});
