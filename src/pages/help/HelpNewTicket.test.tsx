import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { fail, ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
    supportUploadAttachment: vi.fn(),
    supportCreateTicket: vi.fn(),
    supportPublicTicket: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ isAuthenticated: true, user: null as Record<string, unknown> | null }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
const MEMBER = { id: 'u1', name: 'Jean Kamga', phoneNumber: '+237675090755', email: 'jean@gmail.com' };

import HelpNewTicket from './HelpNewTicket';

function renderForm(route = '/aide/demandes/nouvelle') {
    return renderPage(
        <Routes>
            <Route path="/aide/demandes/nouvelle" element={<HelpNewTicket />} />
            <Route path="/signaler-un-probleme" element={<HelpNewTicket />} />
            <Route path="/signaler-un-probleme/suivi/:id" element={<h1>Conversation sans compte</h1>} />
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
    await user.selectOptions(screen.getByLabelText('Sujet'), 'activation_paiement');
    await user.type(screen.getByLabelText('Titre'), 'Paiement débité deux fois');
    await user.type(screen.getByLabelText('Votre message'), 'J’ai été débité deux fois pour mon pack hier soir.');
}

beforeEach(() => {
    api.supportUploadAttachment.mockReset();
    api.supportCreateTicket.mockReset();
    api.supportPublicTicket.mockReset();
    auth.isAuthenticated = true;
    auth.user = { ...MEMBER };
});

describe('New request', () => {
    it('comes pre-filled from the payment page with the payment reference (cleaned)', async () => {
        renderForm('/aide/demandes/nouvelle?paiement=VZEJd2Rm65Gz%3Cb%3E');
        expect(screen.getByLabelText('Sujet')).toHaveValue('activation_paiement');
        expect(screen.getByLabelText('Titre')).toHaveValue('Mon paiement n’a pas abouti');
        expect((screen.getByLabelText('Votre message') as HTMLTextAreaElement).value).toBe('Référence du paiement : VZEJd2Rm65Gzb\n\n');
    });

    it('asks for a screenshot, and « Signaler un problème » from the packs page comes pre-filled', async () => {
        renderForm('/aide/demandes/nouvelle?categorie=probleme_pack');
        expect(screen.getByText('Ajoutez-y une capture d’écran')).toBeInTheDocument();
        expect(screen.getByLabelText(/Ajouter une capture d’écran/)).toBeInTheDocument();
        expect(screen.getByLabelText('Sujet')).toHaveValue('activation_paiement');
        expect(screen.getByLabelText('Titre')).toHaveValue('Problème avec le choix ou le paiement de mon pack');
    });

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
        await user.upload(screen.getByLabelText(/Ajouter une capture d’écran/), file('notes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2000));
        expect(screen.getByRole('alert')).toHaveTextContent('« notes.docx » n’est pas accepté');
        expect(screen.queryByRole('list', { name: 'Fichiers joints' })).not.toBeInTheDocument();
    });

    it('rejects a file over 10 MB and keeps the good ones', async () => {
        const user = setup();
        renderForm();
        await user.upload(screen.getByLabelText(/Ajouter une capture d’écran/), [
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
        await user.upload(screen.getByLabelText(/Ajouter une capture d’écran/), file('capture.jpg', 'image/jpeg', 500 * 1024));
        await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

        expect(await screen.findByRole('heading', { name: 'Page de la demande' })).toBeInTheDocument();
        expect(api.supportUploadAttachment).toHaveBeenCalledTimes(1);
        expect(api.supportCreateTicket).toHaveBeenCalledWith({
            category: 'activation_paiement',
            subject: 'Paiement débité deux fois',
            message: 'J’ai été débité deux fois pour mon pack hier soir.',
            attachmentIds: ['att1'],
            contact: { name: 'Jean Kamga', phone: '+237675090755', email: 'jean@gmail.com' },
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
        renderForm('/aide/demandes/nouvelle?categorie=verification_identite');
        expect(screen.getByLabelText('Sujet')).toHaveValue('compte_acces');
        expect(screen.getByLabelText('Titre')).toHaveValue('Je n’ai plus accès à mon email ou à mon téléphone');
        expect(screen.getByText(/Ne donnez jamais votre mot de passe/)).toBeInTheDocument();
    });

    it('starts with the member’s name, phone and email from the account, which can be changed', async () => {
        const user = setup();
        api.supportCreateTicket.mockResolvedValue(ok({ _id: 't8', status: 'new' }));
        renderForm();
        expect(screen.getByRole('group', { name: 'Vos coordonnées' })).toBeInTheDocument();
        expect(screen.getByLabelText('Nom complet')).toHaveValue('Jean Kamga');
        expect(screen.getByLabelText('Téléphone')).toHaveValue('+237675090755');
        expect(screen.getByLabelText('Email')).toHaveValue('jean@gmail.com');

        await user.clear(screen.getByLabelText('Téléphone'));
        await user.type(screen.getByLabelText('Téléphone'), '+237 6 99 00 11 22');
        await fillValid(user);
        await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
        await screen.findByRole('heading', { name: 'Page de la demande' });
        expect(api.supportCreateTicket.mock.calls[0][0].contact).toEqual({ name: 'Jean Kamga', phone: '+237 6 99 00 11 22', email: 'jean@gmail.com' });
    });

    it('refuses a contact email that is not valid', async () => {
        const user = setup();
        renderForm();
        await user.clear(screen.getByLabelText('Email'));
        await user.type(screen.getByLabelText('Email'), 'jean@gmail');
        await fillValid(user);
        await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
        expect(screen.getByText('Cette adresse email n’est pas valide.')).toBeInTheDocument();
        expect(api.supportCreateTicket).not.toHaveBeenCalled();
    });

    describe('without an account', () => {
        beforeEach(() => { auth.isAuthenticated = false; auth.user = null; });

        it('asks for name, phone and email, has no file picker, and confirms by email', async () => {
            const user = setup();
            api.supportPublicTicket.mockResolvedValue(ok({ number: 'SUP-000042' }));
            renderForm('/signaler-un-probleme');
            expect(screen.getByRole('heading', { name: 'Signaler un problème' })).toBeInTheDocument();
            expect(screen.getByLabelText('Nom complet')).toHaveValue('');
            expect(screen.queryByLabelText(/Ajouter une capture d’écran/)).toBeNull();

            await fillValid(user);
            await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
            expect(screen.getByText('Indiquez votre nom.')).toBeInTheDocument();
            expect(screen.getByText('Indiquez votre numéro de téléphone.')).toBeInTheDocument();
            expect(screen.getByText(/Indiquez votre adresse email/)).toBeInTheDocument();
            expect(api.supportPublicTicket).not.toHaveBeenCalled();

            await user.type(screen.getByLabelText('Nom complet'), 'Awa Diallo');
            await user.type(screen.getByLabelText('Téléphone'), '+237675090755');
            await user.type(screen.getByLabelText('Email'), 'awa@gmail.com');
            await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

            expect(await screen.findByRole('status')).toHaveTextContent('SUP-000042');
            expect(screen.getByRole('status')).toHaveTextContent('awa@gmail.com');
            expect(api.supportPublicTicket).toHaveBeenCalledWith(expect.objectContaining({
                category: 'activation_paiement', contact: { name: 'Awa Diallo', phone: '+237675090755', email: 'awa@gmail.com' }, website: '',
            }));
            expect(api.supportCreateTicket).not.toHaveBeenCalled();
        });

        it('goes straight into the chat with the agent, and keeps the request’s key on this device', async () => {
            const user = setup();
            localStorage.removeItem('sbcSupportGuestRequests');
            api.supportPublicTicket.mockResolvedValue(ok({ id: 'g1', number: 'SUP-000043', key: 'k'.repeat(43) }));
            renderForm('/signaler-un-probleme');
            await user.type(screen.getByLabelText('Nom complet'), 'Awa Diallo');
            await user.type(screen.getByLabelText('Téléphone'), '+237675090755');
            await user.type(screen.getByLabelText('Email'), 'awa@gmail.com');
            await fillValid(user);
            await user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
            expect(await screen.findByRole('heading', { name: 'Conversation sans compte' })).toBeInTheDocument();
            expect(JSON.parse(localStorage.getItem('sbcSupportGuestRequests')!)[0]).toMatchObject({ id: 'g1', number: 'SUP-000043', key: 'k'.repeat(43) });
        });
    });
});
