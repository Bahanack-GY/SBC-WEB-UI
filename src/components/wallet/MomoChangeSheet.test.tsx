import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
  requestMomoChange: vi.fn(),
  confirmMomoChange: vi.fn(),
  updateMomoDetails: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import MomoChangeSheet from './MomoChangeSheet';

beforeEach(() => vi.clearAllMocks());

const open = (props: Partial<Parameters<typeof MomoChangeSheet>[0]> = {}) => {
  const onDone = vi.fn();
  renderPage(<MomoChangeSheet open onClose={() => undefined} onDone={onDone} countryCode="CM" {...props} />);
  return onDone;
};

describe('Changer de numéro Mobile Money', () => {
  it('needs the password, then the emailed code; replacing a number shows the 48 h block', async () => {
    api.requestMomoChange.mockResolvedValue(ok({ sentTo: 'o•••@gmail.com' }));
    api.confirmMomoChange.mockResolvedValue(ok({ momoNumber: '237699998877', momoOperator: 'ORANGE_CMR', withdrawalsLockedUntil: '2026-11-21T22:00:00.000Z' }));
    const onDone = open({ currentNumber: '237677001122', currentOperator: 'MTN_MOMO_CMR' });

    expect(screen.getByText(/bloqués pendant 48 h/)).toBeInTheDocument();
    const number = screen.getByLabelText('Numéro Mobile Money');
    expect(number).toHaveValue('677001122');
    await userEvent.clear(number);
    await userEvent.type(number, '699998877');
    await userEvent.selectOptions(screen.getByLabelText('Opérateur'), 'ORANGE_CMR');

    await userEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    expect(await screen.findByText(/mot de passe de votre compte/)).toBeInTheDocument();
    expect(api.requestMomoChange).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    expect(api.requestMomoChange).toHaveBeenCalledWith('237699998877', 'ORANGE_CMR', 'Secret123!');
    expect(await screen.findByText('o•••@gmail.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Renvoyer le code/ }));
    expect(api.requestMomoChange).toHaveBeenLastCalledWith('237699998877', 'ORANGE_CMR', undefined);

    await userEvent.type(screen.getByLabelText('Code de confirmation'), 'AB3CD4');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(api.confirmMomoChange).toHaveBeenCalledWith('237699998877', 'ORANGE_CMR', 'AB3CD4');
    expect(await screen.findByText(/Les retraits sont bloqués jusqu’au/)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith({ momoNumber: '237699998877', momoOperator: 'ORANGE_CMR', lockedUntil: '2026-11-21T22:00:00.000Z' });
    expect(api.updateMomoDetails).not.toHaveBeenCalled();
  });

  it('a first number: no block announced; the server’s refusal is shown', async () => {
    api.requestMomoChange.mockResolvedValue(ok({ sentTo: 'o•••@gmail.com' }));
    api.confirmMomoChange.mockResolvedValueOnce(fail(400, 'Code invalide ou expiré. Utilisez le dernier code reçu par e-mail.'))
      .mockResolvedValueOnce(ok({ momoNumber: '237699990000', momoOperator: 'ORANGE_CMR', withdrawalsLockedUntil: null }));
    const onDone = open();
    expect(screen.getByRole('heading', { name: /Ajouter un numéro/ })).toBeInTheDocument();
    expect(screen.queryByText(/bloqués pendant 48 h/)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Numéro Mobile Money'), '699990000');
    await userEvent.selectOptions(screen.getByLabelText('Opérateur'), 'ORANGE_CMR');
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    await userEvent.type(await screen.findByLabelText('Code de confirmation'), 'ZZZZZZ');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code invalide ou expiré');

    await userEvent.clear(screen.getByLabelText('Code de confirmation'));
    await userEvent.type(screen.getByLabelText('Code de confirmation'), 'AB3CD4');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByText(/numéro Mobile Money est enregistré/)).toBeInTheDocument();
    expect(screen.queryByText(/bloqués jusqu’au/)).not.toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ lockedUntil: null }));
  });

  it('the code may come by WhatsApp: the sheet never says e-mail, it says where the code went', async () => {
    api.requestMomoChange.mockResolvedValue(ok({ sentTo: 'WhatsApp +237 •••• 122 et o***@gmail.com' }));
    open();
    expect(screen.queryByText(/e-mail/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Numéro Mobile Money'), '699990000');
    await userEvent.selectOptions(screen.getByLabelText('Opérateur'), 'ORANGE_CMR');
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(await screen.findByText('WhatsApp +237 •••• 122 et o***@gmail.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Code de confirmation')).toBeInTheDocument();
  });

  it('only offers the operators of the account’s country', async () => {
    open();
    const options = Array.from((screen.getByLabelText('Opérateur') as HTMLSelectElement).options).map(o => o.value).filter(Boolean);
    expect(options).toEqual(['MTN_MOMO_CMR', 'ORANGE_CMR']);
  });
});
