import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Attachment01Icon, SentIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { ConfirmSheet } from '../../components/relance/ui/ConfirmSheet';
import {
    SupportError, categoryLabel, dateTimeFr, idOf, isTicketClosed, messageAuthor, messageAuthorName, messageText, supportErrorText,
    ticketRef, ticketStatus, unwrap, type Ticket, type TicketMessage,
} from './support';
import { uploadAttachments } from './attachments';
import AttachmentPicker from './AttachmentPicker';
import { ErrorNote, HelpPage, Pill, Skeletons } from './ui';
import { inputCls, primaryBtn, secondaryBtn } from './styles';
import { cn } from '../../lib/utils';

const MAX_REPLY = 5000;

/** One request: the conversation with the agent, a reply box, and « Fermer ». */
export default function HelpTicket() {
    const { id = '' } = useParams();
    const queryClient = useQueryClient();
    const key = ['support', 'ticket', id];
    const q = useQuery({
        queryKey: key,
        queryFn: async () => {
            const data = unwrap<Ticket & { ticket?: Ticket }>(await sbcApiService.supportTicket(id));
            return data?.ticket ?? data;
        },
        // New agent replies show up while the screen is open.
        refetchInterval: 30_000,
    });
    const t = q.data;

    const [reply, setReply] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);
    const [confirmClose, setConfirmClose] = useState(false);
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);

    const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: key });
        void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    };

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        const message = reply.trim();
        if (!message) { setReplyError('Écrivez votre message avant de l’envoyer.'); return; }
        setBusy(true);
        setReplyError(null);
        try {
            const attachmentIds = files.length ? await uploadAttachments(files) : [];
            unwrap(await sbcApiService.supportReply(id, { message, attachmentIds }));
            setReply('');
            setFiles([]);
            refresh();
        } catch (err) {
            setReplyError(err instanceof SupportError && err.message.startsWith('«') ? err.message : supportErrorText(err));
        } finally {
            setBusy(false);
        }
    };

    const close = async () => {
        setClosing(true);
        setCloseError(null);
        try {
            unwrap(await sbcApiService.supportCloseTicket(id));
            setConfirmClose(false);
            refresh();
        } catch (err) {
            setCloseError(supportErrorText(err));
            setConfirmClose(false);
        } finally {
            setClosing(false);
        }
    };

    const closed = isTicketClosed(t?.status);
    const s = ticketStatus(t?.status);

    return (
        <HelpPage title={t ? `Demande ${ticketRef(t)}` : 'Ma demande'} back="/aide/demandes">
            {q.isLoading ? (
                <Skeletons count={3} height="h-20" />
            ) : q.isError || !t ? (
                <ErrorNote onRetry={() => q.refetch()}>
                    {q.error instanceof SupportError && q.error.status === 404 ? 'Cette demande est introuvable.' : supportErrorText(q.error)}
                </ErrorNote>
            ) : (
                <>
                    <section aria-label="Résumé de la demande" className="bg-surface border border-border rounded-card p-4">
                        <h2 className="text-base font-semibold text-ink">{t.subject || categoryLabel(t.category)}</h2>
                        <p className="mt-1 text-xs text-ink-3">{[categoryLabel(t.category), dateTimeFr(t.createdAt)].filter(Boolean).join(' · ')}</p>
                        <p className="mt-2"><Pill tone={s.tone}>{s.label}</Pill></p>
                    </section>

                    <ol aria-label="Conversation" className="space-y-3">
                        {(t.messages ?? []).map((m, i) => <Message key={idOf(m) || i} m={m} />)}
                    </ol>

                    {closeError && <ErrorNote>{closeError}</ErrorNote>}

                    {closed ? (
                        <div className="rounded-tile bg-surface-2 p-3 text-sm text-ink-2 text-center">
                            Cette demande est fermée.{' '}
                            <Link to="/aide/demandes/nouvelle" className="text-primary underline">Créer une nouvelle demande</Link>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={send} noValidate className="space-y-2 bg-surface border border-border rounded-card p-3">
                                <label htmlFor="ticket-reply" className="block text-sm font-medium text-ink">Répondre</label>
                                <textarea id="ticket-reply" rows={3} value={reply} maxLength={MAX_REPLY}
                                    onChange={(e) => { setReply(e.target.value); setReplyError(null); }}
                                    placeholder="Votre message à l’agent…" className={cn(inputCls, 'py-2')} />
                                <AttachmentPicker files={files} onChange={setFiles} disabled={busy} />
                                {replyError && <ErrorNote>{replyError}</ErrorNote>}
                                <button type="submit" disabled={busy} className={primaryBtn}>
                                    <HugeiconsIcon icon={SentIcon} size={18} /> {busy ? 'Envoi…' : 'Envoyer'}
                                </button>
                            </form>
                            <button type="button" onClick={() => setConfirmClose(true)} className={secondaryBtn}>
                                Mon problème est réglé : fermer la demande
                            </button>
                        </>
                    )}
                </>
            )}
            <ConfirmSheet
                open={confirmClose}
                title="Fermer cette demande ?"
                message="L’agent ne pourra plus y répondre. Si le problème revient, vous pourrez créer une nouvelle demande."
                confirmLabel="Fermer la demande"
                busy={closing}
                onConfirm={close}
                onCancel={() => setConfirmClose(false)}
            />
        </HelpPage>
    );
}

function Message({ m }: { m: TicketMessage }) {
    const author = messageAuthor(m);
    if (author === 'system') {
        return <li className="text-center text-xs text-ink-3">{messageText(m)} {m.createdAt && `· ${dateTimeFr(m.createdAt)}`}</li>;
    }
    const mine = author === 'member';
    const who = mine ? 'Vous' : author === 'assistant' ? 'Assistant' : messageAuthorName(m) || 'Équipe SBC';
    return (
        <li className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[88%] rounded-card px-3 py-2', mine ? 'bg-primary-soft rounded-br-md' : 'bg-surface border border-border rounded-bl-md')}>
                <p className="text-[11px] font-semibold text-ink-3">{who}{m.createdAt && ` · ${dateTimeFr(m.createdAt)}`}</p>
                <p className="mt-1 text-sm text-ink whitespace-pre-line break-words">{messageText(m)}</p>
                {(m.attachments ?? []).length > 0 && (
                    <ul className="mt-2 space-y-1">
                        {m.attachments!.map((a, i) => {
                            const name = a.name ?? a.filename ?? `Pièce jointe ${i + 1}`;
                            return (
                                <li key={idOf(a) || i} className="flex items-center gap-1 text-xs">
                                    <HugeiconsIcon icon={Attachment01Icon} size={14} className="text-ink-3" />
                                    {a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{name}</a> : <span className="text-ink-2">{name}</span>}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </li>
    );
}
