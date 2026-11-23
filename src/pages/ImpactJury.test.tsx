import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  impactJuryMe: vi.fn(),
  impactJuryScore: vi.fn(),
  generateThumbnailUrl: vi.fn(),
  generateSettingsFileUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
// The setup sheet is the app's own (tested elsewhere): only its opening matters here.
vi.mock('../components/security/AuthenticatorSetupSheet', () => ({ default: () => null }));

import ImpactJury from './ImpactJury';

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const finalist = (id: string, name: string, rank: number, myScore: unknown = null) => ({
  _id: id, rank,
  profile: { name, photoFileId: `p/${id}.jpg`, city: 'Douala', country: 'Cameroun', activity: 'Entrepreneur', projectName: `Projet ${name}`, projectDescription: 'Description.' },
  project: null, video: null, myScore,
});

const jury = (over: Record<string, unknown> = {}) => ({
  edition: { _id: 'ed1', name: 'SBC Impact Challenge 2027', status: 'FINAL', stage: 'LIVE' },
  canScore: true, lockedAt: null, codeWindowOpen: false,
  criteria: [{ key: 'impact', label: 'Impact', max: 10 }, { key: 'innovation', label: 'Innovation', max: 5 }],
  maxTotal: 15,
  onStageCandidateId: 'f2',
  finalists: [finalist('f1', 'Awa Ndiaye', 1), finalist('f2', 'Paul Kamga', 2)],
  ...over,
});

const saved = (scores: Record<string, number>, edits = 0) => ok({
  candidateId: 'f2', scores, total: Object.values(scores).reduce((a, b) => a + b, 0), comment: null, updatedAt: iso(0), edits,
});

const refusal = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  ({ ...fail(status, message), body: { success: false, message, code, ...(details ? { details } : {}) } });

beforeEach(() => {
  vi.clearAllMocks();
  api.impactJuryMe.mockResolvedValue(ok([jury()]));
  api.generateThumbnailUrl.mockImplementation((id: string) => `https://sbc.example/${id}`);
  api.generateSettingsFileUrl.mockImplementation((id: string) => `https://media.example/${id}`);
});

const paulForm = async () => screen.findByRole('form', { name: 'Noter Paul Kamga' });

describe('the jury space', () => {
  it('nobody’s juror: says so', async () => {
    api.impactJuryMe.mockResolvedValue(ok([]));
    renderPage(<ImpactJury />);
    expect(await screen.findByText('Vous ne faites partie d’aucun jury')).toBeInTheDocument();
  });

  it('the finalist on stage comes first; the total follows the marks', async () => {
    renderPage(<ImpactJury />);
    const panels = await screen.findAllByRole('region');
    expect(panels[0]).toHaveAccessibleName('Paul Kamga');
    expect(within(panels[0]).getByText('En scène')).toBeInTheDocument();
    const form = await paulForm();
    await userEvent.click(within(form).getByRole('button', { name: 'Impact : un demi-point de plus' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Impact : un demi-point de plus' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Innovation : un demi-point de plus' }));
    expect(within(form).getByTestId('total-f2')).toHaveTextContent('1,5 / 15');
  });

  it('asks the authenticator code when the server wants it, then sends the marks again with it', async () => {
    api.impactJuryScore
      .mockResolvedValueOnce(refusal(403, 'AUTH_CODE_REQUIRED', 'Confirmez avec le code de votre application d’authentification.'))
      .mockResolvedValueOnce(refusal(400, 'AUTH_CODE_INVALID', 'Code incorrect.'))
      .mockResolvedValueOnce(saved({ impact: 1, innovation: 0 }));
    renderPage(<ImpactJury />);
    const form = await paulForm();
    await userEvent.click(within(form).getByRole('button', { name: 'Impact : un demi-point de plus' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Impact : un demi-point de plus' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));

    const sheet = await screen.findByRole('dialog', { name: 'Confirmez avec votre code' });
    const field = within(sheet).getByLabelText('Code de l’application d’authentification');
    expect(field).toHaveAttribute('data-openreplay-hidden');
    await userEvent.type(field, '111111');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Valider et enregistrer' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Code incorrect.');

    await userEvent.type(within(sheet).getByLabelText('Code de l’application d’authentification'), '123456');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Valider et enregistrer' }));

    await waitFor(() => expect(api.impactJuryScore).toHaveBeenCalledTimes(3));
    expect(api.impactJuryScore.mock.calls[0]).toEqual(['ed1', 'f2', { scores: { impact: 1, innovation: 0 } }]);
    expect(api.impactJuryScore.mock.calls[2]).toEqual(['ed1', 'f2', { scores: { impact: 1, innovation: 0 }, authCode: '123456' }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByTestId('edits-f2')).toHaveTextContent('enregistrée le');
  });

  it('no authenticator app: says to set it up', async () => {
    api.impactJuryScore.mockResolvedValue(refusal(403, 'AUTHENTICATOR_REQUIRED', 'Pour noter, configurez d’abord l’application d’authentification.'));
    renderPage(<ImpactJury />);
    const form = await paulForm();
    await userEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));
    const sheet = await screen.findByRole('dialog', { name: 'Application d’authentification' });
    expect(within(sheet).getByText(/Pour noter les finalistes, configurez d’abord l’application d’authentification/)).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Configurer maintenant' })).toBeInTheDocument();
  });

  it('INVALID_SCORE: the message under the criterion', async () => {
    api.impactJuryMe.mockResolvedValue(ok([jury({ codeWindowOpen: true })]));
    api.impactJuryScore.mockResolvedValue(refusal(400, 'INVALID_SCORE', '« Innovation » : une note entre 0 et 5 (par demi-point).', { field: 'scores.innovation' }));
    renderPage(<ImpactJury />);
    const form = await paulForm();
    await userEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));
    expect(await within(form).findByText('« Innovation » : une note entre 0 et 5 (par demi-point).')).toBeInTheDocument();
    expect(within(form).getByLabelText('Innovation')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locked: the marks read-only, with the number of edits and why', async () => {
    api.impactJuryMe.mockResolvedValue(ok([jury({
      canScore: false, lockedAt: iso(-60_000),
      finalists: [
        finalist('f1', 'Awa Ndiaye', 1, { scores: { impact: 8, innovation: 4.5 }, total: 12.5, comment: 'Très clair.', updatedAt: iso(-120_000), edits: 2 }),
        finalist('f2', 'Paul Kamga', 2),
      ],
    })]));
    renderPage(<ImpactJury />);
    expect(await screen.findByTestId('jury-read-only')).toHaveTextContent(/Les notes sont verrouillées depuis le/);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    const marks = screen.getByTestId('marks-f1');
    expect(marks).toHaveTextContent('Impact8 / 10');
    expect(marks).toHaveTextContent('Innovation4,5 / 5');
    expect(marks).toHaveTextContent('Total12,5 / 15');
    expect(screen.getByTestId('edits-f1')).toHaveTextContent('Modifié 2 fois');
    expect(screen.getByText('Vous n’avez pas noté ce finaliste.')).toBeInTheDocument();
  });
});
