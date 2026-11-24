import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  impactCurrent: vi.fn(),
  impactBoard: vi.fn(),
  impactMyVotes: vi.fn(),
  impactJuryMe: vi.fn(),
  generateThumbnailUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

import ImpactBoard from './ImpactBoard';

const DAY = 86_400_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const round = (status: 'SCHEDULED' | 'OPEN' | 'CLOSED', over: Record<string, unknown> = {}) => ({
  status, opensAt: iso(-DAY), closesAt: iso(2 * DAY), openedAt: status === 'SCHEDULED' ? null : iso(-DAY), closedAt: status === 'CLOSED' ? iso(-60_000) : null, ...over,
});

const edition = (stage: string, rounds: Record<string, unknown> = {}) => ({
  _id: 'ed1', name: 'SBC Impact Challenge 2027', status: stage === 'TOP3' ? 'FINAL' : 'COMPETITION', stage,
  registrationOpen: false, seats: { taken: 20, max: 20 },
  rounds: { FREE: null, PAID: null, ...rounds },
  settings: { invitationsRequired: 10, votePacks: [], balancePayment: true },
});

const cand = (id: string, name: string, project: string, over: Record<string, unknown> = {}) => ({
  _id: id, seatNumber: Number(id.slice(1)), sbcId: null, status: 'OFFICIAL', statusLabel: 'Candidat officiel',
  profile: { name, photoFileId: `p/${id}.jpg`, country: 'Cameroun', city: 'Douala', activity: 'Commerçant', category: 'Commerce', projectName: project, projectDescription: '', presentation: '', link: null },
  video: null, project: null, votes: { free: 0, paid: 0 }, rank: null, ...over,
});

const board = (stage: string, candidates: unknown[], totals = { freeVotes: 0, paidVotes: 0 }) =>
  ok({ editionId: 'ed1', stage, candidates, totals, builtAt: iso(0) });

beforeEach(() => {
  vi.clearAllMocks();
  api.generateThumbnailUrl.mockImplementation((id: string) => `https://sbc.example/${id}?w=128`);
  api.impactMyVotes.mockResolvedValue(ok({ freeVote: null, purchases: [], myCandidateId: null, canFreeVote: null }));
  api.impactJuryMe.mockResolvedValue(ok([]));
});

