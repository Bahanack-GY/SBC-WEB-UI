import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderPage } from '../../test/api';
import { rememberGuestRequest } from './guest';

vi.mock('./identity', async (orig) => ({ ...(await orig<typeof import('./identity')>()), shrinkPhoto: async (f: File) => f }));
import GuestIdentityPage from './GuestIdentityPage';

const KEY = 'k'.repeat(43);
let posted: FormData | null = null;
let latest: unknown = null;
beforeEach(() => {
    localStorage.removeItem('sbcSupportGuestRequests');
    posted = null;
    latest = null;
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }));
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const auth = new Headers(init.headers).get('authorization');
        if (auth !== `SupportKey ${KEY}` || !String(input).endsWith('/support/public/tickets/g1/identity-verification')) {
            return new Response(JSON.stringify({ success: false, message: 'Demande introuvable.' }), { status: 404 });
        }
        if (init.method === 'POST') {
            posted = init.body as FormData;
            latest = { id: 'v1', purpose: 'lost_access', ticketId: 'g1', status: 'pending', submittedAt: null, decidedAt: null };
        }
        return new Response(JSON.stringify({ success: true, data: latest }), { status: init.method === 'POST' ? 201 : 200 });
    }));
});
afterEach(() => vi.unstubAllGlobals());

const open = () => renderPage(<Routes><Route path="/signaler-un-probleme/identite/:id" element={<GuestIdentityPage />} /></Routes>, '/signaler-un-probleme/identite/g1');
const photo = (name: string) => new File([new Uint8Array([0xff, 0xd8, 0xff, 1])], name, { type: 'image/jpeg' });

describe('identity check without an account (lost access)', () => {
    it('without the request’s key on this device: asks to open the email link', async () => {
        open();
        expect(await screen.findByText(/lien reçu par email/)).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('sends the photos on the request with its key, then shows the status', async () => {
        const user = userEvent.setup();
        rememberGuestRequest({ id: 'g1', number: 'SUP-000043', key: KEY });
        open();
        await user.upload(await screen.findByTestId('photo-id_front'), photo('r.jpg'));
        await user.upload(screen.getByTestId('photo-selfie'), photo('s.jpg'));
        await user.click(screen.getByRole('button', { name: 'Envoyer à l’équipe SBC' }));
        await waitFor(() => expect(posted).not.toBeNull());
        expect([...posted!.keys()].sort()).toEqual(['id_front', 'selfie']);
        expect(await screen.findByTestId('identity-status')).toHaveTextContent('Un agent SBC examine vos photos');
        expect(screen.getByRole('link', { name: 'Revenir à ma demande' })).toHaveAttribute('href', '/signaler-un-probleme/suivi/g1');
    });
});
