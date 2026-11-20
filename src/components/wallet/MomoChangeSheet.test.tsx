import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ok, fail, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
  getAuthenticatorStatus: vi.fn(),
  changeMomo: vi.fn(),
  updateMomoDetails: vi.fn(),
  requestAuthenticatorSetup: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import MomoChangeSheet from './MomoChangeSheet';

beforeEach(() => vi.clearAllMocks());

const enabled = ok({ enabled: true, enrolledAt: '2026-11-20T10:00:00.000Z', backupCodesRemaining: 10, lockedUntil: null });
const open = (props: Partial<Parameters<typeof MomoChangeSheet>[0]> = {}) => {
  const onDone = vi.fn();
  renderPage(<MomoChangeSheet open onClose={() => undefined} onDone={onDone} countryCode="CM" {...props} />);
  return onDone;
};

describe('Changer de numéro Mobile Money', () => {
  it('needs the password and the authenticator code; replacing a number shows the 48 h block', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(enabled);
    api.changeMomo.mockResolvedValue(ok({ momoNumber: '237699998877', momoOperator: 'ORANGE_CMR', withdrawalsLockedUntil: '2026-11-21T22:00:00.000Z' }));
    const onDone = open({ currentNumber: '237677001122', currentOperator: 'MTN_MOMO_CMR' });

    expect(await screen.findByText(/bloqués pendant 48 h/)).toBeInTheDocument();
    expect(screen.queryByText(/par e-mail/i)).not.toBeInTheDocument();
    const number = screen.getByLabelText('Numéro Mobile Money');
    expect(number).toHaveValue('677001122');
    await userEvent.clear(number);
    await userEvent.type(number, '699998877');
    await userEvent.selectOptions(screen.getByLabelText('Opérateur'), 'ORANGE_CMR');
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');

    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('code à 6 chiffres');
    expect(api.changeMomo).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Code de l’application d’authentification'), '12a3456');
    expect(screen.getByLabelText('Code de l’application d’authentification')).toHaveValue('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(api.changeMomo).toHaveBeenCalledWith('237699998877', 'ORANGE_CMR', 'Secret123!', '123456');
    expect(await screen.findByText(/Les retraits sont bloqués jusqu’au/)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith({ momoNumber: '237699998877', momoOperator: 'ORANGE_CMR', lockedUntil: '2026-11-21T22:00:00.000Z' });
    expect(api.updateMomoDetails).not.toHaveBeenCalled();
  });

  it('a wrong code shows the server’s refusal; a backup code can be used instead', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(enabled);
    api.changeMomo.mockResolvedValueOnce(fail(400, 'Code incorrect. Tapez le code à 6 chiffres affiché par l’application, ou un code de secours.'))
      .mockResolvedValueOnce(ok({ momoNumber: '237699990000', momoOperator: 'ORANGE_CMR', withdrawalsLockedUntil: null }));
    const onDone = open();
    expect(await screen.findByRole('heading', { name: /Ajouter un numéro/ })).toBeInTheDocument();
    expect(screen.queryByText(/bloqués pendant 48 h/)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Numéro Mobile Money'), '699990000');
    await userEvent.selectOptions(screen.getByLabelText('Opérateur'), 'ORANGE_CMR');
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.type(screen.getByLabelText('Code de l’application d’authentification'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code incorrect');

    await userEvent.click(screen.getByRole('button', { name: 'Code de secours' }));
    await userEvent.type(screen.getByLabelText('Code de secours'), 'abcd-efgh-jkmn');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(api.changeMomo).toHaveBeenLastCalledWith('237699990000', 'ORANGE_CMR', 'Secret123!', 'ABCD-EFGH-JKMN');
    expect(await screen.findByText(/numéro Mobile Money est enregistré/)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ lockedUntil: null }));
  });

  it('without an authenticator app, asks to set it up instead of showing the form', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(ok({ enabled: false, enrolledAt: null, backupCodesRemaining: 0, lockedUntil: null }));
    open({ currentNumber: '237677001122', currentOperator: 'MTN_MOMO_CMR' });
    expect(await screen.findByText(/configurez d’abord l’application d’authentification/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Numéro Mobile Money')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Configurer maintenant' }));
    expect(await screen.findByLabelText('Mot de passe du compte')).toBeInTheDocument();
    expect(screen.getByText(/Google Authenticator/, { selector: 'strong' })).toBeInTheDocument();
  });

  it('keeps the success screen when the parent reloads the member after the save', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(enabled);
    api.changeMomo.mockResolvedValue(ok({ momoNumber: '237699998877', momoOperator: 'ORANGE_CMR', withdrawalsLockedUntil: '2026-11-21T22:00:00.000Z' }));
    function Profile() {
      const [current, setCurrent] = useState({ n: '237677001122', o: 'MTN_MOMO_CMR' });
      return <MomoChangeSheet open onClose={() => undefined} countryCode="CM" currentNumber={current.n} currentOperator={current.o}
        onDone={r => setCurrent({ n: r.momoNumber, o: r.momoOperator })} />;
    }
    renderPage(<Profile />);
    const number = await screen.findByLabelText('Numéro Mobile Money');
    await userEvent.clear(number);
    await userEvent.type(number, '699998877');
    await userEvent.selectOptions(screen.getByLabelText('Opérateur'), 'ORANGE_CMR');
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.type(screen.getByLabelText('Code de l’application d’authentification'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByText(/numéro Mobile Money est enregistré/)).toBeInTheDocument();
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByText(/Les retraits sont bloqués jusqu’au/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Numéro Mobile Money')).not.toBeInTheDocument();
  });

  it('only offers the operators of the account’s country', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(enabled);
    open();
    const select = await screen.findByLabelText('Opérateur');
    const options = Array.from((select as HTMLSelectElement).options).map(o => o.value).filter(Boolean);
    expect(options).toEqual(['MTN_MOMO_CMR', 'ORANGE_CMR']);
  });
});
