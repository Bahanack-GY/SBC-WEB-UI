import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  impactCurrent: vi.fn(),
  impactMe: vi.fn(),
  impactApply: vi.fn(),
  impactUpdateCandidacy: vi.fn(),
  impactRefreshCandidacy: vi.fn(),
  impactWithdraw: vi.fn(),
  uploadFile: vi.fn(),
  generateThumbnailUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Paul Mbarga', referralCode: 'PAUL01', country: 'CM', city: 'Douala' } }),
}));

import ImpactCandidate from './ImpactCandidate';

const DAY = 86_400_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const edition = (over: Record<string, unknown> = {}) => ({
  _id: 'ed1',
  name: 'SBC Impact Challenge 2027',
  slug: 'sbc-impact-challenge-2027',
  description: 'Le concours des entrepreneurs SBC.',
  rulesText: 'Article 1 : participation.\nArticle 2 : qualification.',
  status: 'QUALIFICATION',
  schedule: { qualificationOpensAt: iso(-5 * DAY), qualificationClosesAt: iso(20 * DAY) },
  registrationOpen: true,
  registrationClosedReason: null,
  seats: { taken: 3, max: 20 },
  settings: {
    maxCandidates: 20, invitationsRequired: 10, waitlistSize: 5, finalistsCount: 3,
    categories: ['Agriculture', 'Commerce'],
    profileFields: [],
  },
  ...over,
});

const profile = {
  name: 'Paul Mbarga',
  photoFileId: 'impact/photo-1.jpg',
  country: 'Cameroun',
  city: 'Douala',
  activity: 'Agriculteur',
  category: 'Agriculture',
  projectName: 'Ferme Verte',
  projectDescription: 'Une ferme bio qui livre les marchés de Douala.',
  presentation: 'Le problème : les légumes frais coûtent cher. Notre solution : une ferme bio de proximité.',
  extra: {},
};

const candidate = (over: Record<string, unknown> = {}) => ({
  _id: 'cand1', editionId: 'ed1', userId: 'u1', sbcId: 'PAUL01',
  profile,
  status: 'QUALIFYING', statusLabel: 'En qualification', suspendedFrom: null,
  invitations: { valid: 7, pending: 3, required: 10, reachedAt: null, checkedAt: iso(-60_000) },
  seatNumber: null, seatAt: null, waitlistRank: null,
  review: { status: 'PENDING' },
  profileUpdatedAt: iso(-DAY), statusHistory: [], createdAt: iso(-DAY), updatedAt: iso(-DAY),
  ...over,
});

const space = (over: Record<string, unknown> = {}) => ok({
  edition: edition(), candidacy: null, canApply: true, blocker: null,
  canEdit: !!over.candidacy, canWithdraw: !!over.candidacy, ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  api.impactMe.mockResolvedValue(space());
  api.generateThumbnailUrl.mockImplementation((id: string) => `https://sbc.example/api/settings/files/${id}?w=128`);
});

describe('no edition', () => {
  it('says there is no edition, without a form', async () => {
    api.impactMe.mockResolvedValue(ok({ edition: null, candidacy: null, canApply: false, blocker: { code: 'NO_EDITION', message: 'Aucune édition.' } }));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByText('Pas d’édition en cours')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Devenir candidat' })).not.toBeInTheDocument();
  });
});

