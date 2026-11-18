import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { SupportError, TICKET_CATEGORIES, TICKET_PRESETS, idOf, supportErrorText, unwrap, type Ticket } from './support';
import { uploadAttachments } from './attachments';
import AttachmentPicker from './AttachmentPicker';
import { ErrorNote, HelpPage } from './ui';
import { inputCls, primaryBtn } from './styles';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import TurnstileWidget, { turnstileEnabled } from '../../components/common/TurnstileWidget';

const SUBJECT = { min: 5, max: 120 };
const MESSAGE = { min: 20, max: 5000 };

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'category' | 'subject' | 'message', string>>;
type Contact = { name: string; phone: string; email: string };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,200}\.[^\s@]{2,24}$/;

/** Same checks as support-service (services/contact.service.ts). Without an account all three are needed. */
function contactErrors(c: Contact, required: boolean): Errors {
    const e: Errors = {};
    const name = c.name.trim(), phone = c.phone.trim(), email = c.email.trim();
    if (required ? name.length < 2 : name && name.length < 2) e.name = 'Indiquez votre nom.';
    const digits = phone.replace(/\D/g, '');
    if (!phone) { if (required) e.phone = 'Indiquez votre numéro de téléphone.'; }
    else if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 6 || digits.length > 15) e.phone = 'Ce numéro de téléphone n’est pas valide.';
    if (!email) { if (required) e.email = 'Indiquez votre adresse email : la réponse y sera envoyée.'; }
    else if (!EMAIL.test(email)) e.email = 'Cette adresse email n’est pas valide.';
    return e;
}

/** What the account already knows: the member only checks it. */
function contactFromAccount(user: Record<string, unknown> | null | undefined): Contact {
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const name = str(user?.name) || [str(user?.firstName), str(user?.lastName)].filter(Boolean).join(' ');
    return { name, phone: str(user?.phoneNumber), email: str(user?.email) };
}


/**
 * A new request to a human agent: who to reach (prefilled from the account), category,
 * subject, message, photos/PDF. Also open without an account (`/signaler-un-probleme`)
 * for people who cannot sign in: then the contact details are required, there are no
 * files, and the answer comes by email.
 */
