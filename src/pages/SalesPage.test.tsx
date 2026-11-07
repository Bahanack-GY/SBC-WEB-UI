import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ok, fail, renderPage } from '../test/api';
import type { SalesPage as SalesPageData } from '../types/api';

const api = vi.hoisted(() => ({
  getSalesPage: vi.fn(),
  generateThumbnailUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

import SalesPage from './SalesPage';

const page = (over: Partial<SalesPageData> = {}): SalesPageData => ({
  name: 'Awa Ndiaye',
  firstName: 'Awa',
  avatarUrl: '/api/users/avatar/file123',
  whatsappNumber: '237699001122',
  country: 'CM',
  referralCode: 'AWA237',
  packs: [
    { id: 'CLASSIQUE', name: 'Pack Classique', price: 2150, currency: 'XAF', features: ['Accès à vie à SBC'] },
    { id: 'CIBLE', name: 'Pack Ciblé', price: 5300, currency: 'XAF', features: ['Tout le Pack Classique'] },
    { id: 'WINNER', name: 'Pack Winner', price: 15900, currency: 'XAF', features: ['Tout le Pack Ciblé, à vie', 'Accès au groupe VIP SBC'] },
  ],
  ...over,
});

const open = (code = 'AWA237') =>
  renderPage(
    <Routes>
      <Route path="/p/:code" element={<SalesPage />} />
    </Routes>,
    `/p/${code}`,
  );

beforeEach(() => {
  vi.clearAllMocks();
  document.title = 'SBC';
  api.getSalesPage.mockResolvedValue(ok(page()));
  api.generateThumbnailUrl.mockImplementation((src: string, w: number) => `https://thumbs.example/${src}?w=${w}`);
});

describe('Page de vente', () => {
  it('invites the prospect to sign up under the member', async () => {
    open();

    expect(await screen.findByRole('heading', { level: 1, name: 'Awa vous invite à rejoindre Sniper Business Center' })).toBeInTheDocument();
    expect(api.getSalesPage).toHaveBeenCalledWith('AWA237');
    expect(screen.getByText('La plateforme africaine pour gagner avec vos statuts WhatsApp, vos contacts et votre réseau.')).toBeInTheDocument();
    expect(document.title).toBe('Awa vous invite — SBC');

    // Every sign-up button carries the member's code (hero, after the packs, sticky bar).
    const signups = screen.getAllByRole('link', { name: 'Je m\'inscris avec Awa' });
    expect(signups.length).toBeGreaterThanOrEqual(2);
    for (const link of signups) expect(link).toHaveAttribute('href', '/signup?affiliationCode=AWA237');

    const whatsapp = screen.getByRole('link', { name: /Poser une question sur WhatsApp/ });
    expect(whatsapp).toHaveAttribute(
      'href',
      `https://wa.me/237699001122?text=${encodeURIComponent('Bonjour Awa, je viens de votre page SBC et j\'aimerais en savoir plus.')}`,
    );

    // The avatar proxy path is resized by its file id.
    expect(api.generateThumbnailUrl).toHaveBeenCalledWith('file123', 192);
    expect(screen.getByRole('img', { name: 'Awa Ndiaye' })).toHaveAttribute('src', 'https://thumbs.example/file123?w=192');

    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion');
  });

  it('says what the prospect gets, how it works, and shows the three packs', async () => {
    open();

    const benefits = await screen.findByRole('region', { name: 'Ce que vous obtenez' });
    for (const item of [
      'Gagnez avec vos statuts WhatsApp',
      'Commissions sur 3 niveaux de filleuls',
      'Fichier de contacts SBC pour plus de vues',
      'Formations offertes',
    ]) expect(within(benefits).getByText(item)).toBeInTheDocument();
    expect(within(benefits).getByText('SBC Ads Network')).toBeInTheDocument();

    const steps = screen.getByRole('region', { name: 'Comment ça marche' });
    expect(within(steps).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1Inscrivez-vous avec le lien de Awa.',
      '2Choisissez votre pack, payé une seule fois.',
      '3Commencez à gagner.',
    ]);

    const classique = screen.getByRole('article', { name: 'Pack Classique' });
    expect(within(classique).getByText(/2\s150 FCFA/)).toBeInTheDocument();
    expect(within(classique).getByText('une fois · à vie')).toBeInTheDocument();
    expect(within(classique).getByText('Accès à vie à SBC')).toBeInTheDocument();
    const winner = screen.getByRole('article', { name: 'Pack Winner' });
    expect(within(winner).getByText('Le plus complet')).toBeInTheDocument();
    expect(within(winner).getByText(/15\s900 FCFA/)).toBeInTheDocument();
    expect(within(winner).getByText('Accès au groupe VIP SBC')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Pack Ciblé' })).queryByText('Le plus complet')).not.toBeInTheDocument();
  });

  it('has no WhatsApp button when the member has no number', async () => {
    api.getSalesPage.mockResolvedValue(ok(page({ whatsappNumber: null })));
    open();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('falls back to a plain sign-up that still credits the code when the page does not exist', async () => {
    api.getSalesPage.mockResolvedValue(fail(404, 'Page introuvable.'));
    open('NOPE42');

    expect(await screen.findByText('Cette page n\'existe pas ou n\'est plus disponible.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'S\'inscrire sur SBC' })).toHaveAttribute('href', '/signup?affiliationCode=NOPE42');
    // A missing page is not retried.
    expect(api.getSalesPage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
