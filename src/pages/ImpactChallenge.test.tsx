import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  getCurrentImpactChallenge: vi.fn(),
  getImpactChallengeLeaderboard: vi.fn(),
  getImpactChallengeTicketAllowance: vi.fn(),
  voteImpactChallenge: vi.fn(),
  supportImpactChallenge: vi.fn(),
  generatePaymentUrl: vi.fn(),
  generateThumbnailUrl: vi.fn(),
  generateStreamedFileUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Paul Mbarga' } }) }));
const nav = vi.hoisted(() => ({ redirectTo: vi.fn() }));
vi.mock('../utils/redirect', () => nav);

import ImpactChallenge from './ImpactChallenge';
import { challengeErrorMessage, challengeVideoSrc, formatCountdown, votingPhase } from '../hooks/useImpactChallenge';

const HOUR = 3_600_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const challenge = (over: Record<string, unknown> = {}) => ({
  _id: 'c1',
  campaignName: 'Impact Challenge Octobre',
  month: 10,
  year: 2026,
  status: 'active',
  startDate: iso(-24 * HOUR),
  endDate: iso(72 * HOUR),
  description: { fr: 'Votez pour le projet du mois.', en: 'Vote for the project of the month.' },
  totalCollected: 4000,
  totalVoteCount: 20,
  ...over,
});

const entrepreneur = (id: string, projectName: string, name: string, voteCount: number) => ({
  _id: id,
  challengeId: 'c1',
  name,
  country: 'Cameroun',
  city: 'Douala',
  projectName,
  projectDescription: { fr: `${projectName} : notre projet.`, en: '' },
  businessCategory: 'Commerce',
  videoUrl: `https://cdn.example/${id}.mp4`,
  voteCount,
  totalAmount: voteCount * 200,
});

const entrepreneurs = [
  entrepreneur('e1', 'Savons Bio Awa', 'Awa Ndiaye', 12),
  entrepreneur('e2', 'Agri Tech', 'Paul Kamga', 8),
  entrepreneur('e3', 'Couture Marie', 'Marie Ngo', 0),
];

const setCurrent = (c = challenge()) => api.getCurrentImpactChallenge.mockResolvedValue(ok({ challenge: c, entrepreneurs }));
const setAllowance = (used: number, remaining: number, max = 25) =>
  api.getImpactChallengeTicketAllowance.mockResolvedValue(ok({ used, remaining, max }));

beforeEach(() => {
  vi.clearAllMocks();
  setCurrent();
  setAllowance(3, 22);
  // The leaderboard is fresher than the counts that came with the challenge.
  api.getImpactChallengeLeaderboard.mockResolvedValue(ok({
    entrepreneurs: [
      { _id: 'e1', name: 'Awa Ndiaye', projectName: 'Savons Bio Awa', voteCount: 15, totalAmount: 3000, rank: 1, videoUrl: '' },
      { _id: 'e2', name: 'Paul Kamga', projectName: 'Agri Tech', voteCount: 9, totalAmount: 1800, rank: 2, videoUrl: '' },
      { _id: 'e3', name: 'Marie Ngo', projectName: 'Couture Marie', voteCount: 1, totalAmount: 200, rank: 3, videoUrl: '' },
    ],
    lastUpdated: new Date().toISOString(),
  }));
  api.generatePaymentUrl.mockImplementation((id: string) => `https://pay.example/payments/page/${id}`);
  api.generateThumbnailUrl.mockImplementation((u: string) => u);
  api.generateStreamedFileUrl.mockImplementation((id: string) => `https://sbc.example/api/settings/files/${encodeURIComponent(id)}?stream=1`);
  api.voteImpactChallenge.mockResolvedValue(ok({ voteId: 'v1', paymentSessionId: 'sess_42', voteQuantity: 3, ticketQuantity: 3 }));
  api.supportImpactChallenge.mockResolvedValue(ok({ voteId: 'v2', paymentSessionId: 'sess_77', voteQuantity: 1, ticketQuantity: 0 }));
});

