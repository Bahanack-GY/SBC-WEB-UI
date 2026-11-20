import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
  requestAuthenticatorSetup: vi.fn(),
  startAuthenticatorSetup: vi.fn(),
  confirmAuthenticatorSetup: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import AuthenticatorSetupSheet from './AuthenticatorSetupSheet';

beforeEach(() => vi.clearAllMocks());

const BACKUP = Array.from({ length: 10 }, (_, i) => `AAAA-BBBB-CC${String(i).padStart(2, '2')}`);

describe('Configurer l’application d’authentification', () => {
  it('password → e-mailed code → QR + key → first code → 10 backup codes, then done', async () => {
    api.requestAuthenticatorSetup.mockResolvedValue(ok({ sentTo: 'ow***@gmail.com' }));
    api.startAuthenticatorSetup.mockResolvedValueOnce(fail(400, 'Code invalide ou expiré. Utilisez le dernier code reçu.'))
      .mockResolvedValueOnce(ok({ qrDataUrl: 'data:image/png;base64,AAA', secret: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', otpauthUrl: 'otpauth://totp/SBC:x?secret=ABCD&issuer=SBC' }));
    api.confirmAuthenticatorSetup.mockResolvedValue(ok({ backupCodes: BACKUP, enrolledAt: '2026-11-20T10:00:00.000Z' }));
    const onDone = vi.fn();
    renderPage(<AuthenticatorSetupSheet open onClose={() => undefined} onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('mot de passe');
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(api.requestAuthenticatorSetup).toHaveBeenCalledWith('Secret123!');
    expect(await screen.findByText('ow***@gmail.com')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Code reçu'), 'ZZZZZZ');
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code invalide');
    await userEvent.clear(screen.getByLabelText('Code reçu'));
    await userEvent.type(screen.getByLabelText('Code reçu'), 'AB3CD4');
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(api.startAuthenticatorSetup).toHaveBeenLastCalledWith('AB3CD4');

    expect(await screen.findByAltText(/Code QR/)).toHaveAttribute('src', 'data:image/png;base64,AAA');
    expect(screen.getByText('ABCD EFGH IJKL MNOP QRST UVWX YZ23 4567')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Code affiché par l’application'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Activer' }));
    expect(api.confirmAuthenticatorSetup).toHaveBeenCalledWith('123456');

    expect(await screen.findByText('L’application d’authentification est activée.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    const finish = screen.getByRole('button', { name: 'Terminer' });
    expect(finish).toBeDisabled();
    await userEvent.click(screen.getByLabelText('J’ai noté mes codes de secours.'));
    await userEvent.click(finish);
    expect(onDone).toHaveBeenCalled();
  });
});
