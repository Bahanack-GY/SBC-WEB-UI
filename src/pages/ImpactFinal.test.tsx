import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  impactFinal: vi.fn(),
  impactCurrent: vi.fn(),
  impactMyVotes: vi.fn(),
  impactFinalVote: vi.fn(),
  impactJuryMe: vi.fn(),
  generateThumbnailUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

import ImpactFinal from './ImpactFinal';

const DAY = 86_400_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const finalist = (id: string, name: string, project: string, top3Rank: number, status = 'FINALIST') => ({
  _id: id, top3Rank, status,
  profile: { name, photoFileId: `p/${id}.jpg`, city: 'Douala', country: 'Cameroun', activity: 'Entrepreneur', projectName: project, projectDescription: '' },
  video: null, project: null,
});

const FINALISTS = [
  finalist('f1', 'Awa Ndiaye', 'Savons Bio', 1),
  finalist('f2', 'Paul Kamga', 'Agri Tech', 2),
  finalist('f3', 'Marie Ngo', 'Couture Marie', 3),
];

const final = (over: Record<string, unknown> = {}) => ok({
  editionId: 'ed1', name: 'SBC Impact Challenge 2027', status: 'FINAL', stage: 'LIVE',
  onStageCandidateId: 'f2', phase: 'QUESTIONS',
  finalVote: { status: 'OPEN', opensAt: iso(-3_600_000), closesAt: iso(DAY) },
  weights: { paidVotes: 50, publicVote: 30, jury: 20 },
  juryCriteria: [{ key: 'impact', label: 'Impact', max: 10 }],
  formula: 'Chaque partie est ramenée sur 100. Score final = Σ (pondération × partie) / 100.',
  finalists: FINALISTS,
  result: null,
  ...over,
});

const votes = (over: Record<string, unknown> = {}) => ok({
  freeVote: null, purchases: [], myCandidateId: null, canFreeVote: null, finalVote: null, canFinalVote: { ok: true }, ...over,
});

const edition = (selfVote = false) => ok({
  _id: 'ed1', name: 'SBC Impact Challenge 2027', status: 'FINAL', stage: 'LIVE', registrationOpen: false,
  seats: { taken: 20, max: 20 }, settings: { invitationsRequired: 10, freeVote: { membersOnly: true, accountsOlderThanRound: true, selfVote } },
});

beforeEach(() => {
  vi.clearAllMocks();
  api.impactFinal.mockResolvedValue(final());
  api.impactCurrent.mockResolvedValue(edition());
  api.impactMyVotes.mockResolvedValue(votes());
  api.impactJuryMe.mockResolvedValue(ok([]));
  api.generateThumbnailUrl.mockImplementation((id: string) => `https://sbc.example/${id}`);
});

