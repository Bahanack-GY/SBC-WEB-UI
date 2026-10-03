import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ inboxUnreadCount: vi.fn(), generateThumbnailUrl: vi.fn(() => ''), generateSettingsFileUrl: vi.fn(() => '') }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Paul' }, isAuthenticated: true }) }));
vi.mock('./ServicesSidebar', () => ({ default: () => null }));
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => nav.navigate }));

import Header from './Header';

beforeEach(() => { nav.navigate.mockReset(); });

describe('the bell', () => {
  it('shows how many notifications are unread, up to 99+', async () => {
    api.inboxUnreadCount.mockResolvedValue(ok({ unread: 150 }));
    renderPage(<Header />);
    expect(await screen.findByText('99+')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications, 150 non lues' })).toBeInTheDocument();
  });

  it('shows no number when everything is read', async () => {
    api.inboxUnreadCount.mockResolvedValue(ok({ unread: 0 }));
    renderPage(<Header />);
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens the notification list', async () => {
    api.inboxUnreadCount.mockResolvedValue(ok({ unread: 3 }));
    renderPage(<Header />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 3 non lues' }));
    expect(nav.navigate).toHaveBeenCalledWith('/notifications');
  });
});
