import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ supportTicket: vi.fn(), supportReplyTicket: vi.fn(), supportCloseTicket: vi.fn(), supportUploadAttachment: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import HelpTicket from './HelpTicket';

const ticket = (messages: { id: string; body: string; author: 'member' | 'agent' }[], status = 'en_attente_membre') => ok({
    id: 't1', number: 'SUP-000001', subject: 'Retrait bloqué', category: 'retrait', status, createdAt: '2026-11-18T10:00:00Z',
    messages: messages.map((m) => ({ id: m.id, body: m.body, author: { type: m.author, name: m.author === 'agent' ? 'Awa' : 'Vous' }, createdAt: '2026-11-18T10:00:00Z' })),
});

describe('A request’s conversation', () => {
    it('shows the agent’s new reply without reloading the page', async () => {
        api.supportTicket
            .mockResolvedValueOnce(ticket([{ id: 'm1', body: 'Mon retrait est bloqué.', author: 'member' }]))
            .mockResolvedValue(ticket([{ id: 'm1', body: 'Mon retrait est bloqué.', author: 'member' }, { id: 'm2', body: 'Nous vérifions avec l’opérateur.', author: 'agent' }]));
        renderPage(<Routes><Route path="/aide/demandes/:id" element={<HelpTicket />} /></Routes>, '/aide/demandes/t1');
        expect(await screen.findByText('Mon retrait est bloqué.')).toBeInTheDocument();
        expect(screen.queryByText('Nous vérifions avec l’opérateur.')).toBeNull();
        // Polled every 5 s while the request is open.
        expect(await screen.findByText('Nous vérifions avec l’opérateur.', {}, { timeout: 8000 })).toBeInTheDocument();
    }, 12000);
});