describe('no challenge running', () => {
  it('says so kindly, and still explains how it works', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(fail(404, 'No active challenge found'));
    renderPage(<ImpactChallenge />);
    expect(await screen.findByText('Aucun challenge en cours')).toBeInTheDocument();
    expect(screen.getByText('Comment ça marche ?')).toBeInTheDocument();
    expect(screen.getByText(/pour les lots de la tombola/)).toBeInTheDocument();
    expect(api.getImpactChallengeTicketAllowance).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Voter/ })).not.toBeInTheDocument();
  });

  it('shows the error and a retry when the challenge cannot be loaded', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(fail(500, 'Service indisponible'));
    renderPage(<ImpactChallenge />);
    expect(await screen.findByText('Service indisponible', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});

describe('the challenge page', () => {
  it('shows the challenge, the three entrepreneurs with their video, the ranking and my tickets', async () => {
    renderPage(<ImpactChallenge />);
    expect(await screen.findByText('Impact Challenge Octobre')).toBeInTheDocument();
    expect(screen.getByText('Votez pour le projet du mois.')).toBeInTheDocument();
    expect(screen.getByText('Fin des votes dans')).toBeInTheDocument();

    for (const name of ['Savons Bio Awa', 'Agri Tech', 'Couture Marie']) {
      const card = screen.getByRole('article', { name });
      expect(within(card).getByLabelText(`Vidéo de présentation : ${name}`)).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: `Voter pour ${name}` })).toBeEnabled();
    }
    // Live counts from the leaderboard, not the ones loaded with the challenge.
    const awa = screen.getByRole('article', { name: 'Savons Bio Awa' });
    expect(await within(awa).findByText('15 votes')).toBeInTheDocument();
    expect(screen.getByText('Classement en direct')).toBeInTheDocument();

    const tickets = await screen.findByText(/sur 25 ce mois-ci/);
    expect(tickets).toHaveTextContent('3 tickets sur 25 ce mois-ci');
    expect(screen.getByText('Encore 22 votes avec ticket ce mois-ci.')).toBeInTheDocument();
  });

  it('votes: picks the number of votes, sends 200 F per vote and opens the payment page', async () => {
    renderPage(<ImpactChallenge />);
    await screen.findByText(/sur 25 ce mois-ci/);
    await userEvent.click(screen.getByRole('button', { name: 'Voter pour Savons Bio Awa' }));

    const sheet = await screen.findByRole('dialog', { name: 'Voter pour Savons Bio Awa' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Un vote de plus' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Un vote de plus' }));
    expect(within(sheet).getByTestId('vote-total')).toHaveTextContent('600 F');
    expect(within(sheet).getByText(/\+ 3 tickets de tombola/)).toBeInTheDocument();

    await userEvent.click(within(sheet).getByRole('button', { name: 'Payer 600 F' }));
    await waitFor(() => expect(nav.redirectTo).toHaveBeenCalledWith('https://pay.example/payments/page/sess_42'));
    expect(api.voteImpactChallenge).toHaveBeenCalledWith('c1', 'e1', 600);
    expect(api.generatePaymentUrl).toHaveBeenCalledWith('sess_42');
    expect(api.supportImpactChallenge).not.toHaveBeenCalled();
  });

  it('never offers more votes than the tickets left this month', async () => {
    setAllowance(23, 2);
    renderPage(<ImpactChallenge />);
    await screen.findByText('Encore 2 votes avec ticket ce mois-ci.');
    await userEvent.click(screen.getByRole('button', { name: 'Voter pour Agri Tech' }));
    const sheet = await screen.findByRole('dialog');
    const plus = within(sheet).getByRole('button', { name: 'Un vote de plus' });
    await userEvent.click(plus);
    expect(plus).toBeDisabled();
    expect(within(sheet).getByTestId('vote-total')).toHaveTextContent('400 F');
  });

  it("shows the server's refusal in French and does not leave for the payment page", async () => {
    api.voteImpactChallenge.mockResolvedValue(fail(400,
      'You can only vote 2 more time(s) to reach the 25 ticket limit. Use the Support button for additional contributions without tickets.'));
    renderPage(<ImpactChallenge />);
    await screen.findByText(/sur 25 ce mois-ci/);
    await userEvent.click(screen.getByRole('button', { name: 'Voter pour Couture Marie' }));
    const sheet = await screen.findByRole('dialog');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Payer 200 F' }));

    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Il vous reste 2 votes avec ticket ce mois-ci.');
    expect(nav.redirectTo).not.toHaveBeenCalled();
    // The allowance is re-read so the page shows the real count.
    await waitFor(() => expect(api.getImpactChallengeTicketAllowance).toHaveBeenCalledTimes(2));
  });
});

