import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({ inboxList: vi.fn(), inboxMarkRead: vi.fn(), inboxDelete: vi.fn(), inboxClear: vi.fn() }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const tray = vi.hoisted(() => ({ closeTrayNotifications: vi.fn() }));
vi.mock('../utils/push', () => tray);
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => nav.navigate }));

import NotificationInbox, { groupOf, when } from './NotificationInbox';
import { badgeText } from '../hooks/useInbox';

const now = Date.now();
const ago = (min: number) => new Date(now - min * 60_000).toISOString();
const items = [
  { _id: 'a', category: 'money', title: '+1 000 FCFA de commission', body: 'Marie vient de prendre son abonnement.', url: '/wallet', createdAt: ago(3) },
  { _id: 'b', tag: 'filleul-u9', category: 'filleuls', title: 'Nouveau filleul', body: "Paul vient de s'inscrire.", url: '/filleuls', createdAt: ago(30), readAt: ago(10) },
  { _id: 'c', category: 'events', title: 'Rappel', body: 'Le concert approche.', createdAt: ago(3 * 24 * 60), readAt: ago(60) },
];

beforeEach(() => {
  nav.navigate.mockReset();
  tray.closeTrayNotifications.mockReset();
  api.inboxList.mockReset().mockResolvedValue(ok({ items, unread: 1, hasMore: false }));
  api.inboxMarkRead.mockReset().mockResolvedValue(ok({ unread: 0 }));
  api.inboxDelete.mockReset().mockResolvedValue(ok({ unread: 0 }));
  api.inboxClear.mockReset().mockResolvedValue(ok({ unread: 0 }));
});

describe('the bell number', () => {
  it.each([[0, ''], [1, '1'], [99, '99'], [100, '99+'], [4000, '99+']])('%i → "%s"', (n, text) => {
    expect(badgeText(n)).toBe(text);
  });
});

describe('notification list', () => {
  it('offers to install the app at the top, until it is installed', async () => {
    renderPage(<NotificationInbox />);
    expect(await screen.findByRole('region', { name: "Installer l'application" })).toBeInTheDocument();
  });

  it('lists notifications newest first, grouped by day', async () => {
    renderPage(<NotificationInbox />);
    expect(await screen.findByText('+1 000 FCFA de commission')).toBeInTheDocument();
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText('Plus tôt')).toBeInTheDocument();
  });

  it('clears the bell on opening', async () => {
    renderPage(<NotificationInbox />);
    await waitFor(() => expect(api.inboxMarkRead).toHaveBeenCalledWith({ all: true }));
  });

  it('does not bother the server when nothing is new', async () => {
    api.inboxList.mockResolvedValue(ok({ items: items.map(i => ({ ...i, readAt: ago(1) })), unread: 0, hasMore: false }));
    renderPage(<NotificationInbox />);
    await screen.findByText('Nouveau filleul');
    expect(api.inboxMarkRead).not.toHaveBeenCalled();
  });

  it('opens the page a notification points to', async () => {
    renderPage(<NotificationInbox />);
    await userEvent.click(await screen.findByText('Nouveau filleul'));
    expect(nav.navigate).toHaveBeenCalledWith('/filleuls');
    expect(tray.closeTrayNotifications).toHaveBeenCalledWith(['filleul-u9']);
  });

  it('removes one notification', async () => {
    renderPage(<NotificationInbox />);
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer « Nouveau filleul »' }));
    await waitFor(() => expect(screen.queryByText('Nouveau filleul')).not.toBeInTheDocument());
    expect(api.inboxDelete).toHaveBeenCalledWith('b');
    // …and from the phone's notification bar.
    expect(tray.closeTrayNotifications).toHaveBeenCalledWith(['filleul-u9']);
  });

  it('clears everything after asking', async () => {
    renderPage(<NotificationInbox />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tout effacer' }));
    const sheet = await screen.findByRole('dialog');
    expect(api.inboxClear).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Tout effacer' }));
    await waitFor(() => expect(api.inboxClear).toHaveBeenCalled());
    expect(tray.closeTrayNotifications).toHaveBeenCalledWith(); // every SBC notification but chat
    expect(await screen.findByText('Aucune notification')).toBeInTheDocument();
  });

  it('loads older notifications on demand', async () => {
    api.inboxList
      .mockResolvedValueOnce(ok({ items: items.slice(0, 2), unread: 0, hasMore: true }))
      .mockResolvedValueOnce(ok({ items: items.slice(2), unread: 0, hasMore: false }));
    renderPage(<NotificationInbox />);
    await userEvent.click(await screen.findByRole('button', { name: 'Voir plus' }));
    expect(await screen.findByText('Rappel')).toBeInTheDocument();
    expect(api.inboxList).toHaveBeenLastCalledWith(items[1].createdAt);
  });

  it('says so when there is nothing', async () => {
    api.inboxList.mockResolvedValue(ok({ items: [], unread: 0, hasMore: false }));
    renderPage(<NotificationInbox />);
    expect(await screen.findByText('Aucune notification')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tout effacer' })).not.toBeInTheDocument();
  });
});

describe('dates', () => {
  const at = new Date('2026-10-03T15:00:00');
  it.each([
    ['2026-10-03T14:59:40', "à l'instant"],
    ['2026-10-03T14:50:00', 'il y a 10 min'],
    ['2026-10-03T12:00:00', 'il y a 3 h'],
  ])('%s → %s', (iso, text) => expect(when(iso, at)).toBe(text));

  it('groups by day', () => {
    expect(groupOf('2026-10-03T08:00:00', at)).toBe("Aujourd'hui");
    expect(groupOf('2026-10-02T23:00:00', at)).toBe('Hier');
    expect(groupOf('2026-09-28T10:00:00', at)).toBe('Plus tôt');
  });
});
