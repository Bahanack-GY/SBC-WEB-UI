import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderPage } from '../../test/api';
import GuestTicketPage from './GuestTicketPage';
import { rememberGuestRequest } from './guest';

const KEY = 'k'.repeat(43);
const ticket = (bodies: { body: string; author: 'member' | 'agent' }[]) => ({
    id: 'g1', number: 'SUP-000043', subject: 'Connexion impossible', category: 'compte_acces', status: 'nouveau', createdAt: '2026-11-18T10:00:00Z',
    messages: bodies.map((m, i) => ({ id: `m${i}`, body: m.body, author: { type: m.author, name: m.author === 'agent' ? 'Awa' : 'Jean' }, createdAt: '2026-11-18T10:00:00Z', attachments: [] })),
});

let calls: { url: string; method: string; key: string | null; body?: unknown }[] = [];
function serve(answer: (url: string, method: string) => unknown) {
    calls = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = String(input);
        const method = (init.method ?? 'GET').toUpperCase();
        const key = new Headers(init.headers).get('x-support-guest-key');
        calls.push({ url, method, key, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
        if (key !== KEY) return new Response(JSON.stringify({ success: false, message: 'Demande introuvable.' }), { status: 404 });
        return new Response(JSON.stringify({ success: true, data: answer(url, method) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
}
const open = (path = '/signaler-un-probleme/suivi/g1') =>
    renderPage(<Routes><Route path="/signaler-un-probleme/suivi/:id" element={<GuestTicketPage />} /></Routes>, path);

beforeEach(() => localStorage.removeItem('sbcSupportGuestRequests'));
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

describe('the chat of a request sent without an account', () => {
    it('opens with the key kept on this device, and the person chats with the agent', async () => {
        const user = userEvent.setup();
        rememberGuestRequest({ id: 'g1', number: 'SUP-000043', key: KEY });
        serve((url, method) => (url.endsWith('/realtime/token') ? { enabled: false }
            : method === 'POST' ? ticket([{ body: 'Le code n’arrive pas.', author: 'member' }, { body: 'Toujours rien.', author: 'member' }])
                : ticket([{ body: 'Le code n’arrive pas.', author: 'member' }, { body: 'Avez-vous regardé dans les spams ?', author: 'agent' }])));
        open();
        expect(await screen.findByText('Avez-vous regardé dans les spams ?')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Support SBC' })).toBeInTheDocument();

        await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Toujours rien.');
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));
        await waitFor(() => expect(within(screen.getByText('Toujours rien.').closest('li')!).getByRole('img', { name: 'Envoyé' })).toBeInTheDocument());
        const sent = calls.find((c) => c.method === 'POST' && c.url.endsWith('/support/public/tickets/g1/messages'));
        expect(sent).toMatchObject({ key: KEY, body: { message: 'Toujours rien.', attachmentIds: [] } });
    });

    it('opens from the link in the agent’s email, then removes the key from the address', async () => {
        window.history.replaceState(null, '', `/signaler-un-probleme/suivi/g1#k=${KEY}`);
        serve((url) => (url.endsWith('/realtime/token') ? { enabled: false } : ticket([{ body: 'Le code n’arrive pas.', author: 'member' }])));
        open(`/signaler-un-probleme/suivi/g1`);
        expect(await screen.findByText('Le code n’arrive pas.')).toBeInTheDocument();
        expect(window.location.hash).toBe('');
        expect(JSON.parse(localStorage.getItem('sbcSupportGuestRequests')!)[0]).toMatchObject({ id: 'g1', key: KEY });
    });

    it('without the key, explains how to open it', () => {
        open();
        expect(screen.getByText(/utilisez le lien reçu par email/)).toBeInTheDocument();
    });
});