describe('the live final', () => {
  it('no final yet: a friendly message', async () => {
    api.impactFinal.mockResolvedValue(ok(null));
    renderPage(<ImpactFinal />);
    expect(await screen.findByText('La finale n’a pas encore lieu')).toBeInTheDocument();
  });

  it('live: the finalist on stage with the phase, and the vote’s state', async () => {
    renderPage(<ImpactFinal />);
    const stage = await screen.findByTestId('impact-on-stage');
    expect(within(stage).getByText('Paul Kamga')).toBeInTheDocument();
    expect(within(stage).getByTestId('impact-phase')).toHaveTextContent('Questions du jury');
    expect(screen.getByTestId('impact-final-vote-line')).toHaveTextContent(/Vote du public ouvert jusqu’au/);
    expect(within(screen.getByRole('listitem', { name: 'Paul Kamga' })).getByText('En scène')).toBeInTheDocument();
    for (const name of ['Awa Ndiaye', 'Paul Kamga', 'Marie Ngo']) {
      expect(screen.getByRole('listitem', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: /Tombola/ })).toHaveAttribute('href', '/impact-challenge/tombola');
  });

  it('votes for a finalist, then says for whom', async () => {
    api.impactFinalVote.mockResolvedValue(ok({ candidateId: 'f1', at: iso(0) }));
    renderPage(<ImpactFinal />);
    await userEvent.click(await screen.findByRole('button', { name: 'Voter pour Awa Ndiaye' }));
    expect(api.impactFinalVote).toHaveBeenCalledWith('f1');
    expect(await screen.findByText('Vous avez voté pour Awa Ndiaye.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Voter pour/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Awa Ndiaye' })).getByText('Votre vote')).toBeInTheDocument();
  });

  it('not allowed: the reason instead of buttons', async () => {
    api.impactMyVotes.mockResolvedValue(votes({ canFinalVote: { ok: false, code: 'MEMBERS_ONLY', message: 'Le vote est réservé aux membres SBC avec un pack actif.' } }));
    renderPage(<ImpactFinal />);
    expect(await screen.findByTestId('impact-final-vote-refusal')).toHaveTextContent('Le vote est réservé aux membres SBC avec un pack actif.');
    expect(screen.queryByRole('button', { name: /^Voter pour/ })).not.toBeInTheDocument();
  });

  it('already voted: the name, no buttons', async () => {
    api.impactMyVotes.mockResolvedValue(votes({
      finalVote: { candidateId: 'f3', candidateName: 'Marie Ngo', at: iso(-60_000) },
      canFinalVote: { ok: false, code: 'ALREADY_VOTED', message: 'Vous avez déjà voté.' },
    }));
    renderPage(<ImpactFinal />);
    expect(await screen.findByText('Vous avez voté pour Marie Ngo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Voter pour/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('impact-final-vote-refusal')).not.toBeInTheDocument();
  });

  it('a finalist cannot vote for themselves (self-vote off)', async () => {
    api.impactMyVotes.mockResolvedValue(votes({ myCandidateId: 'f1' }));
    renderPage(<ImpactFinal />);
    expect(await screen.findByRole('button', { name: 'Voter pour Paul Kamga' })).toBeInTheDocument();
    const mine = screen.getByRole('listitem', { name: 'Awa Ndiaye' });
    expect(within(mine).getByText('Vous')).toBeInTheDocument();
    expect(within(mine).queryByRole('button', { name: /^Voter pour/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Vous ne pouvez pas voter pour vous-même/)).toBeInTheDocument();
  });

  it('a refusal from the server is shown and the eligibility read again', async () => {
    api.impactFinalVote.mockResolvedValue({ ...fail(403, 'Seuls les comptes créés avant l’ouverture du vote peuvent voter.'), body: { success: false, message: 'Seuls les comptes créés avant l’ouverture du vote peuvent voter.', code: 'ACCOUNT_TOO_RECENT' } });
    renderPage(<ImpactFinal />);
    await userEvent.click(await screen.findByRole('button', { name: 'Voter pour Marie Ngo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Seuls les comptes créés avant l’ouverture du vote peuvent voter.');
    await waitFor(() => expect(api.impactMyVotes.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('result: the winner, then each finalist’s three parts with the weights, the score, and the formula', async () => {
    api.impactFinal.mockResolvedValue(final({
      status: 'FINISHED', stage: 'RESULT', onStageCandidateId: null, phase: null,
      finalVote: { status: 'CLOSED', opensAt: iso(-DAY), closesAt: iso(-3_600_000) },
      finalists: [FINALISTS[0], { ...FINALISTS[1], status: 'WINNER' }, FINALISTS[2]],
      result: {
        publishedAt: iso(0), winnerCandidateId: 'f2', weights: { paidVotes: 50, publicVote: 30, jury: 20 },
        rows: [
          { candidateId: 'f2', name: 'Paul Kamga', projectName: 'Agri Tech', paidVotes: 80, finalVotes: 120, juryAverage: 41.5, juryMax: 50, jurorsCount: 5, components: { paidVotes: 80, publicVote: 100, jury: 92.22 }, score: 88.44, rank: 1 },
          { candidateId: 'f1', name: 'Awa Ndiaye', projectName: 'Savons Bio', paidVotes: 100, finalVotes: 60, juryAverage: 45, juryMax: 50, jurorsCount: 5, components: { paidVotes: 100, publicVote: 50, jury: 100 }, score: 85, rank: 2 },
          { candidateId: 'f3', name: 'Marie Ngo', projectName: 'Couture Marie', paidVotes: 20, finalVotes: 10, juryAverage: 20, juryMax: 50, jurorsCount: 5, components: { paidVotes: 20, publicVote: 8.33, jury: 44.44 }, score: 21.39, rank: 3 },
        ],
      },
    }));
    api.impactMyVotes.mockResolvedValue(votes({ canFinalVote: null }));
    renderPage(<ImpactFinal />);
    const winner = await screen.findByTestId('impact-winner');
    expect(winner).toHaveTextContent('Paul Kamga');
    expect(winner).toHaveTextContent('88,44/100');
    expect(screen.queryByTestId('impact-on-stage')).not.toBeInTheDocument();

    const paul = screen.getByRole('listitem', { name: 'Résultat de Paul Kamga' });
    const rows = within(paul).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(/Votes payants.*80 votes.*50 %.*80/);
    expect(rows[2]).toHaveTextContent(/Vote du public.*120 votes.*30 %.*100/);
    expect(rows[3]).toHaveTextContent(/Jury.*41,5\/50.*5 jurés.*20 %.*92,22/);
    expect(within(paul).getByTestId('impact-final-score')).toHaveTextContent('88,44');
    expect(within(paul).getByText('Score final · 1er')).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Résultat de Marie Ngo' })).getByTestId('impact-final-score')).toHaveTextContent('21,39');
    expect(screen.getByTestId('impact-formula')).toHaveTextContent('Score final = Σ (pondération × partie) / 100.');
    expect(screen.queryByRole('button', { name: /^Voter pour/ })).not.toBeInTheDocument();
  });
});
