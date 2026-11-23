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
  impactSubmitVideo: vi.fn(),
  impactSubmitProject: vi.fn(),
  impactFinal: vi.fn(),
  impactJuryMe: vi.fn(),
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

// ---------- Phase 2: the competition ----------

const round = (status: string) => ({ status, opensAt: iso(-DAY), closesAt: iso(2 * DAY), openedAt: status === 'SCHEDULED' ? null : iso(-DAY), closedAt: status === 'CLOSED' ? iso(-60_000) : null });

const competition = (stage: string, rounds: Record<string, unknown>, cand: Record<string, unknown>, submissions: Record<string, unknown> = {}) => ok({
  edition: edition({ status: stage === 'TOP3' || stage === 'LIVE' ? 'FINAL' : 'COMPETITION', stage, registrationOpen: false, rounds: { FREE: null, PAID: null, ...rounds } }),
  candidacy: candidate({
    status: 'OFFICIAL', statusLabel: 'Candidat officiel', seatNumber: 4, review: { status: 'APPROVED' },
    invitations: { valid: 10, pending: 0, required: 10, reachedAt: iso(-9 * DAY), checkedAt: iso(-DAY) },
    votes: { free: 0, paid: 0, paidAmount: 0 }, rank: null, publishedAt: iso(-3 * DAY), ...cand,
  }),
  canApply: false, blocker: null, canEdit: false, canWithdraw: false,
  submissions: { VIDEO: null, PROJECT: null, ...submissions },
});

const submission = (kind: 'VIDEO' | 'PROJECT', status: string, over: Record<string, unknown> = {}) => ({
  _id: `s-${kind}-${status}`, candidateId: 'cand1', kind, version: 1, status,
  ...(kind === 'VIDEO' ? { video: { videoFileId: 'v/old.mp4', caption: 'Ancienne légende' } } : { project: PROJECT }),
  review: status === 'PENDING' ? null : { reason: status === 'ACCEPTED' ? null : 'Le son est inaudible, refaites la vidéo.', at: iso(-DAY) },
  publishedAt: status === 'ACCEPTED' ? iso(-DAY) : null, externalUrl: null, createdAt: iso(-2 * DAY), updatedAt: iso(-DAY), ...over,
});

const PROJECT = {
  problem: 'Les légumes frais coûtent trop cher en ville.', solution: 'Une ferme bio de proximité qui livre.',
  howItWorks: 'Nous récoltons et livrons chaque matin.', targetCustomers: 'Les familles et restaurants de Douala.',
  businessModel: 'Un abonnement hebdomadaire de paniers.', expectedImpact: 'Des emplois pour les jeunes du quartier.',
  fundingUse: 'Une chambre froide et un tricycle.', outlook: 'Trois fermes partenaires en 2028 au moins.',
};

