import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { createHash } from 'node:crypto';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  impactCurrent: vi.fn(),
  impactTombola: vi.fn(),
  impactMyTombola: vi.fn(),
  impactTombolaHistory: vi.fn(),
  impactTombolaProof: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
// Short timings: the live polling (3 s) and the drawing effect, so the reveal can be watched across polls.
vi.mock('../hooks/tombolaTiming', () => ({
  TOMBOLA_LIVE_POLL_MS: 150, TOMBOLA_IDLE_POLL_MS: 60_000, TOMBOLA_REVEAL_MS: 300, TOMBOLA_REVEAL_REDUCED_MS: 300,
}));

import ImpactTombola from './ImpactTombola';
import ImpactTombolaProof from './ImpactTombolaProof';

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

const PRIZES = [
  { key: 'cash', label: 'Prix en espèces', category: 'cash' },
  { key: 'ordinateur', label: 'Un ordinateur', category: 'ordinateur' },
  { key: 'telephone', label: 'Un téléphone portable', category: 'telephone' },
];
const TIERS = [{ upTo: 10, weight: 1 }, { upTo: 50, weight: 0.5 }, { upTo: null, weight: 0.25 }];

const draw = (over: Record<string, unknown> = {}) => ({
  _id: 'd1', editionId: 'ed1', status: 'COMMITTED', seedCommitment: 'c0ffee'.repeat(10) + 'beef', committedAt: iso(-86_400_000),
  committedBeforeTicketsClosed: true, seed: null, drawnAt: null, prizes: [], totalTickets: null, participants: null,
  segmentsHash: null, revealedCount: 0, winnersCount: 0, winners: [], ...over,
});

const tombola = (d: unknown) => ok({
  editionId: 'ed1', editionName: 'SBC Impact Challenge 2027', prizes: PRIZES, tiers: TIERS, cooldownDays: 365,
  totalTickets: 1240, participants: 310, draw: d,
});

const done = (revealed: number, winners: unknown[]) => draw({
  status: 'DONE', seed: 'ab'.repeat(32), drawnAt: iso(-60_000), prizes: PRIZES, totalTickets: 1240, participants: 310,
  segmentsHash: 'ff'.repeat(32), revealedCount: revealed, winnersCount: 3, winners,
});

const W1 = { order: 1, prizeKey: 'cash', prizeLabel: 'Prix en espèces', category: 'cash', ticketNumber: 427, displayName: 'Awa N.', status: 'PENDING' };
const W2 = { order: 2, prizeKey: 'ordinateur', prizeLabel: 'Un ordinateur', category: 'ordinateur', ticketNumber: 12, displayName: 'Paul K.', status: 'PENDING' };
const W3_NONE = { order: 3, prizeKey: 'telephone', prizeLabel: 'Un téléphone portable', category: 'telephone', ticketNumber: null, displayName: null, status: 'NOT_AWARDED' };

beforeEach(() => {
  vi.clearAllMocks();
  api.impactCurrent.mockResolvedValue(ok({ _id: 'ed1', status: 'FINAL', stage: 'TOP3', settings: {}, seats: { taken: 20, max: 20 } }));
  api.impactTombola.mockResolvedValue(tombola(draw()));
  api.impactMyTombola.mockResolvedValue(ok({
    editionId: 'ed1', tickets: 12, ranges: [{ from: 1, to: 5 }, { from: 8, to: 14 }], sharePct: 1.84, totalTickets: 1240, drawn: false, wins: [],
  }));
  api.impactTombolaHistory.mockResolvedValue(ok([]));
});

