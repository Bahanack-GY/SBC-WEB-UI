import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  impactCurrent: vi.fn(),
  impactPublicCandidate: vi.fn(),
  impactMyVotes: vi.fn(),
  impactMyPurchase: vi.fn(),
  impactFreeVote: vi.fn(),
  impactBuyVotes: vi.fn(),
  generateThumbnailUrl: vi.fn(),
  generateSettingsFileUrl: vi.fn(),
  generatePaymentUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Paul Mbarga', balance: 1500 } }) }));
const nav = vi.hoisted(() => ({ redirectTo: vi.fn() }));
vi.mock('../utils/redirect', () => nav);

import ImpactCandidateProfile from './ImpactCandidateProfile';

const DAY = 86_400_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const round = (status: string) => ({ status, opensAt: iso(-DAY), closesAt: iso(2 * DAY), openedAt: iso(-DAY), closedAt: null });

const edition = (stage: 'WEEK2' | 'WEEK3', over: Record<string, unknown> = {}) => ({
  _id: 'ed1', name: 'SBC Impact Challenge 2027', status: 'COMPETITION', stage,
  registrationOpen: false, seats: { taken: 20, max: 20 },
  rounds: stage === 'WEEK2' ? { FREE: round('OPEN'), PAID: null } : { FREE: round('CLOSED'), PAID: round('OPEN') },
  settings: {
    invitationsRequired: 10,
    votePacks: [{ votes: 1, price: 200 }, { votes: 5, price: 1000 }, { votes: 10, price: 2000 }],
    balancePayment: true,
  },
  ...over,
});

const accepted = (kind: 'VIDEO' | 'PROJECT', content: Record<string, unknown>) => ({
  _id: `s-${kind}`, candidateId: 'c1', kind, version: 1, status: 'ACCEPTED', ...content,
  review: { reason: null, at: iso(-DAY) }, publishedAt: iso(-DAY), externalUrl: kind === 'VIDEO' ? 'https://facebook.com/sbc/posts/1' : null,
  createdAt: iso(-2 * DAY), updatedAt: iso(-DAY),
});

const project = {
  problem: 'Les légumes frais coûtent cher en ville.', solution: 'Une ferme bio de proximité.', howItWorks: 'Nous livrons chaque matin.',
  targetCustomers: 'Les familles de Douala.', businessModel: 'Abonnement hebdomadaire.', expectedImpact: 'Des emplois pour les jeunes.',
  fundingUse: 'Une chambre froide.', outlook: 'Trois fermes en 2028.',
};

const candidate = (stage: 'WEEK2' | 'WEEK3', over: Record<string, unknown> = {}) => ({
  _id: 'c1', seatNumber: 4, sbcId: 'AWA01', status: stage === 'WEEK2' ? 'STAGE_2' : 'STAGE_3', statusLabel: 'Étape',
  profile: {
    name: 'Awa Ndiaye', photoFileId: 'p/awa.jpg', country: 'Cameroun', city: 'Douala', activity: 'Savonnière', category: 'Commerce',
    projectName: 'Savons Bio', projectDescription: 'Des savons naturels.', presentation: 'Présentation longue du projet.', link: 'https://shop.example/awa',
  },
  video: accepted('VIDEO', { video: { videoFileId: 'v/awa.mp4', caption: 'Ma vision de SBC en 1 minute.' } }),
  project: stage === 'WEEK3' ? accepted('PROJECT', { project }) : null,
  votes: { free: 7, paid: 30 }, rank: null,
  ...over,
});

const purchase = (over: Record<string, unknown> = {}) => ({
  _id: 'tx1', candidateId: 'c1', votes: 5, amount: 1000, method: 'BALANCE', status: 'SUCCESS', counted: true, lateSettlement: false,
  paymentSessionId: null, refund: null, createdAt: iso(0), settledAt: iso(0), ...over,
});

const setMyVotes = (over: Record<string, unknown> = {}) =>
  api.impactMyVotes.mockResolvedValue(ok({ freeVote: null, purchases: [], myCandidateId: null, canFreeVote: { ok: true }, ...over }));

