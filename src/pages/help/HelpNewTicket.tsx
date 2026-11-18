import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { SupportError, TICKET_CATEGORIES, TICKET_PRESETS, idOf, supportErrorText, unwrap, type Ticket } from './support';
import { uploadAttachments } from './attachments';
import AttachmentPicker from './AttachmentPicker';
import { ErrorNote, HelpPage } from './ui';
import { inputCls, primaryBtn } from './styles';
import { cn } from '../../lib/utils';

const SUBJECT = { min: 5, max: 120 };
const MESSAGE = { min: 20, max: 5000 };

type Errors = Partial<Record<'category' | 'subject' | 'message', string>>;


/** A new request to a human agent: category, subject, message, photos/PDF. */
export default function HelpNewTicket() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    // ?categorie= is a preset (activation, retrait, verification_identite) or a category key.
    const asked = params.get('categorie') ?? '';
    const preset = TICKET_PRESETS[asked];
    const identity = !!preset?.identity;
    const [category, setCategory] = useState(preset?.category ?? (TICKET_CATEGORIES.some((c) => c.value === asked) ? asked : ''));
    const [subject, setSubject] = useState(preset?.subject ?? '');
    const [message, setMessage] = useState(() => (params.get('retrait') ? `Référence du retrait : ${params.get('retrait')}\n\n` : ''));
    const [files, setFiles] = useState<File[]>([]);
    const [errors, setErrors] = useState<Errors>({});
    const [busy, setBusy] = useState<'upload' | 'create' | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const validate = (): Errors => {
        const e: Errors = {};
        if (!category) e.category = 'Choisissez le sujet de votre demande.';
        const s = subject.trim();
        if (s.length < SUBJECT.min) e.subject = `Donnez un titre d’au moins ${SUBJECT.min} caractères.`;
        else if (s.length > SUBJECT.max) e.subject = `Le titre fait ${SUBJECT.max} caractères au maximum.`;
        const m = message.trim();
        if (m.length < MESSAGE.min) e.message = `Expliquez votre problème en quelques phrases (au moins ${MESSAGE.min} caractères).`;
        else if (m.length > MESSAGE.max) e.message = `Le message fait ${MESSAGE.max} caractères au maximum.`;
        return e;
    };

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (busy) return;
        const e = validate();
        setErrors(e);
        setSubmitError(null);
        if (Object.keys(e).length > 0) {
            document.getElementById(`ticket-${Object.keys(e)[0]}`)?.focus();
            return;
        }
        try {
            setBusy('upload');
            const attachmentIds = files.length ? await uploadAttachments(files) : [];
            setBusy('create');
            const ticket = unwrap<Ticket & { ticket?: Ticket }>(await sbcApiService.supportCreateTicket({
                category, subject: subject.trim(), message: message.trim(), attachmentIds,
            }));
            void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
            const id = idOf(ticket?.ticket) || idOf(ticket);
            navigate(id ? `/aide/demandes/${encodeURIComponent(id)}` : '/aide/demandes', { replace: true });
        } catch (err) {
            // An upload failure already names the file; anything else is about the request.
            setSubmitError(err instanceof SupportError && err.message.startsWith('«') ? err.message : supportErrorText(err, 'ticket'));
            setBusy(null);
        }
    };

    const fieldCls = (bad?: string) => cn(inputCls, bad && 'border-danger');

    return (
        <HelpPage title="Nouvelle demande" back="/aide/demandes">
            <p className="text-sm text-ink-2">Un agent de l’équipe SBC lit votre demande et vous répond ici. Vous recevez une notification à chaque réponse.</p>
            <form onSubmit={submit} noValidate className="space-y-4">
                <div>
                    <label htmlFor="ticket-category" className="block text-sm font-medium text-ink mb-1">Sujet</label>
                    <select id="ticket-category" value={category} onChange={(e) => { setCategory(e.target.value); setErrors({ ...errors, category: undefined }); }}
                        aria-invalid={!!errors.category} aria-describedby={errors.category ? 'ticket-category-error' : undefined}
                        className={cn(fieldCls(errors.category), 'h-11')}>
                        <option value="">Choisir…</option>
                        {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {errors.category && <p id="ticket-category-error" className="mt-1 text-xs text-danger">{errors.category}</p>}
                </div>

                {(identity || category === 'compte_acces') && (
                    <div className="flex items-start gap-2 rounded-tile bg-accent-soft p-3 text-xs text-ink-2">
                        <HugeiconsIcon icon={InformationCircleIcon} size={18} className="text-accent shrink-0" />
                        <p>
                            {identity
                                ? 'Dites ce qui a changé (email, numéro, ou les deux) et le nouveau contact à utiliser. L’agent vous indiquera les justificatifs à fournir. '
                                : 'Pour changer vous-même votre email ou votre numéro, utilisez plutôt « Changer mon email ou téléphone » dans l’aide. '}
                            Ne donnez jamais votre mot de passe ni un code reçu.
                        </p>
                    </div>
                )}

                <div>
                    <label htmlFor="ticket-subject" className="block text-sm font-medium text-ink mb-1">Titre</label>
                    <input id="ticket-subject" value={subject} maxLength={SUBJECT.max}
                        onChange={(e) => { setSubject(e.target.value); setErrors({ ...errors, subject: undefined }); }}
                        aria-invalid={!!errors.subject} aria-describedby={errors.subject ? 'ticket-subject-error' : undefined}
                        placeholder="En quelques mots" className={cn(fieldCls(errors.subject), 'h-11')} />
                    {errors.subject && <p id="ticket-subject-error" className="mt-1 text-xs text-danger">{errors.subject}</p>}
                </div>

                <div>
                    <label htmlFor="ticket-message" className="block text-sm font-medium text-ink mb-1">Votre message</label>
                    <textarea id="ticket-message" value={message} rows={6} maxLength={MESSAGE.max}
                        onChange={(e) => { setMessage(e.target.value); setErrors({ ...errors, message: undefined }); }}
                        aria-invalid={!!errors.message} aria-describedby={errors.message ? 'ticket-message-error' : undefined}
                        placeholder="Que s’est-il passé ? Quand ? Qu’avez-vous déjà essayé ?" className={cn(fieldCls(errors.message), 'py-2')} />
                    {errors.message && <p id="ticket-message-error" className="mt-1 text-xs text-danger">{errors.message}</p>}
                </div>

                <AttachmentPicker files={files} onChange={setFiles} disabled={busy !== null} screenshotPrompt />

                {submitError && <ErrorNote>{submitError}</ErrorNote>}

                <button type="submit" disabled={busy !== null} className={primaryBtn}>
                    {busy === 'upload' ? 'Envoi des fichiers…' : busy === 'create' ? 'Envoi…' : 'Envoyer ma demande'}
                </button>
            </form>
        </HelpPage>
    );
}
