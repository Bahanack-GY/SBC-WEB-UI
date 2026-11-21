import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { fail, ok, renderPage } from '../../test/api';
import { chatRows, dayLabel } from './chat';

const api = vi.hoisted(() => ({
    supportTicket: vi.fn(), supportReply: vi.fn(), supportCloseTicket: vi.fn(), supportUploadAttachment: vi.fn(), supportRealtimeToken: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import HelpTicket from './HelpTicket';

type Msg = { id: string; body: string; author: 'member' | 'agent'; at?: string; attachments?: unknown[] };
const ticketData = (messages: Msg[], extra: Record<string, unknown> = {}) => ({
    id: 't1', number: 'SUP-000001', subject: 'Retrait bloqué', category: 'retrait', status: 'en_attente_membre', createdAt: '2026-11-18T10:00:00Z',
    agentReadAt: null,
    messages: messages.map((m) => ({ id: m.id, body: m.body, author: { type: m.author, name: m.author === 'agent' ? 'Awa' : null }, createdAt: m.at ?? '2026-11-18T10:00:00Z', attachments: m.attachments ?? [] })),
    ...extra,
});
const ticket = (messages: Msg[], extra?: Record<string, unknown>) => ok(ticketData(messages, extra));
const first: Msg = { id: 'm1', body: 'Mon retrait est bloqué.', author: 'member' };

const open = () => renderPage(<Routes><Route path="/aide/demandes/:id" element={<HelpTicket />} /></Routes>, '/aide/demandes/t1');
const bubble = (text: string) => screen.getByText(text).closest('li')!;

beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.supportRealtimeToken.mockResolvedValue(ok({ enabled: false }));
});

describe('A request’s conversation, like a WhatsApp chat', () => {
    it('shows the agent’s new reply without reloading the page', async () => {
        api.supportTicket
            .mockResolvedValueOnce(ticket([first]))
            .mockResolvedValue(ticket([first, { id: 'm2', body: 'Nous vérifions avec l’opérateur.', author: 'agent' }]));
        open();
        expect(await screen.findByText('Mon retrait est bloqué.')).toBeInTheDocument();
        expect(screen.queryByText('Nous vérifions avec l’opérateur.')).toBeNull();
        // Polled every 5 s while the request is open.
        expect(await screen.findByText('Nous vérifions avec l’opérateur.', {}, { timeout: 8000 })).toBeInTheDocument();
        expect(within(bubble('Nous vérifions avec l’opérateur.')).getByText('Awa')).toBeInTheDocument();
    }, 12000);

    it('a sent message shows at once with a clock, then one tick; blue ticks once the support has read it', async () => {
        const user = userEvent.setup();
        api.supportTicket.mockResolvedValueOnce(ticket([first]));
        let answer!: (v: unknown) => void;
        api.supportReply.mockReturnValue(new Promise((r) => { answer = r; }));
        open();
        await screen.findByText('Mon retrait est bloqué.');
        expect(within(bubble('Mon retrait est bloqué.')).getByRole('img', { name: 'Envoyé' })).toBeInTheDocument();

        await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Toujours rien ce matin.');
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));
        expect(within(bubble('Toujours rien ce matin.')).getByRole('img', { name: 'Envoi en cours' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('');
        expect(api.supportReply).toHaveBeenCalledWith('t1', { message: 'Toujours rien ce matin.', attachmentIds: [] });

        answer(ticket([first, { id: 'm3', body: 'Toujours rien ce matin.', author: 'member', at: '2026-11-18T11:00:00Z' }]));
        await waitFor(() => expect(within(bubble('Toujours rien ce matin.')).getByRole('img', { name: 'Envoyé' })).toBeInTheDocument());
        expect(screen.getAllByText('Toujours rien ce matin.')).toHaveLength(1);
    });

    it('shows blue ticks on what the support has read, not on what came after', async () => {
        api.supportTicket.mockResolvedValue(ticket(
            [first, { id: 'm4', body: 'Une précision : c’était via Orange.', author: 'member', at: '2026-11-18T12:00:00Z' }],
            { agentReadAt: '2026-11-18T11:00:00Z' },
        ));
        open();
        await screen.findByText('Mon retrait est bloqué.');
        expect(within(bubble('Mon retrait est bloqué.')).getByRole('img', { name: 'Lu par le support' })).toBeInTheDocument();
        expect(within(bubble('Une précision : c’était via Orange.')).getByRole('img', { name: 'Envoyé' })).toBeInTheDocument();
    });

    it('sends a photo without a caption and shows it in the conversation', async () => {
        const user = userEvent.setup({ applyAccept: false });
        api.supportTicket.mockResolvedValue(ticket([first]));
        api.supportUploadAttachment.mockResolvedValue(ok({ id: 'att1' }));
        api.supportReply.mockResolvedValue(ticket([first, {
            id: 'm5', body: 'Pièce jointe', author: 'member',
            attachments: [{ id: 'att1', filename: 'capture.png', mime: 'image/png', size: 2000, url: 'https://files.test/capture.png' }],
        }]));
        open();
        await screen.findByText('Mon retrait est bloqué.');
        await user.upload(screen.getByLabelText('Joindre une photo ou un PDF'), new File(['x'], 'capture.png', { type: 'image/png' }));
        expect(within(screen.getByRole('list', { name: 'Fichiers joints' })).getByText('capture.png')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));

        expect(await screen.findByRole('img', { name: 'capture.png' })).toHaveAttribute('src', 'https://files.test/capture.png');
        expect(api.supportReply).toHaveBeenCalledWith('t1', { message: 'Pièce jointe', attachmentIds: ['att1'] });
        expect(screen.queryByText('Pièce jointe')).toBeNull();
    });

    it('keeps a message that could not be sent and lets the member try again', async () => {
        const user = userEvent.setup();
        api.supportTicket.mockResolvedValue(ticket([first]));
        api.supportReply.mockResolvedValueOnce(fail(500, 'Server error')).mockResolvedValue(ticket([first, { id: 'm6', body: 'Vous êtes là ?', author: 'member' }]));
        open();
        await screen.findByText('Mon retrait est bloqué.');
        await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Vous êtes là ?');
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));
        expect(await screen.findByText(/Non envoyé\./)).toBeInTheDocument();
        expect(within(bubble('Vous êtes là ?')).getByRole('img', { name: 'Non envoyé' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Réessayer' }));
        expect(await within(bubble('Vous êtes là ?')).findByRole('img', { name: 'Envoyé' })).toBeInTheDocument();
        expect(screen.queryByText(/Non envoyé\./)).toBeNull();
    });

    it('closes the request from the ⋮ menu, and a closed request has no message bar', async () => {
        const user = userEvent.setup();
        api.supportTicket.mockResolvedValueOnce(ticket([first])).mockResolvedValue(ticket([first], { status: 'ferme' }));
        api.supportCloseTicket.mockResolvedValue(ok({ ok: true }));
        open();
        await screen.findByText('Mon retrait est bloqué.');
        await user.click(screen.getByRole('button', { name: 'Plus d’options' }));
        await user.click(screen.getByRole('menuitem', { name: /fermer la demande/ }));
        await user.click(await screen.findByRole('button', { name: 'Fermer la demande' }));
        expect(api.supportCloseTicket).toHaveBeenCalledWith('t1');
        expect(await screen.findByText('Cette demande est fermée.')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull();
    });
});

describe('chat layout helpers', () => {
    const now = new Date(2026, 10, 18, 15, 0);
    it('labels days like WhatsApp', () => {
        expect(dayLabel(new Date(2026, 10, 18, 9).toISOString(), now)).toBe('Aujourd’hui');
        expect(dayLabel(new Date(2026, 10, 17, 23).toISOString(), now)).toBe('Hier');
        expect(dayLabel(new Date(2026, 10, 14, 12).toISOString(), now)).toBe('Samedi');
        expect(dayLabel(new Date(2026, 9, 2, 12).toISOString(), now)).toBe('2 octobre');
        expect(dayLabel(new Date(2025, 9, 2, 12).toISOString(), now)).toBe('2 octobre 2025');
    });

    it('puts a day chip before each day and marks the first message of each run', () => {
        const at = (d: number, h: number) => new Date(2026, 10, d, h).toISOString();
        const rows = chatRows(
            [{ w: 'a', t: at(17, 9) }, { w: 'a', t: at(17, 10) }, { w: 'b', t: at(17, 11) }, { w: 'b', t: at(18, 9) }],
            (x) => x.t, (x) => x.w, (_x, i) => String(i), now,
        );
        expect(rows.map((r) => (r.kind === 'day' ? r.label : `${r.item.w}${r.first ? '*' : ''}`))).toEqual(['Hier', 'a*', 'a', 'b*', 'Aujourd’hui', 'b*']);
    });
});