const render = () => renderPage(
  <Routes><Route path="/impact-challenge/candidats/:id" element={<ImpactCandidateProfile />} /></Routes>,
  '/impact-challenge/candidats/c1',
);

const setStage = (stage: 'WEEK2' | 'WEEK3') => {
  api.impactCurrent.mockResolvedValue(ok(edition(stage)));
  api.impactPublicCandidate.mockResolvedValue(ok(candidate(stage)));
};

beforeEach(() => {
  vi.clearAllMocks();
  setStage('WEEK2');
  setMyVotes();
  api.generateThumbnailUrl.mockImplementation((id: string) => `https://sbc.example/${id}?w=384`);
  api.generateSettingsFileUrl.mockImplementation((id: string) => `https://media.example/${id}`);
  api.generatePaymentUrl.mockImplementation((id: string) => `https://pay.example/payments/page/${id}`);
});

describe('a candidate’s page', () => {
  it('shows the profile, the published video with its publication link, and a share button', async () => {
    render();
    expect(await screen.findByRole('heading', { level: 2, name: 'Awa Ndiaye' })).toBeInTheDocument();
    expect(screen.getByText('Savons Bio')).toBeInTheDocument();
    expect(screen.getByLabelText('Vidéo « Ma vision de SBC » de Awa Ndiaye')).toHaveAttribute('src', 'https://media.example/v/awa.mp4');
    expect(screen.getByText('Ma vision de SBC en 1 minute.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la publication' })).toHaveAttribute('href', 'https://facebook.com/sbc/posts/1');
    expect(screen.getByRole('link', { name: 'Voir son activité' })).toHaveAttribute('href', 'https://shop.example/awa');
    expect(screen.getByRole('button', { name: 'Partager' })).toBeInTheDocument();
    expect(screen.getByTestId('impact-free-votes')).toHaveTextContent('7 votes');
  });

  it('week 3: the project’s 8 headings', async () => {
    setStage('WEEK3');
    render();
    expect(await screen.findByText('Le modèle économique')).toBeInTheDocument();
    expect(screen.getByText('Abonnement hebdomadaire.')).toBeInTheDocument();
    expect(screen.getByText('Les perspectives de développement')).toBeInTheDocument();
    expect(screen.getByTestId('impact-paid-votes')).toHaveTextContent('30 votes');
  });
});

