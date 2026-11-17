import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { fail, ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
    supportUploadAttachment: vi.fn(),
    supportCreateTicket: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import HelpNewTicket from './HelpNewTicket';

function renderForm(route = '/aide/demandes/nouvelle') {
    return renderPage(
        <Routes>
            <Route path="/aide/demandes/nouvelle" element={<HelpNewTicket />} />
            <Route path="/aide/demandes/:id" element={<h1>Page de la demande</h1>} />
        </Routes>,
        route,
    );
}

const file = (name: string, type: string, size: number) => {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
};

// The input's `accept` would hide wrong files from the picker; the check must hold without it.
const setup = () => userEvent.setup({ applyAccept: false });

async function fillValid(user: ReturnType<typeof setup>) {
    await user.selectOptions(screen.getByLabelText('Sujet'), 'payment');
    await user.type(screen.getByLabelText('Titre'), 'Paiement débité deux fois');
    await user.type(screen.getByLabelText('Votre message'), 'J’ai été débité deux fois pour mon pack hier soir.');
}

beforeEach(() => {
    api.supportUploadAttachment.mockReset();
    api.supportCreateTicket.mockReset();
});

describe('New request', () => {
    it('refuses an empty form and says what is missing', async () => {
        const user = setup();
        renderForm();
        await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
        expect(screen.getByText('Choisissez le sujet de votre demande.')).toBeInTheDocument();
        expect(screen.getByText(/titre d’au moins 5 caractères/)).toBeInTheDocument();
        expect(screen.getByText(/au moins 20 caractères/)).toBeInTheDocument();
        expect(screen.getByLabelText('Sujet')).toHaveAttribute('aria-invalid', 'true');
        expect(api.supportCreateTicket).not.toHaveBeenCalled();
    });

    it('rejects a file that is not an image or a PDF', async () => {
        const user = setup();
        renderForm();
        await user.upload(screen.getByLabelText(/Joindre une photo ou un PDF/), file('notes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2000));
        expect(screen.getByRole('alert')).toHaveTextContent('« notes.docx » n’est pas accepté');
        expect(screen.queryByRole('list', { name: 'Fichiers joints' })).not.toBeInTheDocument();
    });

    it('rejects a file over 10 MB and keeps the good ones', async () => {
        const user = setup();
        renderForm();
        await user.upload(screen.getByLabelText(/Joindre une photo ou un PDF/), [
            file('releve.pdf', 'application/pdf', 11 * 1024 * 1024),
            file('capture.png', 'image/png', 300 * 1024),
        ]);
        expect(screen.getByRole('alert')).toHaveTextContent('« releve.pdf » est trop lourd');
        const joined = screen.getByRole('list', { name: 'Fichiers joints' });
        expect(joined).toHaveTextContent('capture.png');
        expect(joined).not.toHaveTextContent('releve.pdf');
    });

    it('uploads the attachments, creates the request and opens it', async () => {
        const user = setup();
        api.supportUploadAttachment.mockResolvedValue(ok({ id: 'att1' }));
        api.supportCreateTicket.mockResolvedValue(ok({ _id: 't7', status: 'new' }));
        renderForm();
        await fillValid(user);
        await user.upload(screen.getByLabelText(/Joindre une photo ou un PDF/), file('capture.jpg', 'image/jpeg', 500 * 1024));
        await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

        expect(await screen.findByRole('heading', { name: 'Page de la demande' })).toBeInTheDocument();
        expect(api.supportUploadAttachment).toHaveBeenCalledTimes(1);
        expect(api.supportCreateTicket).toHaveBeenCalledWith({
            category: 'payment',
            subject: 'Paiement débité deux fois',
            message: 'J’ai été débité deux fois pour mon pack hier soir.',
            attachmentIds: ['att1'],
        });
    });

    it('explains the daily limit politely', async () => {
        const user = setup();
        api.supportCreateTicket.mockResolvedValue(fail(429, 'Too many requests'));
        renderForm();
        await fillValid(user);
        await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/Vous avez déjà envoyé plusieurs demandes aujourd’hui/);
    });

    it('opens on the identity check with its advice', () => {
        renderForm('/aide/demandes/nouvelle?categorie=identity_verification');
        expect(screen.getByLabelText('Sujet')).toHaveValue('identity_verification');
        expect(screen.getByText(/Ne donnez jamais votre mot de passe/)).toBeInTheDocument();
    });
});
