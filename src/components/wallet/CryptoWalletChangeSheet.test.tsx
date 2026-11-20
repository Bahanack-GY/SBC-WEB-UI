import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
  requestCryptoWalletChange: vi.fn(),
  confirmCryptoWalletChange: vi.fn(),
  updateCryptoWallet: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import CryptoWalletChangeSheet from './CryptoWalletChangeSheet';
import { normalizeCryptoAddress } from '../../utils/cryptoWallet';

beforeEach(() => vi.clearAllMocks());

const OLD = '0x52908400098527886E0F7030069857D2E4169EE7';
const NEW = '0x8617E340B3D01FA5F11F306F4090FD50E238070D';
const TRX = 'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8';

const open = (props: Partial<Parameters<typeof CryptoWalletChangeSheet>[0]> = {}) => {
  const onDone = vi.fn();
  renderPage(<CryptoWalletChangeSheet open onClose={() => undefined} onDone={onDone} {...props} />);
  return onDone;
};

describe('Changer de portefeuille crypto', () => {
  it('needs the password, then the emailed code; replacing a wallet shows the 48 h block', async () => {
    api.requestCryptoWalletChange.mockResolvedValue(ok({ sentTo: 'o•••@gmail.com' }));
    api.confirmCryptoWalletChange.mockResolvedValue(ok({ cryptoWalletAddress: NEW, cryptoWalletCurrency: 'USDTBSC', withdrawalsLockedUntil: '2026-11-22T05:00:00.000Z' }));
    const onDone = open({ currentAddress: OLD, currentCurrency: 'USDTBSC' });

    expect(screen.getByRole('heading', { name: /Changer de portefeuille/ })).toBeInTheDocument();
    expect(screen.getByText(/bloqués pendant 48 h/)).toBeInTheDocument();
    expect(screen.getByLabelText('Cryptomonnaie')).toHaveValue('USDTBSC');

    await userEvent.type(screen.getByLabelText('Adresse du portefeuille'), ` ${NEW} `);
    await userEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    expect(await screen.findByText(/mot de passe de votre compte/)).toBeInTheDocument();
    expect(api.requestCryptoWalletChange).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    expect(api.requestCryptoWalletChange).toHaveBeenCalledWith('USDTBSC', NEW, 'Secret123!');
    expect(await screen.findByText('o•••@gmail.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Renvoyer le code/ }));
    expect(api.requestCryptoWalletChange).toHaveBeenLastCalledWith('USDTBSC', NEW, undefined);

    await userEvent.type(screen.getByLabelText('Code reçu par e-mail'), 'AB3CD4');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(api.confirmCryptoWalletChange).toHaveBeenCalledWith('USDTBSC', NEW, 'AB3CD4');
    expect(await screen.findByText(/Les retraits sont bloqués jusqu’au/)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith({ cryptoWalletAddress: NEW, cryptoWalletCurrency: 'USDTBSC', lockedUntil: '2026-11-22T05:00:00.000Z' });
    expect(api.updateCryptoWallet).not.toHaveBeenCalled();
  });

  it('refuses an address of another network before sending any code', async () => {
    open();
    expect(screen.getByRole('heading', { name: /Ajouter un portefeuille/ })).toBeInTheDocument();
    expect(screen.queryByText(/bloqués pendant 48 h/)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Cryptomonnaie'), 'USDTBSC');
    await userEvent.type(screen.getByLabelText('Adresse du portefeuille'), TRX);
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('n’est pas une adresse USDT (BSC-BEP20) valide');
    expect(api.requestCryptoWalletChange).not.toHaveBeenCalled();
  });

  it('a first wallet: no block; the server’s refusal is shown', async () => {
    api.requestCryptoWalletChange.mockResolvedValue(ok({ sentTo: 'o•••@gmail.com' }));
    api.confirmCryptoWalletChange.mockResolvedValueOnce(fail(400, 'Code invalide ou expiré. Utilisez le dernier code reçu par e-mail.'))
      .mockResolvedValueOnce(ok({ cryptoWalletAddress: TRX, cryptoWalletCurrency: 'TRX', withdrawalsLockedUntil: null }));
    const onDone = open();
    await userEvent.selectOptions(screen.getByLabelText('Cryptomonnaie'), 'TRX');
    await userEvent.type(screen.getByLabelText('Adresse du portefeuille'), TRX);
    await userEvent.type(screen.getByLabelText('Mot de passe du compte'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    await userEvent.type(await screen.findByLabelText('Code reçu par e-mail'), 'ZZZZZZ');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code invalide ou expiré');

    await userEvent.clear(screen.getByLabelText('Code reçu par e-mail'));
    await userEvent.type(screen.getByLabelText('Code reçu par e-mail'), 'AB3CD4');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByText(/portefeuille crypto est enregistré/)).toBeInTheDocument();
    expect(screen.queryByText(/bloqués jusqu’au/)).not.toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ lockedUntil: null }));
  });
});

describe('crypto address formats (mirror of the server)', () => {
  it('accepts each network’s own format only', () => {
    expect(normalizeCryptoAddress(NEW, 'BNBBSC')).toBe(NEW);
    expect(normalizeCryptoAddress(NEW, 'TRX')).toBeNull();
    expect(normalizeCryptoAddress(TRX, 'TRX')).toBe(TRX);
    expect(normalizeCryptoAddress('BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ', 'BTC')).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
    expect(normalizeCryptoAddress('T0RabPrwbZy45sbavfcjinPJC18kjpRTv8', 'TRX')).toBeNull();
  });
});
