import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { fail, ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ nextAnnouncement: vi.fn(), announcementEvent: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ isAuthenticated: true, user: { _id: 'u1' } as Record<string, unknown> | null }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));

import AnnouncementGate from './AnnouncementPopup';
import { resetAnnouncementSession } from './announcementSession';

const user = userEvent.setup();
const ANN = { id: 'a1', title: 'Nouveau : le Pack Winner', message: 'Ligne 1\nLigne 2', imageUrl: null, buttonLabel: 'Voir mon abonnement', buttonUrl: '/abonnement' };

const page = (route = '/') => renderPage(
    <Routes>
        <Route path="*" element={<AnnouncementGate delayMs={0}><p>Installer l’application</p></AnnouncementGate>} />
        <Route path="/abonnement" element={<p>Page abonnement</p>} />
    </Routes>, route);

beforeEach(() => {
    resetAnnouncementSession();
    auth.isAuthenticated = true;
    auth.user = { _id: 'u1' };
    api.nextAnnouncement.mockReset().mockResolvedValue(ok(ANN));
    api.announcementEvent.mockReset().mockResolvedValue(ok(null));
});

describe('pop-up announcement', () => {
    it('shows the announcement, records it as seen, and hides the install prompt meanwhile', async () => {
        page();
        const dialog = await screen.findByRole('dialog', { name: 'Nouveau : le Pack Winner' });
        expect(dialog).toHaveTextContent('Ligne 1');
        expect(screen.queryByText('Installer l’application')).not.toBeInTheDocument();
        await waitFor(() => expect(api.announcementEvent).toHaveBeenCalledWith('a1', 'shown'));
    });

    it('« Fermer » records it as closed, hides it, and lets the install prompt through', async () => {
        page();
        await screen.findByRole('dialog');
        await user.click(screen.getByRole('button', { name: 'Fermer' }));
        expect(api.announcementEvent).toHaveBeenCalledWith('a1', 'closed');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('Installer l’application')).toBeInTheDocument();
    });

    it('Escape closes it too', async () => {
        page();
        await screen.findByRole('dialog');
        await user.keyboard('{Escape}');
        expect(api.announcementEvent).toHaveBeenCalledWith('a1', 'closed');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('its button records the tap and opens the app page', async () => {
        page();
        await screen.findByRole('dialog');
        await user.click(screen.getByRole('button', { name: 'Voir mon abonnement' }));
        expect(api.announcementEvent).toHaveBeenCalledWith('a1', 'clicked');
        expect(await screen.findByText('Page abonnement')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('an https button opens a new tab', async () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        api.nextAnnouncement.mockResolvedValue(ok({ ...ANN, buttonLabel: 'Lire', buttonUrl: 'https://exemple.test/a' }));
        page();
        await screen.findByRole('dialog');
        await user.click(screen.getByRole('button', { name: 'Lire' }));
        expect(open).toHaveBeenCalledWith('https://exemple.test/a', '_blank', 'noopener');
        open.mockRestore();
    });

    it('shows nothing when there is no announcement, or when the server fails', async () => {
        api.nextAnnouncement.mockResolvedValue(ok(null));
        const { unmount } = page();
        await waitFor(() => expect(api.nextAnnouncement).toHaveBeenCalled());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('Installer l’application')).toBeInTheDocument();
        unmount();

        resetAnnouncementSession();
        api.nextAnnouncement.mockResolvedValue(fail(500, 'boom'));
        page();
        await waitFor(() => expect(api.nextAnnouncement).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('asks only once per app session, even when the gate mounts again', async () => {
        const first = page();
        await screen.findByRole('dialog');
        await user.click(screen.getByRole('button', { name: 'Fermer' }));
        first.unmount();
        page();
        expect(screen.getByText('Installer l’application')).toBeInTheDocument();
        expect(api.nextAnnouncement).toHaveBeenCalledTimes(1);
    });

    it('asks nothing for a visitor, and never covers sign-up', async () => {
        auth.isAuthenticated = false;
        auth.user = null;
        const { unmount } = page();
        await new Promise(r => setTimeout(r, 20));
        expect(api.nextAnnouncement).not.toHaveBeenCalled();
        unmount();

        auth.isAuthenticated = true;
        auth.user = { _id: 'u1' };
        page('/signup');
        await waitFor(() => expect(api.nextAnnouncement).toHaveBeenCalled());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
