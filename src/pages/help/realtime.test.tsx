import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ok, renderPage } from '../../test/api';
import { parseSignal } from './realtime';

const fake = vi.hoisted(() => ({ onData: null as null | ((p: Uint8Array, a?: unknown, b?: unknown, topic?: string) => void) }));
vi.mock('livekit-client', () => {
    class Room {
        on(ev: string, cb: any) { if (ev === 'dataReceived') fake.onData = cb; return this; }
        async connect() {}
        async disconnect() {}
    }
    return { Room, RoomEvent: { DataReceived: 'dataReceived', Disconnected: 'disconnected', Reconnecting: 'reconnecting', Reconnected: 'reconnected' } };
});
const api = vi.hoisted(() => ({ supportTicket: vi.fn(), supportRealtimeToken: vi.fn(), supportReplyTicket: vi.fn(), supportCloseTicket: vi.fn(), supportUploadAttachment: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import HelpTicket from './HelpTicket';

const enc = (o: unknown) => new TextEncoder().encode(JSON.stringify(o));
const ticket = (bodies: string[]) => ok({
    id: 't1', number: 'SUP-000001', subject: 'Retrait bloqué', category: 'retrait', status: 'ouvert', createdAt: '2026-11-18T10:00:00Z',
    messages: bodies.map((b, i) => ({ id: `m${i}`, body: b, author: { type: i ? 'agent' : 'member', name: i ? 'Awa' : 'Vous' }, createdAt: '2026-11-18T10:00:00Z' })),
});

describe('live request updates', () => {
    it('ignores anything that is not a support ticket signal', () => {
        expect(parseSignal(enc({ type: 'ticket', ticketId: 't1' }), 'support')).toMatchObject({ ticketId: 't1' });
        expect(parseSignal(enc({ type: 'other' }), 'support')).toBeNull();
    });

    it('shows the agent’s reply as soon as the signal arrives', async () => {
        api.supportRealtimeToken.mockResolvedValue(ok({ enabled: true, url: 'wss://live.test', room: 'support-member-u1', token: 'tok' }));
        api.supportTicket.mockResolvedValueOnce(ticket(['Mon retrait est bloqué.'])).mockResolvedValue(ticket(['Mon retrait est bloqué.', 'Nous vérifions avec l’opérateur.']));
        renderPage(<Routes><Route path="/aide/demandes/:id" element={<HelpTicket />} /></Routes>, '/aide/demandes/t1');
        expect(await screen.findByText('Mon retrait est bloqué.')).toBeInTheDocument();
        await waitFor(() => expect(fake.onData).not.toBeNull());
        fake.onData!(enc({ type: 'ticket', ticketId: 't1', kind: 'message' }), undefined, undefined, 'support');
        expect(await screen.findByText('Nous vérifions avec l’opérateur.', {}, { timeout: 1500 })).toBeInTheDocument();
    });
});
