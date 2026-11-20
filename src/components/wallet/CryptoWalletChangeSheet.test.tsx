import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
  getAuthenticatorStatus: vi.fn(),
  changeCryptoWallet: vi.fn(),
  updateCryptoWallet: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import CryptoWalletChangeSheet from './CryptoWalletChangeSheet';
import { normalizeCryptoAddress } from '../../utils/cryptoWallet';

beforeEach(() => vi.clearAllMocks());

const OLD = '0x52908400098527886E0F7030069857D2E4169EE7';
const NEW = '0x8617E340B3D01FA5F11F306F4090FD50E238070D';
const TRX = 'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8';
const enabled = ok({ enabled: true, enrolledAt: '2026-11-20T10:00:00.000Z', backupCodesRemaining: 10, lockedUntil: null });

const open = (props: Partial<Parameters<typeof CryptoWalletChangeSheet>[0]> = {}) => {
  const onDone = vi.fn();
  renderPage(<CryptoWalletChangeSheet open onClose={() => undefined} onDone={onDone} {...props} />);
  return onDone;
};

describe('Changer de portefeuille crypto', () => {
  it('needs the password and the authenticator code; replacing a wallet shows the 48 h block', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(enabled);
    api.changeCryptoWallet.mockResolvedValue(ok({ cryptoWalletAddress: NEW, cryptoWalletCurrency: 'USDTBSC', withdrawalsLockedUntil: '2026-11-22T05:00:00.000Z' }));
    const onDone = open({ currentAddress: OLD, currentCurrency: 'USDTBSC' });

    expect(await screen.findByText(/bloqués pendant 48 h/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Changer de portefeuille/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Cryptomonnaie')).toHaveValue('USDTBSC');

    await userEvent.type(screen.getByLabelText('Adresse du portefeuille'), ` ${NEW} `);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('mot de passe de votre compte');
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.type(screen.getByLabelText('Code de l’application d’authentification'), '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(api.changeCryptoWallet).toHaveBeenCalledWith('USDTBSC', NEW, 'Secret123!', '654321');
    expect(await screen.findByText(/Les retraits sont bloqués jusqu’au/)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith({ cryptoWalletAddress: NEW, cryptoWalletCurrency: 'USDTBSC', lockedUntil: '2026-11-22T05:00:00.000Z' });
    expect(api.updateCryptoWallet).not.toHaveBeenCalled();
  });

  it('refuses an address of another network before calling the server', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(enabled);
    open();
    await userEvent.selectOptions(await screen.findByLabelText('Cryptomonnaie'), 'USDTBSC');
    await userEvent.type(screen.getByLabelText('Adresse du portefeuille'), TRX);
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.type(screen.getByLabelText('Code de l’application d’authentification'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('n’est pas une adresse USDT (BSC-BEP20) valide');
    expect(api.changeCryptoWallet).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal and clears the code', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(enabled);
    api.changeCryptoWallet.mockResolvedValue(fail(429, 'Trop de codes incorrects : réessayez après 21:15.'));
    open();
    await userEvent.selectOptions(await screen.findByLabelText('Cryptomonnaie'), 'TRX');
    await userEvent.type(screen.getByLabelText('Adresse du portefeuille'), TRX);
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.type(screen.getByLabelText('Code de l’application d’authentification'), '111111');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de codes incorrects');
    expect(screen.getByLabelText('Code de l’application d’authentification')).toHaveValue('');
  });

  it('without an authenticator app, asks to set it up first', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(ok({ enabled: false, enrolledAt: null, backupCodesRemaining: 0, lockedUntil: null }));
    open({ currentAddress: OLD, currentCurrency: 'USDTBSC' });
    expect(await screen.findByText(/configurez d’abord l’application d’authentification/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Adresse du portefeuille')).not.toBeInTheDocument();
  });

  it('address formats', () => {
    expect(normalizeCryptoAddress(` ${NEW} `, 'USDTBSC')).toBe(NEW);
    expect(normalizeCryptoAddress(TRX, 'USDTBSC')).toBeNull();
    expect(normalizeCryptoAddress('bc1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ', 'BTC')).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
  });
});
