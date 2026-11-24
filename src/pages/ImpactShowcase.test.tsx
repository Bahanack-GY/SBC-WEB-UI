import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  impactShowcase: vi.fn(),
  impactShowcasePage: vi.fn(),
  impactMyShowcase: vi.fn(),
  impactProposeShowcaseUpdate: vi.fn(),
  uploadFile: vi.fn(),
  generateThumbnailUrl: vi.fn(),
  generateSettingsFileUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

import ImpactShowcase from './ImpactShowcase';
import ImpactShowcasePage from './ImpactShowcasePage';

const card = (id: string, name: string, project: string, rank: number, over: Record<string, unknown> = {}) => ({
  _id: id, editionId: 'ed1', candidateId: `c-${id}`,
  profile: {
    name, photoFileId: `p/${id}.jpg`, activity: 'Agriculteur', category: 'Agriculture', country: 'Cameroun', city: 'Douala',
    presentation: 'Je cultive des légumes bio.', projectName: project, projectDescription: 'Une ferme bio de proximité.', sbcId: null,
  },
  result: { rank, score: rank === 1 ? 88.44 : 85, winner: rank === 1, editionName: 'SBC Impact Challenge 2027', decidedAt: '2027-03-01T20:00:00Z' },
  videoFileId: null, podcast: null, youtubeUrl: null, shopUrl: null,
  visibleFrom: '2027-03-01T20:00:00Z', visibleUntil: '2028-03-01T20:00:00Z', archived: false,
  updates: 0, lastUpdateAt: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = false;
  api.generateThumbnailUrl.mockImplementation((id: string) => `https://sbc.example/${id}`);
  api.generateSettingsFileUrl.mockImplementation((id: string) => `https://media.example/${id}`);
  api.impactMyShowcase.mockResolvedValue(ok([]));
});

describe('SBC Impact, the list', () => {
  it('shows the pages on show, winner first, and the archive collapsed', async () => {
    api.impactShowcase.mockResolvedValue(ok({
      active: [
        card('s1', 'Paul Kamga', 'Agri Tech', 1, { updates: 3, lastUpdateAt: '2027-05-12T10:00:00Z' }),
        card('s2', 'Awa Ndiaye', 'Savons Bio', 2),
      ],
      archived: [card('s0', 'Marie Ngo', 'Couture Marie', 1, { archived: true, result: { rank: 1, score: 90, winner: true, editionName: 'SBC Impact Challenge 2026', decidedAt: '2026-03-01T20:00:00Z' } })],
    }));
    renderPage(<ImpactShowcase />);
    const paul = await screen.findByRole('link', { name: 'Paul Kamga, Agri Tech' });
    expect(paul).toHaveAttribute('href', '/impact/s1');
    expect(within(paul).getByTestId('showcase-result')).toHaveTextContent('Gagnant');
    expect(within(paul).getByTestId('showcase-news')).toHaveTextContent('3 nouvelles · dernière le 12 mai 2027');
    expect(paul).toHaveTextContent('Douala, Cameroun · SBC Impact Challenge 2027');
    const awa = screen.getByRole('link', { name: 'Awa Ndiaye, Savons Bio' });
    expect(within(awa).getByTestId('showcase-result')).toHaveTextContent('Finaliste · 2e');
    expect(within(awa).getByTestId('showcase-news')).toHaveTextContent('Pas encore de nouvelle');

    const archives = screen.getByTestId('showcase-archives');
    expect(archives).not.toHaveAttribute('open');
    expect(within(archives).getByText('Archives (1)')).toBeInTheDocument();
    expect(within(archives).getByRole('link', { hidden: true, name: 'Marie Ngo, Couture Marie' })).toHaveAttribute('href', '/impact/s0');
    // A visitor without an account: no member call.
    expect(api.impactMyShowcase).not.toHaveBeenCalled();
  });

  it('empty: a friendly message', async () => {
    api.impactShowcase.mockResolvedValue(ok({ active: [], archived: [] }));
    renderPage(<ImpactShowcase />);
    expect(await screen.findByText('Les premiers finalistes arrivent bientôt')).toBeInTheDocument();
  });
});

