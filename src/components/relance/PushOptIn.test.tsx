import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.hoisted(() => ({
  pushSupport: vi.fn(),
  isPushEnabled: vi.fn(),
  enablePush: vi.fn(),
}));
vi.mock('../../utils/push', () => push);

import { PushOptIn } from './PushOptIn';

const setPermission = (p: NotificationPermission) => {
  (window as unknown as Record<string, unknown>).Notification = { permission: p };
};

beforeEach(() => {
  push.pushSupport.mockReturnValue('supported');
  push.isPushEnabled.mockResolvedValue(false);
  push.enablePush.mockResolvedValue('enabled');
  setPermission('default');
});

describe('relance alerts on this phone', () => {
  it('offers them, and confirms once they are on', async () => {
    render(<PushOptIn />);
    await userEvent.click(await screen.findByRole('button', { name: 'Activer' }));
    expect(push.enablePush).toHaveBeenCalled();
    expect(await screen.findByText('Alertes activées')).toBeInTheDocument();
  });

  it('stays out of the way when they are already on', async () => {
    push.isPushEnabled.mockResolvedValue(true);
    render(<PushOptIn />);
    await Promise.resolve();
    expect(screen.queryByRole('button', { name: 'Activer' })).not.toBeInTheDocument();
  });

  it('does not ask again once the browser refused', async () => {
    setPermission('denied');
    render(<PushOptIn />);
    await Promise.resolve();
    expect(screen.queryByRole('region', { name: 'Alertes sur ce téléphone' })).not.toBeInTheDocument();
  });

  it('tells an iPhone user how, instead of a button that cannot work', async () => {
    push.pushSupport.mockReturnValue('ios-needs-install');
    render(<PushOptIn />);
    expect(await screen.findByText("Sur iPhone, ajoutez d'abord SBC à l'écran d'accueil.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activer' })).not.toBeInTheDocument();
  });

  it('disappears quietly if the parrain refuses at the prompt', async () => {
    push.enablePush.mockResolvedValue('denied');
    render(<PushOptIn />);
    await userEvent.click(await screen.findByRole('button', { name: 'Activer' }));
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Activer' })).not.toBeInTheDocument());
    expect(screen.queryByText('Alertes activées')).not.toBeInTheDocument();
  });
});