describe('competition: the candidate space', () => {
  it('week 1: sends the video (uploaded, with a caption), then shows it waiting for review', async () => {
    api.impactMe.mockResolvedValue(competition('WEEK1', { FREE: round('SCHEDULED') }, {}));
    api.uploadFile.mockResolvedValue(ok({ fileId: 'impact/vision.mp4' }));
    api.impactSubmitVideo.mockResolvedValue(ok(submission('VIDEO', 'PENDING', { video: { videoFileId: 'impact/vision.mp4', caption: 'Ma vision' } })));
    renderPage(<ImpactCandidate />);

    const form = await screen.findByRole('form', { name: 'Envoyer ma vidéo' });
    expect(within(form).getByText(/100 Mo maximum/)).toBeInTheDocument();
    await userEvent.upload(within(form).getByLabelText('Vidéo'), new File(['x'], 'vision.mp4', { type: 'video/mp4' }));
    expect(await within(form).findByText('vision.mp4 · prête')).toBeInTheDocument();
    await userEvent.type(within(form).getByLabelText('Légende (facultatif)'), 'Ma vision');
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer ma vidéo' }));

    await waitFor(() => expect(api.impactSubmitVideo).toHaveBeenCalledWith({ videoFileId: 'impact/vision.mp4', caption: 'Ma vision' }));
    expect(await screen.findByTestId('impact-video-state')).toHaveTextContent('En attente de validation');
    expect(screen.getByText(/Vidéo envoyée/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remplacer ma vidéo' })).toBeInTheDocument();
    // The project can be sent too, the public page is linked, the steps follow the week.
    expect(screen.getByRole('form', { name: 'Envoyer mon projet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir ma page publique' })).toHaveAttribute('href', '/impact-challenge/candidats/cand1');
    expect(screen.getByTestId('impact-step-2')).toHaveTextContent('En cours');
    expect(screen.getByTestId('impact-step-3')).toHaveTextContent('À venir');
    expect(screen.queryByText(/invitations validées/)).not.toBeInTheDocument();
  });

  it('refuses a video too big before uploading it', async () => {
    api.impactMe.mockResolvedValue(competition('WEEK1', { FREE: round('SCHEDULED') }, {}));
    renderPage(<ImpactCandidate />);
    const form = await screen.findByRole('form', { name: 'Envoyer ma vidéo' });
    const big = new File(['x'], 'long.mp4', { type: 'video/mp4' });
    Object.defineProperty(big, 'size', { value: 150 * 1000 * 1000 });
    await userEvent.upload(within(form).getByLabelText('Vidéo'), big);
    expect(await within(form).findByText(/La vidéo dépasse 100 Mo/)).toBeInTheDocument();
    expect(api.uploadFile).not.toHaveBeenCalled();
  });

  it('new version requested: shows the reason and sends the new version', async () => {
    api.impactMe.mockResolvedValue(competition('WEEK2', { FREE: round('SCHEDULED') }, {}, { VIDEO: submission('VIDEO', 'RESUBMIT_REQUESTED') }));
    api.impactSubmitVideo.mockResolvedValue(ok(submission('VIDEO', 'PENDING', { version: 2 })));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByTestId('impact-video-state')).toHaveTextContent('Nouvelle version demandée');
    expect(screen.getByTestId('impact-video-reason')).toHaveTextContent('Le son est inaudible, refaites la vidéo.');
    const form = screen.getByRole('form', { name: 'Envoyer ma vidéo' });
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer la nouvelle version' }));
    await waitFor(() => expect(api.impactSubmitVideo).toHaveBeenCalledWith({ videoFileId: 'v/old.mp4', caption: 'Ancienne légende' }));
    expect(await screen.findByTestId('impact-video-state')).toHaveTextContent('En attente de validation · version 2');
  });

  it('refused: shows the reason, no form', async () => {
    api.impactMe.mockResolvedValue(competition('WEEK1', { FREE: round('SCHEDULED') }, {}, { VIDEO: submission('VIDEO', 'REJECTED') }));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByTestId('impact-video-state')).toHaveTextContent('Refusée');
    expect(screen.getByTestId('impact-video-reason')).toHaveTextContent('Le son est inaudible');
    expect(screen.queryByRole('form', { name: 'Envoyer ma vidéo' })).not.toBeInTheDocument();
    expect(screen.getByText(/ne peut plus être renvoyé/)).toBeInTheDocument();
  });

  it('project: checks the 8 headings, then shows the field the server refuses', async () => {
    api.impactMe.mockResolvedValue(competition('WEEK2', { FREE: round('OPEN') }, { status: 'STAGE_2', statusLabel: 'Étape 2' }, { VIDEO: submission('VIDEO', 'ACCEPTED') }));
    api.impactSubmitProject.mockResolvedValue({
      ...fail(400, '« Les perspectives de développement » : au moins 20 caractères.'),
      body: { success: false, message: '« Les perspectives de développement » : au moins 20 caractères.', code: 'INVALID_SUBMISSION', details: { field: 'outlook' } },
    });
    renderPage(<ImpactCandidate />);
    const form = await screen.findByRole('form', { name: 'Envoyer mon projet' });
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer mon projet' }));
    expect(within(form).getByText('« Le problème » : au moins 20 caractères.')).toBeInTheDocument();
    expect(api.impactSubmitProject).not.toHaveBeenCalled();

    for (const [label, value] of [
      ['Le problème', PROJECT.problem], ['La solution', PROJECT.solution], ['Le fonctionnement', PROJECT.howItWorks],
      ['La clientèle cible', PROJECT.targetCustomers], ['Le modèle économique', PROJECT.businessModel],
      ['L’impact attendu', PROJECT.expectedImpact], ['L’utilisation d’un éventuel financement', PROJECT.fundingUse],
      ['Les perspectives de développement', PROJECT.outlook],
    ]) {
      // Pasted, not typed: 8 long texts typed key by key take seconds on a loaded CI machine.
      await userEvent.click(within(form).getByLabelText(label));
      await userEvent.paste(value);
    }
    await userEvent.click(within(form).getByRole('button', { name: 'Envoyer mon projet' }));
    await waitFor(() => expect(api.impactSubmitProject).toHaveBeenCalledWith(PROJECT));
    const outlook = within(form).getByLabelText('Les perspectives de développement');
    await waitFor(() => expect(outlook).toHaveAttribute('aria-invalid', 'true'));
    expect(within(form).getByText('« Les perspectives de développement » : au moins 20 caractères.')).toBeInTheDocument();
    // The accepted video is shown as published, without a form.
    expect(screen.getByTestId('impact-video-state')).toHaveTextContent('Validée et publiée');
    expect(screen.getByTestId('impact-step-3')).toHaveTextContent('En cours');
  });

  it('TOP 3: the votes received, the rank and « Finaliste »', async () => {
    api.impactMe.mockResolvedValue(competition('TOP3', { FREE: round('CLOSED'), PAID: round('CLOSED') },
      { status: 'FINALIST', statusLabel: 'Finaliste', rank: 1, votes: { free: 12, paid: 90, paidAmount: 18000 } },
      { VIDEO: submission('VIDEO', 'ACCEPTED'), PROJECT: submission('PROJECT', 'ACCEPTED', { externalUrl: 'https://facebook.com/sbc/posts/9' }) }));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByTestId('impact-my-result')).toHaveTextContent('🥇 1er · Finaliste');
    expect(screen.getByTestId('impact-my-free-votes')).toHaveTextContent('12 votes');
    expect(screen.getByTestId('impact-my-paid-votes')).toHaveTextContent('90 votes');
    expect(screen.getByRole('link', { name: 'Voir la publication' })).toHaveAttribute('href', 'https://facebook.com/sbc/posts/9');
    expect(screen.queryByRole('form', { name: /Envoyer/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('impact-step-5')).toHaveTextContent('En cours');
  });
});

// ---------- Phase 3: the final ----------

describe('competition: the finalist', () => {
  beforeEach(() => {
    api.impactJuryMe.mockResolvedValue(ok([]));
  });

  it('live: « La finale » leads to the live screen', async () => {
    api.impactMe.mockResolvedValue(competition('LIVE', { FREE: round('CLOSED'), PAID: round('CLOSED') },
      { status: 'FINALIST', statusLabel: 'Finaliste', rank: 2, votes: { free: 3, paid: 40, paidAmount: 8000 } }));
    api.impactFinal.mockResolvedValue(ok({ editionId: 'ed1', stage: 'LIVE', finalists: [], result: null }));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByRole('heading', { name: 'La finale' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Suivre la finale en direct' })).toHaveAttribute('href', '/impact-challenge/finale');
    expect(screen.getByTestId('impact-step-5')).toHaveTextContent('En cours');
  });

  it('after the result: the score and the rank, « Gagnant »', async () => {
    api.impactMe.mockResolvedValue(ok({
      ...(await competition('RESULT', { FREE: round('CLOSED'), PAID: round('CLOSED') },
        { status: 'WINNER', statusLabel: 'Gagnant', rank: 1, votes: { free: 3, paid: 80, paidAmount: 16000 } })).body.data,
      edition: edition({ status: 'FINISHED', stage: 'RESULT', registrationOpen: false, rounds: { FREE: round('CLOSED'), PAID: round('CLOSED') } }),
    }));
    api.impactFinal.mockResolvedValue(ok({
      editionId: 'ed1', stage: 'RESULT', finalists: [],
      result: {
        publishedAt: iso(0), winnerCandidateId: 'cand1', weights: { paidVotes: 50, publicVote: 30, jury: 20 },
        rows: [{ candidateId: 'cand1', name: 'Paul Mbarga', projectName: 'Ferme Verte', paidVotes: 80, finalVotes: 100, juryAverage: 40, juryMax: 50, jurorsCount: 3, components: { paidVotes: 100, publicVote: 100, jury: 100 }, score: 100, rank: 1 }],
      },
    }));
    renderPage(<ImpactCandidate />);
    const mine = await screen.findByTestId('impact-my-final');
    expect(mine).toHaveTextContent('100/100');
    expect(mine).toHaveTextContent('🥇 1er');
    expect(screen.getByRole('link', { name: 'Voir le résultat' })).toHaveAttribute('href', '/impact-challenge/finale');
    expect(screen.getByTestId('impact-my-result')).toHaveTextContent('Gagnant');
    expect(screen.getByText(/Vous avez remporté le SBC Impact Challenge/)).toBeInTheDocument();
    expect(screen.getByTestId('impact-step-5')).toHaveTextContent('Terminé');
  });

  it('a juror sees « Espace jury »', async () => {
    api.impactMe.mockResolvedValue(competition('LIVE', { FREE: round('CLOSED'), PAID: round('CLOSED') },
      { status: 'ELIMINATED', statusLabel: 'Éliminé', rank: 5 }));
    api.impactJuryMe.mockResolvedValue(ok([{ edition: { _id: 'ed1' }, canScore: true, finalists: [] }]));
    renderPage(<ImpactCandidate />);
    expect(await screen.findByRole('link', { name: /Espace jury/ })).toHaveAttribute('href', '/impact-challenge/jury');
    expect(screen.queryByRole('heading', { name: 'La finale' })).not.toBeInTheDocument();
  });
});