describe('a SBC Impact page', () => {
  const render = () => renderPage(<Routes><Route path="/impact/:id" element={<ImpactShowcasePage />} /></Routes>, '/impact/s1');

  it('shows the result, the video, the outside links and the news timeline', async () => {
    api.impactShowcasePage.mockResolvedValue(ok({
      ...card('s1', 'Paul Kamga', 'Agri Tech', 1),
      videoFileId: 'v/paul.mp4',
      podcast: { url: 'https://podcast.example/ep12', title: 'Épisode 12', platform: 'Spotify' },
      youtubeUrl: 'https://youtu.be/abc', shopUrl: 'https://shop.example/paul',
      updates: [
        { _id: 'u2', kind: 'PRODUCT', title: 'Nouveau panier familial', body: 'Un panier pour 4 personnes, livré le samedi.', imageFileId: 'i/panier.jpg', link: 'https://shop.example/panier', publishedAt: '2027-05-12T10:00:00Z' },
        { _id: 'u1', kind: 'STEP', title: 'Deuxième serre construite', body: 'La deuxième serre double notre production.', imageFileId: null, link: null, publishedAt: '2027-04-02T10:00:00Z' },
      ],
    }));
    render();
    expect(await screen.findByRole('heading', { level: 2, name: 'Paul Kamga' })).toBeInTheDocument();
    expect(screen.getByTestId('showcase-page-result')).toHaveTextContent('🥇 1er');
    expect(screen.getByTestId('showcase-page-result')).toHaveTextContent('88,44/100');
    expect(screen.getByLabelText('Vidéo de présentation de Paul Kamga')).toHaveAttribute('src', 'https://media.example/v/paul.mp4');

    const podcast = screen.getByRole('link', { name: /Écouter le podcast/ });
    expect(podcast).toHaveAttribute('href', 'https://podcast.example/ep12');
    expect(podcast).toHaveAttribute('target', '_blank');
    expect(podcast).toHaveTextContent('Épisode 12 · Spotify');
    expect(screen.getByRole('link', { name: /Voir sur YouTube/ })).toHaveAttribute('href', 'https://youtu.be/abc');
    expect(screen.getByRole('link', { name: /Boutique \/ site/ })).toHaveAttribute('href', 'https://shop.example/paul');

    const news = screen.getAllByTestId('showcase-update');
    expect(news).toHaveLength(2);
    expect(news[0]).toHaveTextContent('Produit');
    expect(news[0]).toHaveTextContent('Nouveau panier familial');
    expect(news[0]).toHaveTextContent('12 mai 2027');
    expect(news[0].querySelector('img')).toHaveAttribute('src', 'https://sbc.example/i/panier.jpg');
    expect(within(news[0]).getByRole('link', { name: /En savoir plus/ })).toHaveAttribute('href', 'https://shop.example/panier');
    expect(news[1]).toHaveTextContent('Étape');
    expect(screen.getByRole('button', { name: 'Partager' })).toBeInTheDocument();
  });

  it('a hidden or unknown page: says so', async () => {
    api.impactShowcasePage.mockResolvedValue(fail(404, 'Page introuvable.'));
    render();
    expect(await screen.findByText('Cette page n’existe pas ou n’est plus visible.')).toBeInTheDocument();
  });
});