describe('not a candidate yet', () => {
  it('shows the edition, its key rules and the rules text with its line breaks', async () => {
    renderPage(<ImpactCandidate />);
    expect(await screen.findByText('SBC Impact Challenge 2027')).toBeInTheDocument();
    expect(screen.getByText('Le concours des entrepreneurs SBC.')).toBeInTheDocument();
    expect(screen.getByText('10 personnes')).toBeInTheDocument();
    expect(screen.getByText('3/20 prises')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Lire le règlement' }));
    const sheet = await screen.findByRole('dialog', { name: 'Règlement' });
    expect(within(sheet).getByTestId('impact-rules-text').textContent).toBe('Article 1 : participation.\nArticle 2 : qualification.');
  });

  it('can apply: « Devenir candidat » opens the form, prefilled from the account', async () => {
    renderPage(<ImpactCandidate />);
    await userEvent.click(await screen.findByRole('button', { name: 'Devenir candidat' }));
    const form = await screen.findByRole('form', { name: 'Profil de candidat' });
    expect(within(form).getByLabelText('Nom et prénom')).toHaveValue('Paul Mbarga');
    expect(within(form).getByLabelText('Pays')).toHaveValue('Cameroun');
    expect(within(form).getByLabelText('Ville')).toHaveValue('Douala');
    expect(within(form).getByRole('combobox', { name: 'Catégorie' })).toBeInTheDocument();
    expect(within(form).getByText(/J’accepte que SBC publie mon profil, ma photo, mes vidéos/)).toBeInTheDocument();
  });

  it('checks the profile before sending it', async () => {
    renderPage(<ImpactCandidate />);
    await userEvent.click(await screen.findByRole('button', { name: 'Devenir candidat' }));
    const form = await screen.findByRole('form', { name: 'Profil de candidat' });
    await userEvent.type(within(form).getByLabelText('Description du projet'), 'Trop court');
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer ma candidature' }));

    expect(await within(form).findByText('« Description du projet » : au moins 20 caractères.')).toBeInTheDocument();
    expect(within(form).getByText('Ajoutez une photo.')).toBeInTheDocument();
    expect(within(form).getByText('Choisissez une catégorie.')).toBeInTheDocument();
    expect(within(form).getByText(/Cochez la case/)).toBeInTheDocument();
    expect(api.impactApply).not.toHaveBeenCalled();
  });

  it('registration closed: shows the server’s reason, no button', async () => {
    api.impactMe.mockResolvedValue(space({
      canApply: false,
      blocker: { code: 'REGISTRATION_CLOSED', message: 'INSCRIPTIONS FERMÉES : toutes les places sont prises ou la qualification est terminée.' },
    }));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByText(/INSCRIPTIONS FERMÉES/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Devenir candidat' })).not.toBeInTheDocument();
  });
});

describe('candidate space', () => {
  it('qualifying: the counter, the pending sign-ups, the invite link and the review', async () => {
    api.impactMe.mockResolvedValue(space({ candidacy: candidate(), canApply: false }));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByText('7/10 invitations validées')).toBeInTheDocument();
    expect(screen.getByText('3 inscrits en attente de paiement')).toBeInTheDocument();
    expect(screen.getByText('En qualification')).toBeInTheDocument();
    expect(screen.getByTestId('impact-invite-link')).toHaveTextContent('/signup?affiliationCode=PAUL01');
    expect(screen.getByText('Profil en cours de vérification')).toBeInTheDocument();
    expect(screen.getByText('Semaine 2 : Vidéo « Ma vision de SBC »')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Me retirer du Challenge' })).toBeInTheDocument();
  });

  it('official: shows the seat number', async () => {
    api.impactMe.mockResolvedValue(space({
      candidacy: candidate({
        status: 'OFFICIAL', statusLabel: 'Candidat officiel', seatNumber: 4, seatAt: iso(-DAY),
        invitations: { valid: 10, pending: 0, required: 10, reachedAt: iso(-DAY), checkedAt: iso(-60_000) },
        review: { status: 'APPROVED' },
      }),
      canApply: false,
    }));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByText('Place n° 4')).toBeInTheDocument();
    expect(screen.getByText(/Vous êtes candidat officiel, place n° 4/)).toBeInTheDocument();
    expect(screen.getByText('Candidature validée')).toBeInTheDocument();
    expect(screen.queryByText(/en attente de paiement/)).not.toBeInTheDocument();
    // The seat is won: no more invite block.
    expect(screen.queryByTestId('impact-invite-link')).not.toBeInTheDocument();
  });

  it('changes requested: shows the reason and edits the profile', async () => {
    api.impactMe.mockResolvedValue(space({
      candidacy: candidate({ review: { status: 'CHANGES_REQUESTED', reason: 'Votre photo est floue, merci d’en mettre une autre.' } }),
      canApply: false,
    }));
    api.impactUpdateCandidacy.mockResolvedValue(ok(candidate({ review: { status: 'PENDING' } })));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByTestId('impact-review-reason')).toHaveTextContent('Votre photo est floue, merci d’en mettre une autre.');

    await userEvent.click(screen.getByRole('button', { name: 'Modifier mon profil' }));
    const form = await screen.findByRole('form', { name: 'Modifier mon profil' });
    expect(within(form).getByLabelText('Nom du projet')).toHaveValue('Ferme Verte');
    expect(within(form).queryByText(/J’accepte que SBC publie/)).not.toBeInTheDocument();
    await userEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(api.impactUpdateCandidacy).toHaveBeenCalledWith(expect.objectContaining({
      projectName: 'Ferme Verte', photoFileId: 'impact/photo-1.jpg', category: 'Agriculture',
    })));
    expect(await screen.findByText(/Profil enregistré/)).toBeInTheDocument();
    expect(screen.getByText('Profil en cours de vérification')).toBeInTheDocument();
  });

  it('shows a field the server refuses next to that field', async () => {
    api.impactMe.mockResolvedValue(space({ candidacy: candidate(), canApply: false }));
    api.impactUpdateCandidacy.mockResolvedValue({
      ...fail(400, '« Présentation du projet » : au moins 50 caractères.'),
      body: { success: false, message: '« Présentation du projet » : au moins 50 caractères.', code: 'INVALID_PROFILE', details: { field: 'Présentation du projet' } },
    });
    renderPage(<ImpactCandidate />);
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier mon profil' }));
    const form = await screen.findByRole('form', { name: 'Modifier mon profil' });
    await userEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));

    const field = within(form).getByLabelText('Présentation du projet');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(within(form).getByText('« Présentation du projet » : au moins 50 caractères.')).toBeInTheDocument();
  });

  it('« Actualiser » asks to wait on a 429', async () => {
    api.impactMe.mockResolvedValue(space({ candidacy: candidate(), canApply: false }));
    api.impactRefreshCandidacy.mockResolvedValue(fail(429, 'Trop de demandes. Réessayez dans un instant.'));
    renderPage(<ImpactCandidate />);
    await userEvent.click(await screen.findByRole('button', { name: 'Actualiser' }));
    expect(await screen.findByText('Patientez quelques secondes avant d’actualiser à nouveau.')).toBeInTheDocument();
  });

  it('« Actualiser » says how long to wait when the server tells', async () => {
    api.impactMe.mockResolvedValue(space({ candidacy: candidate(), canApply: false }));
    const refused = fail(429, 'Trop de demandes.');
    api.impactRefreshCandidacy.mockResolvedValue({ ...refused, body: { ...refused.body, code: 'TOO_MANY_REQUESTS', details: { retryAfterSeconds: 20 } } });
    renderPage(<ImpactCandidate />);
    await userEvent.click(await screen.findByRole('button', { name: 'Actualiser' }));
    expect(await screen.findByText('Patientez 20 secondes avant d’actualiser à nouveau.')).toBeInTheDocument();
  });

  it('follows the server: no edit or withdraw when it says no', async () => {
    api.impactMe.mockResolvedValue(space({
      candidacy: candidate({ review: { status: 'CHANGES_REQUESTED', reason: 'Photo floue, merci de la remplacer.' } }),
      canApply: false, canEdit: false, canWithdraw: false,
    }));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByText('Photo floue, merci de la remplacer.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier mon profil' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Me retirer du Challenge' })).not.toBeInTheDocument();
  });

  it('« Actualiser » shows the new count', async () => {
    api.impactMe.mockResolvedValue(space({ candidacy: candidate(), canApply: false }));
    api.impactRefreshCandidacy.mockResolvedValue(ok(candidate({ invitations: { valid: 8, pending: 2, required: 10, reachedAt: null, checkedAt: iso(0) } })));
    renderPage(<ImpactCandidate />);
    await userEvent.click(await screen.findByRole('button', { name: 'Actualiser' }));
    expect(await screen.findByText('8/10 invitations validées')).toBeInTheDocument();
    expect(screen.getByText('2 inscrits en attente de paiement')).toBeInTheDocument();
  });

  it('withdraws only after the confirmation sheet', async () => {
    api.impactMe.mockResolvedValue(space({ candidacy: candidate(), canApply: false }));
    api.impactWithdraw.mockResolvedValue(ok(candidate({ status: 'WITHDRAWN', statusLabel: 'Retiré' })));
    renderPage(<ImpactCandidate />);
    await userEvent.click(await screen.findByRole('button', { name: 'Me retirer du Challenge' }));
    const sheet = await screen.findByRole('dialog', { name: 'Me retirer du Challenge' });
    expect(api.impactWithdraw).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Me retirer' }));

    await waitFor(() => expect(api.impactWithdraw).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Retiré')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier mon profil' })).not.toBeInTheDocument();
  });
});