describe('the public board', () => {
  it('before the competition: a friendly message', async () => {
    api.impactCurrent.mockResolvedValue(ok({ ...edition('WEEK1'), status: 'QUALIFICATION', stage: null }));
    api.impactBoard.mockResolvedValue(ok(null));
    renderPage(<ImpactBoard />);
    expect(await screen.findByText('La compétition n’a pas encore commencé')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la qualification' })).toHaveAttribute('href', '/impact-challenge/candidat');
  });

  it('week 1: presents the candidates by seat, with the free vote opening date', async () => {
    api.impactCurrent.mockResolvedValue(ok(edition('WEEK1', { FREE: round('SCHEDULED', { opensAt: '2027-01-11T08:00:00Z' }) })));
    api.impactBoard.mockResolvedValue(board('WEEK1', [cand('c1', 'Awa Ndiaye', 'Savons Bio'), cand('c2', 'Paul Kamga', 'Agri Tech')]));
    renderPage(<ImpactBoard />);
    expect(await screen.findByText('Présentation des candidats')).toBeInTheDocument();
    expect(screen.getByTestId('impact-round-line')).toHaveTextContent(/Vote gratuit : ouverture le 11 janvier/);
    const awa = screen.getByRole('link', { name: 'Awa Ndiaye, Savons Bio' });
    expect(awa).toHaveAttribute('href', '/impact-challenge/candidats/c1');
    expect(within(awa).getByText('Place n° 1')).toBeInTheDocument();
    expect(awa.querySelector('img')).toHaveAttribute('src', 'https://sbc.example/p/c1.jpg?w=128');
  });

  it('week 2: free votes in the server’s order, the round’s end, and whom I voted for', async () => {
    api.impactCurrent.mockResolvedValue(ok(edition('WEEK2', { FREE: round('OPEN') })));
    api.impactBoard.mockResolvedValue(board('WEEK2', [
      cand('c2', 'Paul Kamga', 'Agri Tech', { status: 'STAGE_2', votes: { free: 12, paid: 0 } }),
      cand('c1', 'Awa Ndiaye', 'Savons Bio', { status: 'STAGE_2', votes: { free: 1, paid: 0 } }),
    ], { freeVotes: 13, paidVotes: 0 }));
    api.impactMyVotes.mockResolvedValue(ok({
      freeVote: { candidateId: 'c2', candidateName: 'Paul Kamga', at: iso(-DAY) }, purchases: [], myCandidateId: null, canFreeVote: { ok: false, code: 'ALREADY_VOTED' },
    }));
    renderPage(<ImpactBoard />);
    expect(await screen.findByText('Vote gratuit : la meilleure vidéo')).toBeInTheDocument();
    expect(screen.getByTestId('impact-round-line')).toHaveTextContent(/Vote gratuit ouvert jusqu’au/);
    expect(await screen.findByText('Vous avez voté pour Paul Kamga.')).toBeInTheDocument();
    const rows = screen.getAllByRole('link', { name: /, / });
    expect(rows[0]).toHaveAccessibleName('Paul Kamga, Agri Tech');
    expect(within(rows[0]).getByText('12 votes')).toBeInTheDocument();
    expect(within(rows[1]).getByText('1 vote')).toBeInTheDocument();
    expect(screen.getByText('13 votes gratuits')).toBeInTheDocument();
  });

  it('week 3: paid votes, and my purchases with their status and refund reason', async () => {
    api.impactCurrent.mockResolvedValue(ok(edition('WEEK3', { FREE: round('CLOSED'), PAID: round('OPEN') })));
    api.impactBoard.mockResolvedValue(board('WEEK3', [
      cand('c1', 'Awa Ndiaye', 'Savons Bio', { status: 'STAGE_3', votes: { free: 1, paid: 40 } }),
    ], { freeVotes: 1, paidVotes: 40 }));
    api.impactMyVotes.mockResolvedValue(ok({
      freeVote: null, myCandidateId: null, canFreeVote: null,
      purchases: [
        { _id: 't1', candidateId: 'c1', candidateName: 'Awa Ndiaye', votes: 5, amount: 1000, method: 'MOBILE_MONEY', status: 'SUCCESS', counted: true, lateSettlement: false, paymentSessionId: 's', refund: null, createdAt: iso(-DAY), settledAt: iso(-DAY) },
        // A candidate no longer on the board (disqualified): the name comes with the purchase.
        { _id: 't2', candidateId: 'c9', candidateName: 'Marie Ngo', votes: 1, amount: 200, method: 'BALANCE', status: 'REFUNDED', counted: false, lateSettlement: false, paymentSessionId: null, refund: { reason: 'Achat en double, remboursé.', at: iso(0) }, createdAt: iso(-DAY), settledAt: null },
      ],
    }));
    renderPage(<ImpactBoard />);
    expect(await screen.findByText('Votes payants : les projets')).toBeInTheDocument();
    expect(screen.getByTestId('impact-round-line')).toHaveTextContent(/Vote payant ouvert jusqu’au/);
    expect(within(screen.getByRole('link', { name: 'Awa Ndiaye, Savons Bio' })).getByText('40 votes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tombola/ })).toHaveAttribute('href', '/impact-challenge/tombola');
    expect(await screen.findByText('Mes achats de votes')).toBeInTheDocument();
    const purchases = screen.getAllByTestId('impact-purchase');
    expect(purchases[0]).toHaveTextContent('5 votes pour Awa Ndiaye');
    expect(purchases[0]).toHaveTextContent('Votes comptés');
    expect(purchases[1]).toHaveTextContent('1 vote pour Marie Ngo');
    expect(purchases[1]).toHaveTextContent('Remboursé');
    expect(purchases[1]).toHaveTextContent('Achat en double, remboursé.');
  });

  it('marks my own card « Vous » and links my candidate space', async () => {
    api.impactCurrent.mockResolvedValue(ok(edition('WEEK1', { FREE: round('SCHEDULED') })));
    api.impactBoard.mockResolvedValue(board('WEEK1', [cand('c1', 'Awa Ndiaye', 'Savons Bio'), cand('c2', 'Paul Kamga', 'Agri Tech')]));
    api.impactMyVotes.mockResolvedValue(ok({ freeVote: null, purchases: [], myCandidateId: 'c2', canFreeVote: null }));
    renderPage(<ImpactBoard />);
    const mine = await screen.findByRole('link', { name: 'Paul Kamga, Agri Tech' });
    expect(await within(mine).findByTestId('impact-mine')).toHaveTextContent('Vous');
    expect(within(screen.getByRole('link', { name: 'Awa Ndiaye, Savons Bio' })).queryByTestId('impact-mine')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mon espace candidat' })).toHaveAttribute('href', '/impact-challenge/candidat');
  });

  it('live final: points to the live screen, and a juror to the jury space', async () => {
    api.impactCurrent.mockResolvedValue(ok({ ...edition('LIVE', { FREE: round('CLOSED'), PAID: round('CLOSED') }), status: 'FINAL' }));
    api.impactBoard.mockResolvedValue(board('LIVE', [
      cand('c2', 'Paul Kamga', 'Agri Tech', { status: 'FINALIST', statusLabel: 'Finaliste', rank: 1, votes: { free: 3, paid: 90 } }),
    ]));
    api.impactJuryMe.mockResolvedValue(ok([{ edition: { _id: 'ed1' }, canScore: true, finalists: [] }]));
    renderPage(<ImpactBoard />);
    expect(await screen.findByText('La grande finale en direct')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suivre la finale en direct' })).toHaveAttribute('href', '/impact-challenge/finale');
    expect(await screen.findByRole('link', { name: /Espace jury/ })).toHaveAttribute('href', '/impact-challenge/jury');
  });

  it('TOP 3: the ranking with medals and the finalists', async () => {
    api.impactCurrent.mockResolvedValue(ok(edition('TOP3', { FREE: round('CLOSED'), PAID: round('CLOSED') })));
    api.impactBoard.mockResolvedValue(board('TOP3', [
      cand('c2', 'Paul Kamga', 'Agri Tech', { status: 'FINALIST', statusLabel: 'Finaliste', rank: 1, votes: { free: 3, paid: 90 } }),
      cand('c1', 'Awa Ndiaye', 'Savons Bio', { status: 'FINALIST', statusLabel: 'Finaliste', rank: 2, votes: { free: 1, paid: 40 } }),
      cand('c3', 'Marie Ngo', 'Couture', { status: 'ELIMINATED', statusLabel: 'Éliminé', rank: 4, votes: { free: 0, paid: 5 } }),
    ], { freeVotes: 4, paidVotes: 135 }));
    renderPage(<ImpactBoard />);
    expect(await screen.findByText('Classement du TOP 3')).toBeInTheDocument();
    const first = screen.getByRole('link', { name: 'Paul Kamga, Agri Tech' });
    expect(first).toHaveTextContent('🥇');
    expect(first).toHaveTextContent('1er');
    expect(within(first).getByText('Finaliste')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Awa Ndiaye, Savons Bio' })).toHaveTextContent('🥈');
    expect(within(screen.getByRole('link', { name: 'Marie Ngo, Couture' })).getByText('Éliminé')).toBeInTheDocument();
    expect(screen.queryByTestId('impact-round-line')).not.toBeInTheDocument();
  });
});
