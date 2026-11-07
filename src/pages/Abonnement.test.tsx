import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';
import type { AddonOffer, PackOffer, SubscriptionOffers } from '../types/api';

const api = vi.hoisted(() => ({
  getSubscriptionOffers: vi.fn(),
  purchaseSubscription: vi.fn(),
  generatePaymentUrl: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

const auth = vi.hoisted(() => ({
  user: { country: 'CM', balance: 0, referralCode: 'AWA237' } as Record<string, unknown>,
  isAuthenticated: true,
  loading: false,
  refreshUser: vi.fn(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

const nav = vi.hoisted(() => ({ redirectTo: vi.fn() }));
vi.mock('../utils/redirect', () => nav);
vi.mock('../components/common/TourButton', () => ({ default: () => null }));

import Abonnement from './Abonnement';

const pack = (over: Partial<PackOffer> & Pick<PackOffer, 'id' | 'name' | 'price'>): PackOffer => ({
  currency: 'XAF',
  state: 'available',
  payPrice: over.price,
  features: [`${over.name} : avantage 1`, `${over.name} : avantage 2`],
  ...over,
});

const addon = (over: Partial<AddonOffer> & Pick<AddonOffer, 'id' | 'type' | 'name' | 'price' | 'period'>): AddonOffer => ({
  listPrice: null,
  currency: 'XAF',
  activeUntil: null,
  canBuy: true,
  reason: null,
  features: ['Demandes de clients près de chez vous'],
  ...over,
});

/** A Classique member, in FCFA: Ciblé and Winner are upgrades. */
const classiqueMember = (): SubscriptionOffers => ({
  paymentMethod: 'traditional',
  currency: 'XAF',
  active: ['CLASSIQUE'],
  packs: [
    pack({ id: 'CLASSIQUE', name: 'Pack Classique', price: 2150, state: 'owned', payPrice: null }),
    pack({ id: 'CIBLE', name: 'Pack Ciblé', price: 5300, state: 'upgrade', payPrice: 3150 }),
    pack({ id: 'WINNER', name: 'Pack Winner', price: 15900, state: 'upgrade', payPrice: 13650 }),
  ],
  addons: [
    addon({ id: 'PRO', type: 'PRO', name: 'Espace Pro (mensuel)', price: 2000, period: 'monthly' }),
    addon({ id: 'PRO_YEARLY', type: 'PRO', name: 'Espace Pro (annuel)', price: 12000, listPrice: 24000, period: 'yearly' }),
    addon({ id: 'MISE_EN_AVANT', type: 'MISE_EN_AVANT', name: 'Mise en avant', price: 3000, period: 'monthly', features: ['Votre profil en tête'] }),
  ],
  winner: { owned: false, vipGroupLink: null, extraNumberSlots: 0 },
});

/** Not a member yet, paying in USD: everything available, options locked. */
const newcomerInUsd = (): SubscriptionOffers => ({
  paymentMethod: 'crypto',
  currency: 'USD',
  active: [],
  packs: [
    pack({ id: 'CLASSIQUE', name: 'Pack Classique', price: 4.8, currency: 'USD' }),
    pack({ id: 'CIBLE', name: 'Pack Ciblé', price: 11.6, currency: 'USD' }),
    pack({ id: 'WINNER', name: 'Pack Winner', price: 37.1, currency: 'USD' }),
  ],
  addons: [
    addon({ id: 'PRO', type: 'PRO', name: 'Espace Pro (mensuel)', price: 4.8, currency: 'USD', period: 'monthly', canBuy: false, reason: 'Choisissez d\'abord un pack.' }),
    addon({ id: 'PRO_YEARLY', type: 'PRO', name: 'Espace Pro (annuel)', price: 27.8, currency: 'USD', period: 'yearly', canBuy: false, reason: 'Choisissez d\'abord un pack.' }),
  ],
  winner: { owned: false, vipGroupLink: null, extraNumberSlots: 0 },
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { country: 'CM', balance: 0, referralCode: 'AWA237' };
  auth.refreshUser.mockResolvedValue(undefined);
  api.getSubscriptionOffers.mockImplementation(async (method: string) =>
    ok(method === 'crypto' ? newcomerInUsd() : classiqueMember()));
  api.generatePaymentUrl.mockImplementation((id: string) => `https://pay.example/payments/page/${id}`);
  api.purchaseSubscription.mockResolvedValue(ok({
    message: 'ok',
    planDetails: { id: 'CIBLE', name: 'Pack Ciblé', price: 3150, currency: 'XAF' },
    paymentDetails: { sessionId: 'sess_cible' },
  }));
});

describe('Abonnement', () => {
  it('shows the three packs in order, with the member’s pack and the upgrade prices', async () => {
    renderPage(<Abonnement />, '/abonnement');

    const classique = await screen.findByRole('article', { name: 'Pack Classique' });
    const cible = screen.getByRole('article', { name: 'Pack Ciblé' });
    const winner = screen.getByRole('article', { name: 'Pack Winner' });
    expect(api.getSubscriptionOffers).toHaveBeenCalledWith('traditional');

    // Order: Classique, Ciblé, Winner.
    const packs = screen.getAllByRole('article').slice(0, 3).map((a) => a.getAttribute('aria-labelledby'));
    expect(packs).toEqual(['pack-CLASSIQUE', 'pack-CIBLE', 'pack-WINNER']);

    expect(screen.getByText(/Vous payez une seule fois, il est à vie/)).toBeInTheDocument();
    expect(screen.getByText(/Votre pack actuel : Pack Classique/)).toBeInTheDocument();

    expect(within(classique).getByText('Votre pack actuel')).toBeInTheDocument();
    expect(within(classique).queryByRole('button')).not.toBeInTheDocument();
    expect(within(classique).getByRole('link', { name: /Commencer à gagner/ })).toHaveAttribute('href', '/ads-network');

    expect(within(cible).getByRole('button', { name: /^Passer au Pack Ciblé · 3\s150 FCFA$/ })).toBeEnabled();
    expect(within(cible).getByText(/Vous payez seulement/)).toHaveTextContent(/3\s150 FCFA/);
    expect(within(winner).getByRole('button', { name: /^Passer au Pack Winner · 13\s650 FCFA$/ })).toBeEnabled();
    expect(within(winner).getByText('Le plus complet')).toBeInTheDocument();

    // The old disabled teaser is gone.
    expect(screen.queryByText(/Bientôt|Disponible prochainement/)).not.toBeInTheDocument();
  });

  it('pays in the same tab: purchase, then the payment page replaces this one', async () => {
    const open = vi.spyOn(window, 'open');
    renderPage(<Abonnement />, '/abonnement');
    const cible = await screen.findByRole('article', { name: 'Pack Ciblé' });

    await userEvent.click(within(cible).getByRole('button', { name: /Passer au Pack Ciblé/ }));

    await waitFor(() => expect(nav.redirectTo).toHaveBeenCalledWith('https://pay.example/payments/page/sess_cible'));
    expect(api.purchaseSubscription).toHaveBeenCalledWith('CIBLE', 'traditional');
    expect(open).not.toHaveBeenCalled();
    expect(within(cible).getByRole('button', { name: 'Redirection vers le paiement…' })).toBeDisabled();
  });

  it('switches to crypto: USD prices, paid with crypto', async () => {
    renderPage(<Abonnement />, '/abonnement');
    await screen.findByRole('article', { name: 'Pack Ciblé' });

    await userEvent.click(screen.getByRole('button', { name: /Crypto \(USD\)/ }));
    const winner = await screen.findByRole('button', { name: /^Choisir le Pack Winner · 37,10 \$$/ });
    expect(api.getSubscriptionOffers).toHaveBeenLastCalledWith('crypto');

    api.purchaseSubscription.mockResolvedValueOnce(ok({ paymentDetails: { sessionId: 'sess_usd' } }));
    await userEvent.click(winner);
    await waitFor(() => expect(nav.redirectTo).toHaveBeenCalledWith('https://pay.example/payments/page/sess_usd'));
    expect(api.purchaseSubscription).toHaveBeenCalledWith('WINNER', 'crypto');
  });

  it('opens on crypto for a member outside the Mobile Money countries', async () => {
    auth.user = { country: 'FR', balance: 0 };
    renderPage(<Abonnement />, '/abonnement');
    expect(await screen.findByRole('button', { name: /^Choisir le Pack Classique · 4,80 \$$/ })).toBeInTheDocument();
    expect(api.getSubscriptionOffers).toHaveBeenCalledWith('crypto');
    expect(screen.getByRole('button', { name: /Crypto \(USD\)/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('locks the options until the member has a pack, and says why', async () => {
    auth.user = { country: 'FR', balance: 0 };
    renderPage(<Abonnement />, '/abonnement#pro');
    const pro = await screen.findByRole('article', { name: 'Espace Pro' });
    expect(pro).toHaveAttribute('id', 'pro');
    expect(within(pro).getByText('Choisissez d\'abord un pack.')).toBeInTheDocument();
    expect(within(pro).getByRole('button', { name: /^Activer · 4,80 \$$/ })).toBeDisabled();
  });

  it('sells Espace Pro by the month or the year', async () => {
    renderPage(<Abonnement />, '/abonnement');
    const pro = await screen.findByRole('article', { name: 'Espace Pro' });
    expect(within(pro).getByRole('button', { name: /^Activer · 2\s000 FCFA$/ })).toBeEnabled();

    await userEvent.click(within(pro).getByRole('button', { name: 'Annuel' }));
    expect(within(pro).getByText(/au lieu de/)).toHaveTextContent(/24\s000 FCFA/);
    await userEvent.click(within(pro).getByRole('button', { name: /^Activer · 12\s000 FCFA$/ }));
    await waitFor(() => expect(api.purchaseSubscription).toHaveBeenCalledWith('PRO_YEARLY', 'traditional'));
  });

  it('shows the server’s French message when the purchase is refused', async () => {
    api.purchaseSubscription.mockResolvedValueOnce(fail(409, 'Vous avez déjà ce pack.'));
    renderPage(<Abonnement />, '/abonnement');
    const cible = await screen.findByRole('article', { name: 'Pack Ciblé' });
    await userEvent.click(within(cible).getByRole('button', { name: /Passer au Pack Ciblé/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Vous avez déjà ce pack.')).toBeInTheDocument();
    expect(nav.redirectTo).not.toHaveBeenCalled();
    expect(within(cible).getByRole('button', { name: /Passer au Pack Ciblé/ })).toBeEnabled();
  });

  it('falls back to a French message when the server error is not meant for members', async () => {
    api.purchaseSubscription.mockResolvedValueOnce(fail(500, 'Internal server error'));
    renderPage(<Abonnement />, '/abonnement');
    const cible = await screen.findByRole('article', { name: 'Pack Ciblé' });
    await userEvent.click(within(cible).getByRole('button', { name: /Passer au Pack Ciblé/ }));
    expect(await screen.findByText('Le paiement n\'a pas pu démarrer. Réessayez dans un instant.')).toBeInTheDocument();
    expect(screen.queryByText('Internal server error')).not.toBeInTheDocument();
  });

  it('checks again when the member comes back from the payment page', async () => {
    renderPage(<Abonnement />, '/abonnement');
    await screen.findByRole('article', { name: 'Pack Ciblé' });
    expect(api.getSubscriptionOffers).toHaveBeenCalledTimes(1);

    // Paid: Ciblé is now the member's pack.
    const paid = classiqueMember();
    paid.packs[0] = { ...paid.packs[0], state: 'included' };
    paid.packs[1] = { ...paid.packs[1], state: 'owned', payPrice: null };
    paid.packs[2] = { ...paid.packs[2], payPrice: 10600 };
    api.getSubscriptionOffers.mockResolvedValue(ok(paid));

    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });

    const cible = screen.getByRole('article', { name: 'Pack Ciblé' });
    expect(await within(cible).findByText('Votre pack actuel')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Pack Classique' })).getByText('Inclus dans votre pack')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Passer au Pack Winner · 10\s600 FCFA$/ })).toBeInTheDocument();
    expect(auth.refreshUser).toHaveBeenCalled();
  });

  it('gives a Winner member the VIP group and the extra numbers', async () => {
    const winnerMember = classiqueMember();
    winnerMember.packs = winnerMember.packs.map((p) =>
      p.id === 'WINNER' ? { ...p, state: 'owned', payPrice: null } : { ...p, state: 'included', payPrice: null });
    winnerMember.winner = { owned: true, vipGroupLink: 'https://chat.whatsapp.com/vip', extraNumberSlots: 2 };
    api.getSubscriptionOffers.mockResolvedValue(ok(winnerMember));

    renderPage(<Abonnement />, '/abonnement');
    const winner = await screen.findByRole('article', { name: 'Pack Winner' });
    expect(within(winner).getByRole('link', { name: /Rejoindre le groupe VIP/ })).toHaveAttribute('href', 'https://chat.whatsapp.com/vip');
    expect(within(winner).getByText(/2 emplacements/)).toBeInTheDocument();
    expect(within(winner).getByRole('link', { name: 'Gérer mes numéros' })).toHaveAttribute('href', '/numeros-supplementaires');
  });

  it('keeps the original pack content: pitch, earnings per view, features and formations', async () => {
    renderPage(<Abonnement />, '/abonnement');

    const classique = await screen.findByRole('article', { name: 'Pack Classique' });
    const cible = screen.getByRole('article', { name: 'Pack Ciblé' });
    const winner = screen.getByRole('article', { name: 'Pack Winner' });

    // Classique and Ciblé: the old copy, not the server's list.
    expect(within(classique).getByText('Tout pour démarrer et gagner dès vos premiers statuts.')).toBeInTheDocument();
    expect(within(classique).getByText('Possibilité de gagner entre 5 000 et 10 000 FCFA par jour')).toBeInTheDocument();
    expect(within(classique).getByText('Accès à la marketplace SBC')).toBeInTheDocument();
    expect(within(classique).queryByText('Pack Classique : avantage 1')).not.toBeInTheDocument();
    expect(within(cible).getByText('Le meilleur tarif par vue et un ciblage précis de vos contacts.')).toBeInTheDocument();
    expect(within(cible).getByText('Tout le Pack Classique, et en plus :')).toBeInTheDocument();
    expect(within(cible).getByText(/Ciblage avancé : pays, sexe, âge/)).toBeInTheDocument();
    expect(within(cible).getByText('Commissions sur 3 niveaux')).toBeInTheDocument();
    expect(screen.queryByText(/Plus de commissions/)).not.toBeInTheDocument();
    // Winner: the server's list.
    expect(within(winner).getByText('Pack Winner : avantage 1')).toBeInTheDocument();

    // Earnings per view: 1,75 on Classique, 2 on Ciblé and Winner.
    const earnings = (card: HTMLElement) => within(card).getByRole('region', { name: 'Gains sur vos statuts WhatsApp' });
    expect(earnings(classique)).toHaveTextContent(/jusqu'à\s*1,75\s*FCFA par vue/);
    expect(earnings(classique)).toHaveTextContent(/1\s000 vues sur vos statuts = 1\s750 FCFA pour vous/);
    expect(earnings(cible)).toHaveTextContent(/jusqu'à\s*2\s*FCFA par vue/);
    expect(earnings(winner)).toHaveTextContent(/2\s000 FCFA pour vous/);

    // Formations: 5 on Classique, 6 on Ciblé and Winner with SBC IA Creator highlighted.
    expect(within(classique).getByText('5 formations incluses')).toBeInTheDocument();
    for (const t of ['Trading', 'Achat en Chine', 'Art oratoire', 'Marketing digital', 'Bots WhatsApp']) {
      expect(within(classique).getByText(t)).toBeInTheDocument();
      expect(within(cible).getByText(t)).toBeInTheDocument();
      expect(within(winner).getByText(t)).toBeInTheDocument();
    }
    expect(within(classique).queryByText('SBC IA Creator')).not.toBeInTheDocument();
    expect(within(cible).getByText('6 formations incluses')).toBeInTheDocument();
    expect(within(cible).getByText('SBC IA Creator')).toHaveClass('text-primary');
    expect(within(winner).getByText('6 formations incluses')).toBeInTheDocument();
    expect(within(winner).getByText('SBC IA Creator')).toHaveClass('text-primary');
  });

  it('keeps packs covered by a higher pack short', async () => {
    const winnerMember = classiqueMember();
    winnerMember.packs = winnerMember.packs.map((p) =>
      p.id === 'WINNER' ? { ...p, state: 'owned', payPrice: null } : { ...p, state: 'included', payPrice: null });
    winnerMember.winner = { owned: true, vipGroupLink: null, extraNumberSlots: 3 };
    api.getSubscriptionOffers.mockResolvedValue(ok(winnerMember));
    renderPage(<Abonnement />, '/abonnement');

    const classique = await screen.findByRole('article', { name: 'Pack Classique' });
    expect(within(classique).getByText('Inclus dans votre pack')).toBeInTheDocument();
    expect(within(classique).queryByText(/formations incluses/)).not.toBeInTheDocument();
    expect(within(classique).queryByRole('region', { name: 'Gains sur vos statuts WhatsApp' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Pack Winner' })).getByText('6 formations incluses')).toBeInTheDocument();
  });
});

describe('Votre page de vente', () => {
  const winnerMember = () => {
    const offers = classiqueMember();
    offers.packs = offers.packs.map((p) =>
      p.id === 'WINNER' ? { ...p, state: 'owned', payPrice: null } : { ...p, state: 'included', payPrice: null });
    offers.winner = { owned: true, vipGroupLink: null, extraNumberSlots: 3 };
    return offers;
  };
  const link = `${window.location.origin}/p/AWA237`;

  it('is not shown without Pack Winner', async () => {
    renderPage(<Abonnement />, '/abonnement');
    await screen.findByRole('article', { name: 'Pack Winner' });
    expect(screen.queryByRole('region', { name: 'Votre page de vente' })).not.toBeInTheDocument();
  });

  it('is not shown when the member has no referral code', async () => {
    auth.user = { country: 'CM', balance: 0 };
    api.getSubscriptionOffers.mockResolvedValue(ok(winnerMember()));
    renderPage(<Abonnement />, '/abonnement');
    await screen.findByRole('article', { name: 'Pack Winner' });
    expect(screen.queryByRole('region', { name: 'Votre page de vente' })).not.toBeInTheDocument();
  });

  it('gives a Winner member their link, right after the Winner pack', async () => {
    api.getSubscriptionOffers.mockResolvedValue(ok(winnerMember()));
    renderPage(<Abonnement />, '/abonnement');

    const card = await screen.findByRole('region', { name: 'Votre page de vente' });
    const winner = screen.getByRole('article', { name: 'Pack Winner' });
    // DOCUMENT_POSITION_FOLLOWING: the card comes after the Winner pack.
    expect(winner.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(card).getByTestId('sales-page-link')).toHaveTextContent(link);
    expect(within(card).getByRole('link', { name: /Voir ma page/ })).toHaveAttribute('href', link);
  });

  it('copies the link', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    api.getSubscriptionOffers.mockResolvedValue(ok(winnerMember()));
    renderPage(<Abonnement />, '/abonnement');

    const card = await screen.findByRole('region', { name: 'Votre page de vente' });
    await user.click(within(card).getByRole('button', { name: 'Copier le lien' }));

    expect(writeText).toHaveBeenCalledWith(link);
    expect(await within(card).findByRole('button', { name: 'Lien copié' })).toBeInTheDocument();
  });

  it('shares on WhatsApp when the browser has no share sheet', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    api.getSubscriptionOffers.mockResolvedValue(ok(winnerMember()));
    renderPage(<Abonnement />, '/abonnement');

    const card = await screen.findByRole('region', { name: 'Votre page de vente' });
    await userEvent.click(within(card).getByRole('button', { name: 'Partager' }));

    expect(open).toHaveBeenCalledWith(
      `https://wa.me/?text=${encodeURIComponent(`Rejoignez-moi sur Sniper Business Center : ${link}`)}`,
      '_blank',
      'noopener,noreferrer',
    );
  });
});