describe('the finalist’s own page', () => {
  const mine = (over: Record<string, unknown> = {}) => ({
    ...card('s1', 'Paul Kamga', 'Agri Tech', 2), hidden: false,
    updates: [
      { _id: 'u3', kind: 'NEWS', title: 'Article dans la presse', body: '…', imageFileId: null, link: null, publishedAt: null, status: 'PENDING', review: null },
      { _id: 'u2', kind: 'PRODUCT', title: 'Nouveau panier', body: '…', imageFileId: null, link: null, publishedAt: '2027-05-12T10:00:00Z', status: 'PUBLISHED', review: null },
      { _id: 'u1', kind: 'ACHIEVEMENT', title: 'Prix régional', body: '…', imageFileId: null, link: null, publishedAt: null, status: 'REJECTED', review: { reason: 'Ajoutez une source pour ce prix, merci.', at: '2027-05-01T10:00:00Z' } },
    ],
    ...over,
  });

  beforeEach(() => {
    auth.isAuthenticated = true;
    api.impactShowcase.mockResolvedValue(ok({ active: [], archived: [] }));
  });

  it('shows « Ma page SBC Impact » with each news’ state', async () => {
    api.impactMyShowcase.mockResolvedValue(ok([mine()]));
    renderPage(<ImpactShowcase />);
    expect(await screen.findByRole('heading', { name: 'Ma page SBC Impact' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir ma page' })).toHaveAttribute('href', '/impact/s1');
    const items = screen.getAllByTestId('my-showcase-update');
    expect(items[0]).toHaveTextContent('En attente de validation');
    expect(items[1]).toHaveTextContent('Publiée');
    expect(items[2]).toHaveTextContent('Refusée');
    expect(items[2]).toHaveTextContent('Ajoutez une source pour ce prix, merci.');
  });

  it('publishes a news: checked here, then the server’s field error, then sent', async () => {
    api.impactMyShowcase.mockResolvedValue(ok([mine()]));
    api.impactProposeShowcaseUpdate
      .mockResolvedValueOnce({ ...fail(400, 'L’adresse doit commencer par https://.'), body: { success: false, message: 'L’adresse doit commencer par https://.', code: 'INVALID_URL', details: { field: 'link' } } })
      .mockResolvedValueOnce(ok({ _id: 'u4', kind: 'STEP', title: 'Troisième serre', body: 'La troisième serre est en construction.', imageFileId: null, link: 'https://ferme.example', publishedAt: null, status: 'PENDING', review: null }));
    renderPage(<ImpactShowcase />);
    await userEvent.click(await screen.findByRole('button', { name: 'Publier une nouvelle' }));
    const form = await screen.findByRole('form', { name: 'Publier une nouvelle' });

    await userEvent.type(within(form).getByLabelText('Titre'), 'Tr');
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer la nouvelle' }));
    expect(within(form).getByText('Titre : 3 à 120 caractères.')).toBeInTheDocument();
    expect(within(form).getByText('Texte : 20 à 3 000 caractères.')).toBeInTheDocument();
    expect(api.impactProposeShowcaseUpdate).not.toHaveBeenCalled();

    await userEvent.selectOptions(within(form).getByLabelText('Type'), 'STEP');
    await userEvent.type(within(form).getByLabelText('Titre'), 'oisième serre');
    await userEvent.type(within(form).getByLabelText('Texte'), 'La troisième serre est en construction.');
    await userEvent.type(within(form).getByLabelText('Lien (facultatif)'), 'https://ferme.example');
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer la nouvelle' }));
    expect(await within(form).findByText('L’adresse doit commencer par https://.')).toBeInTheDocument();
    expect(within(form).getByLabelText('Lien (facultatif)')).toHaveAttribute('aria-invalid', 'true');

    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer la nouvelle' }));
    await waitFor(() => expect(api.impactProposeShowcaseUpdate).toHaveBeenCalledTimes(2));
    expect(api.impactProposeShowcaseUpdate).toHaveBeenLastCalledWith('s1', {
      kind: 'STEP', title: 'Troisième serre', body: 'La troisième serre est en construction.', link: 'https://ferme.example',
    });
    expect(await screen.findByText(/Nouvelle envoyée : elle sera publiée après validation/)).toBeInTheDocument();
    expect(screen.getAllByTestId('my-showcase-update')[0]).toHaveTextContent('Troisième serre');
  });

  it('too many pending: the server’s message', async () => {
    api.impactMyShowcase.mockResolvedValue(ok([mine()]));
    api.impactProposeShowcaseUpdate.mockResolvedValue({ ...fail(409, 'Vous avez déjà 5 nouvelles en attente de validation.'), body: { success: false, message: 'Vous avez déjà 5 nouvelles en attente de validation.', code: 'TOO_MANY_PENDING' } });
    renderPage(<ImpactShowcase />);
    await userEvent.click(await screen.findByRole('button', { name: 'Publier une nouvelle' }));
    const form = await screen.findByRole('form', { name: 'Publier une nouvelle' });
    await userEvent.type(within(form).getByLabelText('Titre'), 'Une nouvelle');
    await userEvent.type(within(form).getByLabelText('Texte'), 'Un texte assez long pour passer.');
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer la nouvelle' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Vous avez déjà 5 nouvelles en attente de validation.');
  });

  it('INVALID_UPDATE: the message next to its field; ARCHIVED: the message on the form', async () => {
    api.impactMyShowcase.mockResolvedValue(ok([mine()]));
    api.impactProposeShowcaseUpdate
      .mockResolvedValueOnce({ ...fail(400, 'Texte : 20 à 3 000 caractères.'), body: { success: false, message: 'Texte : 20 à 3 000 caractères.', code: 'INVALID_UPDATE', details: { field: 'body' } } })
      .mockResolvedValueOnce({ ...fail(409, 'Cette page est archivée.'), body: { success: false, message: 'Cette page est archivée.', code: 'ARCHIVED' } });
    renderPage(<ImpactShowcase />);
    await userEvent.click(await screen.findByRole('button', { name: 'Publier une nouvelle' }));
    const form = await screen.findByRole('form', { name: 'Publier une nouvelle' });
    await userEvent.type(within(form).getByLabelText('Titre'), 'Une nouvelle');
    await userEvent.type(within(form).getByLabelText('Texte'), 'Un texte assez long pour passer.');
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer la nouvelle' }));
    await waitFor(() => expect(within(form).getByLabelText('Texte')).toHaveAttribute('aria-invalid', 'true'));
    expect(within(form).getByText('Texte : 20 à 3 000 caractères.')).toBeInTheDocument();
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer la nouvelle' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Cette page est archivée.');
  });

  it('an archived page: no « Publier une nouvelle »', async () => {
    api.impactMyShowcase.mockResolvedValue(ok([mine({ archived: true })]));
    renderPage(<ImpactShowcase />);
    expect(await screen.findByText(/Votre page est aux archives/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publier une nouvelle' })).not.toBeInTheDocument();
  });
});