describe('week 2: the free vote', () => {
  it('votes, then says whom I voted for', async () => {
    api.impactFreeVote.mockResolvedValue(ok({ candidateId: 'c1', at: iso(0) }));
    render();
    await userEvent.click(await screen.findByRole('button', { name: 'Voter pour ce candidat (gratuit)' }));
    expect(api.impactFreeVote).toHaveBeenCalledWith('c1');
    expect(await screen.findByText('Vous avez voté pour Awa Ndiaye.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voter pour ce candidat/ })).not.toBeInTheDocument();
  });

  it('already voted for someone else: no button, and the name', async () => {
    setMyVotes({ freeVote: { candidateId: 'c2', candidateName: 'Paul Kamga', at: iso(-DAY) }, canFreeVote: { ok: false, code: 'ALREADY_VOTED', message: 'Vous avez déjà voté.' } });
    render();
    expect(await screen.findByText('Vous avez voté pour Paul Kamga.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voter pour ce candidat/ })).not.toBeInTheDocument();
  });

  it('ALREADY_VOTED from the server: shows its message and reads my votes again', async () => {
    api.impactFreeVote.mockResolvedValue({ ...fail(409, 'Vous avez déjà voté.'), body: { success: false, message: 'Vous avez déjà voté.', code: 'ALREADY_VOTED' } });
    render();
    await userEvent.click(await screen.findByRole('button', { name: 'Voter pour ce candidat (gratuit)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vous avez déjà voté.');
    await waitFor(() => expect(api.impactMyVotes).toHaveBeenCalledTimes(2));
  });

  it('not eligible: shows why instead of a button that would fail', async () => {
    setMyVotes({ canFreeVote: { ok: false, code: 'ACCOUNT_TOO_RECENT', message: 'Seuls les comptes créés avant l’ouverture du vote peuvent voter.' } });
    render();
    expect(await screen.findByTestId('impact-free-vote-refusal')).toHaveTextContent('Seuls les comptes créés avant l’ouverture du vote peuvent voter.');
    expect(screen.queryByRole('button', { name: /Voter pour ce candidat/ })).not.toBeInTheDocument();
    expect(api.impactFreeVote).not.toHaveBeenCalled();
  });

  it('my own page: no free vote (self-vote off), share instead', async () => {
    setMyVotes({ myCandidateId: 'c1' });
    render();
    expect(await screen.findByTestId('impact-own-page')).toHaveTextContent('C’est votre page de candidat');
    expect(within(screen.getByTestId('impact-own-page')).getByRole('button', { name: 'Partager' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voter pour ce candidat/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Partager' })).toHaveLength(1);
  });

  it('my own page with self-vote allowed: the button stays', async () => {
    api.impactCurrent.mockResolvedValue(ok(edition('WEEK2', { settings: { ...edition('WEEK2').settings, freeVote: { membersOnly: true, accountsOlderThanRound: true, selfVote: true } } })));
    setMyVotes({ myCandidateId: 'c1' });
    render();
    expect(await screen.findByRole('button', { name: 'Voter pour ce candidat (gratuit)' })).toBeInTheDocument();
    expect(screen.queryByTestId('impact-own-page')).not.toBeInTheDocument();
  });

  it('members only: shows the server’s refusal', async () => {
    api.impactFreeVote.mockResolvedValue({
      ...fail(403, 'Le vote est réservé aux membres SBC avec un pack actif.'),
      body: { success: false, message: 'Le vote est réservé aux membres SBC avec un pack actif.', code: 'MEMBERS_ONLY' },
    });
    render();
    await userEvent.click(await screen.findByRole('button', { name: 'Voter pour ce candidat (gratuit)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Le vote est réservé aux membres SBC avec un pack actif.');
    expect(screen.getByRole('button', { name: 'Voter pour ce candidat (gratuit)' })).toBeEnabled();
  });
});

describe('week 3: buying votes', () => {
  beforeEach(() => {
    setStage('WEEK3');
    setMyVotes({ canFreeVote: null });
  });

  it('my purchases carry the candidate’s name', async () => {
    setMyVotes({ canFreeVote: null, purchases: [{ ...purchase({ candidateId: 'c9' }), candidateName: 'Marie Ngo' }] });
    render();
    expect(await screen.findByTestId('impact-purchase')).toHaveTextContent('5 votes pour Marie Ngo');
  });

  it('my own page: « Acheter des votes » only when paid self-votes are allowed', async () => {
    api.impactCurrent.mockResolvedValue(ok(edition('WEEK3', { settings: { ...edition('WEEK3').settings, paidSelfVote: false } })));
    setMyVotes({ canFreeVote: null, myCandidateId: 'c1' });
    const { unmount } = render();
    expect(await screen.findByTestId('impact-own-page')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acheter des votes' })).not.toBeInTheDocument();
    unmount();

    api.impactCurrent.mockResolvedValue(ok(edition('WEEK3', { settings: { ...edition('WEEK3').settings, paidSelfVote: true } })));
    render();
    expect(await screen.findByRole('button', { name: 'Acheter des votes' })).toBeInTheDocument();
    expect(screen.queryByTestId('impact-own-page')).not.toBeInTheDocument();
  });

  const openSheet = async () => {
    render();
    await userEvent.click(await screen.findByRole('button', { name: 'Acheter des votes' }));
    return screen.findByRole('dialog', { name: 'Acheter des votes pour Awa Ndiaye' });
  };

  it('Mobile Money: opens the payment page, with a new key on every click', async () => {
    api.impactBuyVotes
      .mockResolvedValueOnce({ ...fail(503, 'Vérification de votre compte impossible pour le moment.'), body: { success: false, message: 'Vérification de votre compte impossible pour le moment.', code: 'MEMBER_CHECK_UNAVAILABLE' } })
      .mockResolvedValueOnce(ok({ transaction: purchase({ method: 'MOBILE_MONEY', status: 'PENDING', counted: false, paymentSessionId: 'sess_9' }), sessionId: 'sess_9' }));
    const sheet = await openSheet();
    expect(within(sheet).getByText(/^1\s000 F$/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('radio', { name: /5 votes/ }));
    await userEvent.click(within(sheet).getByRole('button', { name: /^Payer 1\s000 F$/ }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Vérification de votre compte impossible');
    expect(nav.redirectTo).not.toHaveBeenCalled();

    await userEvent.click(within(sheet).getByRole('button', { name: /^Payer 1\s000 F$/ }));
    await waitFor(() => expect(nav.redirectTo).toHaveBeenCalledWith('https://pay.example/payments/page/sess_9'));
    const [first, second] = api.impactBuyVotes.mock.calls.map((c) => c[0]);
    expect(first).toMatchObject({ candidateId: 'c1', packIndex: 1, method: 'MOBILE_MONEY' });
    expect(second).toMatchObject({ candidateId: 'c1', packIndex: 1, method: 'MOBILE_MONEY' });
    expect(first.idempotencyKey).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it('balance: shows the votes counted at once, and the balance', async () => {
    api.impactBuyVotes.mockResolvedValue(ok({ transaction: purchase(), sessionId: null }));
    const sheet = await openSheet();
    expect(within(sheet).getByText(/Solde : 1\s500 F/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('radio', { name: /Mon solde SBC/ }));
    await userEvent.click(within(sheet).getByRole('radio', { name: /5 votes/ }));
    await userEvent.click(within(sheet).getByRole('button', { name: /^Payer 1\s000 F$/ }));
    expect(await within(sheet).findByText('5 votes comptés pour Awa Ndiaye. Merci !')).toBeInTheDocument();
    expect(within(sheet).getByTestId('impact-tombola-tickets')).toHaveTextContent('+5 tickets de tombola');
    expect(within(sheet).getByTestId('impact-tombola-tickets')).toHaveAttribute('href', '/impact-challenge/tombola');
    expect(api.impactBuyVotes).toHaveBeenCalledWith(expect.objectContaining({ method: 'BALANCE', packIndex: 1 }));
    expect(nav.redirectTo).not.toHaveBeenCalled();
    // The counts are read again.
    await waitFor(() => expect(api.impactPublicCandidate).toHaveBeenCalledTimes(2));
  });

  it('balance, outcome unknown: « en cours de vérification »', async () => {
    api.impactBuyVotes.mockResolvedValue(ok({ transaction: purchase({ status: 'PENDING', counted: false }), sessionId: null }));
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole('radio', { name: /Mon solde SBC/ }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Payer 200 F' }));
    expect(await within(sheet).findByText('Paiement en cours de vérification')).toBeInTheDocument();
  });

  it('balance too low: the server’s message and a way out', async () => {
    api.impactBuyVotes.mockResolvedValue({ ...fail(409, 'Solde SBC insuffisant.'), body: { success: false, message: 'Solde SBC insuffisant.', code: 'INSUFFICIENT_BALANCE' } });
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole('radio', { name: /Mon solde SBC/ }));
    await userEvent.click(within(sheet).getByRole('radio', { name: /10 votes/ }));
    await userEvent.click(within(sheet).getByRole('button', { name: /^Payer 2\s000 F$/ }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Solde SBC insuffisant. Choisissez un plus petit pack ou payez par Mobile Money.');
  });

  it('purchase limit and closed votes: the server’s message', async () => {
    api.impactBuyVotes
      .mockResolvedValueOnce({ ...fail(429, 'Trop d’achats en une heure. Réessayez plus tard.'), body: { success: false, message: 'Trop d’achats en une heure. Réessayez plus tard.', code: 'PURCHASE_LIMIT' } })
      .mockResolvedValueOnce({ ...fail(409, 'Les votes payants ne sont pas ouverts.'), body: { success: false, message: 'Les votes payants ne sont pas ouverts.', code: 'VOTE_CLOSED' } });
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Payer 200 F' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Trop d’achats en une heure.');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Payer 200 F' }));
    expect(await within(sheet).findByText('Les votes payants ne sont pas ouverts.')).toBeInTheDocument();
  });
});