describe('ticket limit reached', () => {
  it('offers "Soutenir" instead, explains it, and pays a support without ticket', async () => {
    setAllowance(25, 0);
    renderPage(<ImpactChallenge />);
    expect(await screen.findByText(/Vous avez vos 25 tickets du mois/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Voter pour/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Soutenir Savons Bio Awa' }));
    const sheet = await screen.findByRole('dialog', { name: 'Soutenir Savons Bio Awa' });
    expect(within(sheet).getByText(/ne donne pas de ticket/)).toBeInTheDocument();
    expect(within(sheet).queryByText(/tickets de tombola$/)).not.toBeInTheDocument();

    await userEvent.click(within(sheet).getByRole('button', { name: 'Payer 200 F' }));
    await waitFor(() => expect(nav.redirectTo).toHaveBeenCalledWith('https://pay.example/payments/page/sess_77'));
    expect(api.supportImpactChallenge).toHaveBeenCalledWith('c1', { entrepreneurId: 'e1', amount: 200, supporterName: 'Paul Mbarga' });
    expect(api.voteImpactChallenge).not.toHaveBeenCalled();
  });
});

describe('outside the voting window', () => {
  it('voting ended: says so and disables every vote button', async () => {
    setCurrent(challenge({ startDate: iso(-30 * 24 * HOUR), endDate: iso(-HOUR) }));
    renderPage(<ImpactChallenge />);
    expect((await screen.findAllByText(/Les votes sont terminés/)).length).toBeGreaterThan(0);
    for (const name of ['Savons Bio Awa', 'Agri Tech', 'Couture Marie']) {
      expect(screen.getByRole('button', { name: `Voter pour ${name}` })).toBeDisabled();
    }
    expect(screen.queryByText('Fin des votes dans')).not.toBeInTheDocument();
  });

  it('voting not started yet: disables the buttons and counts down to the opening', async () => {
    setCurrent(challenge({ startDate: iso(5 * HOUR), endDate: iso(30 * 24 * HOUR) }));
    renderPage(<ImpactChallenge />);
    expect(await screen.findByText(/Les votes n'ont pas encore commencé/)).toBeInTheDocument();
    expect(screen.getByText(/Les votes ouvrent le/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voter pour Agri Tech' })).toBeDisabled();
  });

  it('a challenge no longer active is closed even inside its dates', async () => {
    setCurrent(challenge({ status: 'voting_closed' }));
    renderPage(<ImpactChallenge />);
    expect((await screen.findAllByText(/Les votes sont fermés/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Voter pour Agri Tech' })).toBeDisabled();
  });
});

describe('helpers', () => {
  it('votingPhase follows the server rule: active and between the dates', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    const c = { status: 'active' as const, startDate: '2026-10-01T00:00:00Z', endDate: '2026-10-31T23:59:59Z' };
    expect(votingPhase(c, now)).toBe('open');
    expect(votingPhase({ ...c, startDate: '2026-10-16T00:00:00Z' }, now)).toBe('not_started');
    expect(votingPhase({ ...c, endDate: '2026-10-15T11:00:00Z' }, now)).toBe('ended');
    expect(votingPhase({ ...c, status: 'cancelled' }, now)).toBe('closed');
  });

  it('formatCountdown', () => {
    expect(formatCountdown((2 * 24 * 3600 + 5 * 3600 + 12 * 60 + 9) * 1000)).toBe('2 j 05 h 12 min');
    expect(formatCountdown((5 * 3600 + 12 * 60 + 9) * 1000)).toBe('05 h 12 min 09 s');
    expect(formatCountdown(-5000)).toBe('00 h 00 min 00 s');
  });

  it('streams bucket videos through our own origin (the bucket refuses anonymous reads)', () => {
    challengeVideoSrc('https://storage.googleapis.com/sbc-file-storage/challenges/pitch.mp4');
    expect(api.generateStreamedFileUrl).toHaveBeenCalledWith('challenges/pitch.mp4');
    expect(challengeVideoSrc('https://cdn.example/a.mp4')).toBe('https://cdn.example/a.mp4');
  });

  it('translates the server refusals', () => {
    expect(challengeErrorMessage('Voting has ended')).toBe('Les votes sont terminés.');
    expect(challengeErrorMessage('You have reached the maximum 25 lottery tickets for this month. Use the Support button to continue contributing.'))
      .toMatch(/Soutenir/);
    expect(challengeErrorMessage('Challenge is not currently accepting votes')).toBe("Ce challenge n'accepte plus de votes.");
    expect(challengeErrorMessage('Something odd')).toBe('Something odd');
  });
});