describe('SBC Tombola, before the draw', () => {
  it('shows the tickets, the prizes in order, the rules with the example, the commitment and my tickets', async () => {
    renderPage(<ImpactTombola />);
    expect(await screen.findByTestId('tombola-total')).toHaveTextContent(/1\s240/);
    expect(screen.getByTestId('tombola-participants')).toHaveTextContent('310');
    expect(screen.getByTestId('tombola-status')).toHaveTextContent('Tirage au sort à la fin de la grande finale.');
    const lots = screen.getAllByRole('listitem', { name: /^Lot \d/ });
    expect(lots.map((l) => l.getAttribute('aria-label'))).toEqual(['Lot 1 : Prix en espèces', 'Lot 2 : Un ordinateur', 'Lot 3 : Un téléphone portable']);

    expect(screen.getByText('1 vote payant = 1 ticket.')).toBeInTheDocument();
    expect(screen.getByText(/du 1e au 10e : 1 ; du 11e au 50e : ½ ; à partir du 51e : ¼/)).toBeInTheDocument();
    expect(screen.getByTestId('tombola-example')).toHaveTextContent('100 tickets pèsent 42,5 contre 1 pour un ticket seul, qui garde donc 2,3 % de chances.');
    expect(screen.getByText('Un seul lot par personne')).toBeInTheDocument();
    expect(screen.getByText(/en un an/)).toBeInTheDocument();

    expect(screen.getByTestId('tombola-commitment')).toHaveTextContent('c0ffee');
    expect(screen.queryByTestId('tombola-late-commitment')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vérifier le tirage' })).toHaveAttribute('href', '/impact-challenge/tombola/preuve/d1');
    expect(screen.getByText('Pourquoi ?')).toBeInTheDocument();

    expect(await screen.findByTestId('tombola-my-count')).toHaveTextContent('12 tickets');
    expect(screen.getByTestId('tombola-my-ranges')).toHaveTextContent('n° 1–5, 8–14');
    expect(screen.getByTestId('tombola-my-chance')).toHaveTextContent('Vos chances au 1er lot : 1,84 %');
  });

  it('says plainly when the commitment came after the tickets closed', async () => {
    api.impactTombola.mockResolvedValue(tombola(draw({ committedBeforeTicketsClosed: false })));
    renderPage(<ImpactTombola />);
    expect(await screen.findByTestId('tombola-late-commitment')).toHaveTextContent(/fixée après la clôture des votes payants/);
  });
});

describe('the live draw', () => {
  it('reveals a new winner once, with the drawing effect, and keeps placeholders for the rest', async () => {
    // First poll: nothing revealed. Then the same winner on every poll, in an answer that changes each
    // time (participants), so the page really re-reads it instead of keeping the cached object.
    let n = 0;
    api.impactTombola.mockImplementation(async () => {
      n++;
      return tombola(n === 1 ? done(0, []) : { ...done(1, [W1]), participants: 300 + n });
    });
    renderPage(<ImpactTombola />);

    expect(await screen.findAllByText('À venir')).toHaveLength(3);
    expect(await screen.findByTestId('tombola-drawing-1', {}, { timeout: 2000 })).toHaveTextContent('Tirage en cours…');
    const winner = await screen.findByTestId('tombola-winner-1', {}, { timeout: 2000 });
    expect(winner).toHaveTextContent('n° 427');
    expect(winner).toHaveTextContent('Awa N.');
    expect(screen.getByTestId('tombola-upcoming-2')).toHaveTextContent('À venir');
    expect(screen.getByTestId('tombola-upcoming-3')).toHaveTextContent('À venir');
    expect(screen.getByTestId('tombola-status')).toHaveTextContent('Tirage en cours : 1 lot sur 3 dévoilé.');

    // More polls with the same winner: the drawing effect (shown 300 ms here) must not come back.
    // Sampled every 40 ms until three more polls have answered.
    const calls = api.impactTombola.mock.calls.length;
    let replays = 0;
    while (api.impactTombola.mock.calls.length < calls + 3) {
      if (screen.queryByTestId('tombola-drawing-1')) replays++;
      await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    }
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(replays).toBe(0);
    expect(screen.queryByTestId('tombola-drawing-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('tombola-winner-1')).toHaveTextContent('n° 427');
  });

  it('winners already revealed at the first load are shown without the effect', async () => {
    api.impactTombola.mockResolvedValue(tombola(done(2, [W1, W2])));
    renderPage(<ImpactTombola />);
    expect(await screen.findByTestId('tombola-winner-2')).toHaveTextContent('Paul K.');
    expect(screen.queryByTestId('tombola-drawing-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tombola-drawing-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('tombola-upcoming-3')).toBeInTheDocument();
  });

  it('a prize nobody could get: « Lot non attribué »; my win: « Gagné ! »', async () => {
    api.impactTombola.mockResolvedValue(tombola(done(3, [W1, W2, W3_NONE])));
    api.impactMyTombola.mockResolvedValue(ok({
      editionId: 'ed1', tickets: 12, ranges: [{ from: 1, to: 12 }], sharePct: 1.84, totalTickets: 1240, drawn: true,
      wins: [{ prizeLabel: 'Un ordinateur', ticketNumber: 12, status: 'PENDING' }],
    }));
    renderPage(<ImpactTombola />);
    expect(await screen.findByTestId('tombola-winner-3')).toHaveTextContent('Lot non attribué');
    expect(screen.getByTestId('tombola-status')).toHaveTextContent(/Tirage effectué le/);
    expect(await screen.findByText('Gagné ! Un ordinateur avec le ticket n° 12.')).toBeInTheDocument();
    expect(screen.getByTestId('tombola-my-chance')).toHaveTextContent('Vos chances au 1er lot étaient de 1,84 %');
  });

  it('the history of past draws', async () => {
    api.impactTombola.mockResolvedValue(ok(null));
    api.impactTombolaHistory.mockResolvedValue(ok([{
      drawId: 'd0', editionId: 'ed0', editionName: 'SBC Impact Challenge 2026', drawnAt: '2026-06-30T19:00:00Z', totalTickets: 800, participants: 200,
      winners: [
        { order: 1, prize: 'Prix en espèces', category: 'cash', ticketNumber: 77, displayName: 'Marie N.', status: 'DELIVERED' },
        { order: 2, prize: 'Un ordinateur', category: 'ordinateur', ticketNumber: null, displayName: null, status: 'NOT_AWARDED' },
      ],
    }]));
    renderPage(<ImpactTombola />);
    expect(await screen.findByText('La tombola n’a pas encore commencé')).toBeInTheDocument();
    const past = await screen.findByTestId('tombola-history-draw');
    expect(past).toHaveTextContent('SBC Impact Challenge 2026');
    expect(past).toHaveTextContent('30 juin');
    const rows = within(past).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Prix en espèces');
    expect(rows[0]).toHaveTextContent('Ticket n° 77 · Marie N.');
    expect(rows[0]).toHaveTextContent('Remis');
    expect(rows[1]).toHaveTextContent('Lot non attribué');
  });
});

describe('the draw’s proof', () => {
  const SEED = '9f'.repeat(32);
  const SEGMENTS = [
    { from: 1, to: 5, weight: 10000, holderHash: 'aa'.repeat(32) },
    { from: 6, to: 6, weight: 5000, holderHash: 'bb'.repeat(32) },
  ];
  const canonical = SEGMENTS.map((g) => `${g.from}-${g.to}:${g.weight}:${g.holderHash}`).join('\n');
  const proof = (over: Record<string, unknown> = {}) => ok({
    drawId: 'd1', status: 'DONE', seedCommitment: sha(SEED), seed: SEED, committedAt: iso(-86_400_000), committedBeforeTicketsClosed: true,
    drawnAt: iso(-60_000), weightScale: 10000, method: 'Pour chaque lot k dans l’ordre : …', segmentsHash: sha(canonical),
    segmentsFormat: 'une ligne par tranche', segments: SEGMENTS, exclusions: [{ order: 1, holderHashes: [] }, { order: 2, holderHashes: ['aa'.repeat(32)] }],
    prizes: PRIZES.slice(0, 2),
    winners: [
      { order: 1, prizeLabel: 'Prix en espèces', ticketNumber: 3, holderHash: 'aa'.repeat(32), attempts: 1 },
      { order: 2, prizeLabel: 'Un ordinateur', ticketNumber: 6, holderHash: 'bb'.repeat(32), attempts: 1 },
    ],
    ...over,
  });
  const render = () => renderPage(
    <Routes><Route path="/impact-challenge/tombola/preuve/:drawId" element={<ImpactTombolaProof />} /></Routes>,
    '/impact-challenge/tombola/preuve/d1',
  );

  it('recomputes sha256(seed) and the tickets’ hash in the browser: ✓', async () => {
    api.impactTombolaProof.mockResolvedValue(proof());
    render();
    expect(await screen.findByTestId('proof-seed')).toHaveTextContent(SEED);
    expect(screen.getByTestId('proof-commitment')).toHaveTextContent(sha(SEED));
    expect(await screen.findByText('sha256(graine) = empreinte ✓')).toBeInTheDocument();
    expect(await screen.findByText('sha256(tickets) = empreinte des tickets ✓')).toBeInTheDocument();
    expect(api.impactTombolaProof).toHaveBeenCalledWith('d1');
    expect(screen.getByText('Voir les 2 tranches de tickets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Télécharger la preuve (JSON)' })).toBeInTheDocument();
    expect(screen.getByText(/Pour chaque lot k/)).toBeInTheDocument();
  });

  it('a seed that does not match its commitment: ✗', async () => {
    api.impactTombolaProof.mockResolvedValue(proof({ seedCommitment: sha('autre graine') }));
    render();
    expect(await screen.findByText(/sha256\(graine\) ≠ empreinte ✗/)).toBeInTheDocument();
  });

  it('before the draw: only the commitment', async () => {
    api.impactTombolaProof.mockResolvedValue(ok({ drawId: 'd1', status: 'COMMITTED', seedCommitment: sha(SEED), committedAt: iso(-60_000), committedBeforeTicketsClosed: true }));
    render();
    expect(await screen.findByText(/Le tirage n’a pas encore eu lieu/)).toBeInTheDocument();
    expect(screen.queryByTestId('proof-seed')).not.toBeInTheDocument();
  });
});
