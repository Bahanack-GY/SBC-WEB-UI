import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({ pushGetPreferences: vi.fn(), pushSetPreferences: vi.fn() }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const push = vi.hoisted(() => ({
  pushSupport: vi.fn(), isPushEnabled: vi.fn(), enablePush: vi.fn(), disablePush: vi.fn(),
}));
vi.mock('../utils/push', () => push);

import NotificationSettings from './NotificationSettings';

const categories = [
  { key: 'money', label: 'Argent : commissions et retraits', enabled: true },
  { key: 'chat', label: 'Messages', enabled: true },
  { key: 'tombola', label: 'Tombola', enabled: false },
];

beforeEach(() => {
  (window as unknown as Record<string, unknown>).Notification = { permission: 'default' };
  push.pushSupport.mockReturnValue('supported');
  push.isPushEnabled.mockResolvedValue(false);
  push.enablePush.mockResolvedValue('enabled');
  push.disablePush.mockResolvedValue(undefined);
  api.pushGetPreferences.mockResolvedValue(ok({ categories, quietHours: { from: 22, until: 7 } }));
  api.pushSetPreferences.mockResolvedValue(ok({}));
});

describe('notification settings', () => {
  it('lists every kind with its state, and says what waits for the morning', async () => {
    renderPage(<NotificationSettings />);
    expect(await screen.findByRole('switch', { name: 'Messages' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Tombola' })).not.toBeChecked();
    expect(screen.getByText(/entre 22 h et 7 h arrivent le matin/)).toBeInTheDocument();
  });

  it('turns a kind off and saves the full list of what is off', async () => {
    renderPage(<NotificationSettings />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Messages' }));
    await waitFor(() => expect(api.pushSetPreferences).toHaveBeenCalledWith(['chat', 'tombola']));
    expect(screen.getByRole('switch', { name: 'Messages' })).not.toBeChecked();
  });

  it('puts the switch back when saving fails', async () => {
    api.pushSetPreferences.mockResolvedValue(fail(500, 'boom'));
    renderPage(<NotificationSettings />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Messages' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Messages' })).toBeChecked());
  });

  it('turns notifications on for this phone', async () => {
    renderPage(<NotificationSettings />);
    const device = await screen.findByRole('switch', { name: 'Notifications sur ce téléphone' });
    await waitFor(() => expect(device).not.toBeDisabled());
    await userEvent.click(device);
    expect(push.enablePush).toHaveBeenCalled();
    await waitFor(() => expect(device).toBeChecked());
  });

  it('turns them off for this phone', async () => {
    push.isPushEnabled.mockResolvedValue(true);
    renderPage(<NotificationSettings />);
    const device = await screen.findByRole('switch', { name: 'Notifications sur ce téléphone' });
    await waitFor(() => expect(device).toBeChecked());
    await userEvent.click(device);
    expect(push.disablePush).toHaveBeenCalled();
  });

  it('explains the iPhone step instead of a switch that cannot work', async () => {
    push.pushSupport.mockReturnValue('ios-needs-install');
    renderPage(<NotificationSettings />);
    expect(await screen.findByText(/Sur l'écran d'accueil/)).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Notifications sur ce téléphone' })).not.toBeInTheDocument();
  });

  it('says how to unblock them when the browser refused', async () => {
    (window as unknown as Record<string, unknown>).Notification = { permission: 'denied' };
    renderPage(<NotificationSettings />);
    expect(await screen.findByText(/bloquées pour SBC/)).toBeInTheDocument();
  });
});