export default function HelpNewTicket() {
    const { isAuthenticated, user } = useAuth();
    const guest = !isAuthenticated;
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
    const [contact, setContact] = useState<Contact>(() => contactFromAccount(user));
    const touched = useRef(false);
    const [website, setWebsite] = useState(''); // hidden field: only bots fill it
    const [robotToken, setRobotToken] = useState<string | null>(null);
    const [robotReset, setRobotReset] = useState(0);
    const [sentNumber, setSentNumber] = useState<string | null>(null);

    // The account may load after the page: fill in what the member has not typed over.
    useEffect(() => {
        if (!touched.current && user) setContact(contactFromAccount(user));
    }, [user]);
    const setField = (k: keyof Contact, v: string) => {
        touched.current = true;
        setContact((c) => ({ ...c, [k]: v }));
        setErrors((e) => ({ ...e, [k]: undefined }));
    };

    const validate = (): Errors => {
        const e: Errors = contactErrors(contact, guest);
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
        const who = { name: contact.name.trim(), phone: contact.phone.trim(), email: contact.email.trim() };
        if (guest) {
            if (turnstileEnabled() && !robotToken) { setSubmitError('Patientez un instant : la vérification anti-robot n’est pas terminée.'); return; }
            try {
                setBusy('create');
                const done = unwrap<{ number?: string | null }>(await sbcApiService.supportPublicTicket({
                    category, subject: subject.trim(), message: message.trim(), contact: who, turnstileToken: robotToken ?? undefined, website,
                }));
                setSentNumber(done?.number ?? '');
            } catch (err) {
                setSubmitError(supportErrorText(err, 'ticket'));
                setRobotReset((n) => n + 1);
            } finally {
                setBusy(null);
            }
            return;
        }
        try {
            setBusy('upload');
            const attachmentIds = files.length ? await uploadAttachments(files) : [];
            setBusy('create');
            const ticket = unwrap<Ticket & { ticket?: Ticket }>(await sbcApiService.supportCreateTicket({
                category, subject: subject.trim(), message: message.trim(), attachmentIds,
                contact: who.name || who.phone || who.email ? who : undefined,
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

    if (sentNumber !== null) {
        return (
            <HelpPage title="Demande envoyée" back="/connexion">
                <div role="status" className="rounded-card border border-border bg-surface p-4 text-center">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={40} className="mx-auto text-success" />
                    <h2 className="mt-2 text-base font-semibold text-ink">Votre demande est envoyée{sentNumber ? ` (${sentNumber})` : ''}</h2>
                    <p className="mt-1 text-sm text-ink-2">
                        Un agent de l’équipe SBC vous répondra par email à <strong>{contact.email.trim()}</strong>, ou vous appellera au <strong>{contact.phone.trim()}</strong>.
                        {sentNumber ? ` Gardez le numéro ${sentNumber} : il vous sera demandé.` : ''}
                    </p>
                    <p className="mt-3 text-xs text-ink-3">SBC ne vous demandera jamais votre mot de passe ni vos codes.</p>
                    <Link to="/connexion" className={cn(primaryBtn, 'mt-4')}>Retour à la connexion</Link>
                </div>
            </HelpPage>
        );
    }

    const contactField = (k: keyof Contact, label: string, type: string, autoComplete: string, placeholder: string) => (
        <div>
            <label htmlFor={`ticket-${k}`} className="block text-sm font-medium text-ink mb-1">{label}</label>
            <input id={`ticket-${k}`} type={type} inputMode={k === 'phone' ? 'tel' : undefined} autoComplete={autoComplete} value={contact[k]}
                maxLength={k === 'email' ? 254 : k === 'phone' ? 30 : 80} placeholder={placeholder}
                onChange={(e) => setField(k, e.target.value)}
                aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `ticket-${k}-error` : undefined}
                className={cn(fieldCls(errors[k]), 'h-11')} />
            {errors[k] && <p id={`ticket-${k}-error`} className="mt-1 text-xs text-danger">{errors[k]}</p>}
        </div>
    );

    return (
        <HelpPage title={guest ? 'Signaler un problème' : 'Nouvelle demande'} back={guest ? '/connexion' : '/aide/demandes'}>
            <p className="text-sm text-ink-2">
                {guest
                    ? 'Vous n’arrivez pas à vous connecter ou à créer votre compte ? Décrivez le problème : un agent de l’équipe SBC vous répondra par email.'
                    : 'Un agent de l’équipe SBC lit votre demande et vous répond ici. Vous recevez une notification à chaque réponse.'}
            </p>
            <form onSubmit={submit} noValidate className="space-y-4">
                <fieldset className="space-y-3 rounded-card border border-border bg-surface p-3">
                    <legend className="px-1 text-sm font-semibold text-ink">Vos coordonnées</legend>
                    <p className="text-xs text-ink-3">
                        {guest
                            ? 'Indiquez l’email et le numéro de votre compte SBC si vous en avez un : l’agent pourra le retrouver.'
                            : 'Remplies depuis votre compte. Modifiez-les si vous préférez être contacté autrement.'}
                    </p>
                    {contactField('name', 'Nom complet', 'text', 'name', 'Prénom et nom')}
                    {contactField('phone', 'Téléphone', 'tel', 'tel', 'Ex : +237 6 75 09 07 55')}
                    {contactField('email', 'Email', 'email', 'email', 'Ex : jean@gmail.com')}
                </fieldset>

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
                            {identity || guest
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

                {guest ? (
                    <p className="rounded-tile bg-surface-2 p-3 text-xs text-ink-2">
                        Sans compte, vous ne pouvez pas joindre de capture d’écran ici. Décrivez précisément le message que vous voyez ; l’agent vous dira comment lui envoyer une capture si besoin.
                    </p>
                ) : (
                    <AttachmentPicker files={files} onChange={setFiles} disabled={busy !== null} screenshotPrompt />
                )}

                {guest && (
                    <>
                        {/* Never shown to people: bots fill every field. */}
                        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                            <label>Site web <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" /></label>
                        </div>
                        <TurnstileWidget onToken={setRobotToken} resetKey={robotReset} />
                    </>
                )}

                {submitError && <ErrorNote>{submitError}</ErrorNote>}

                <button type="submit" disabled={busy !== null} className={primaryBtn}>
                    {busy === 'upload' ? 'Envoi des fichiers…' : busy === 'create' ? 'Envoi…' : 'Envoyer ma demande'}
                </button>
            </form>
        </HelpPage>
    );
}
