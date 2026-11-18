import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    AlertCircleIcon, ArrowDown01Icon, ArrowLeft01Icon, Attachment01Icon, Cancel01Icon, Clock01Icon, CustomerSupportIcon,
    LockIcon, MoreVerticalIcon, Pdf01Icon, SentIcon, Tick02Icon, TickDouble02Icon,
} from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { ConfirmSheet } from '../../components/relance/ui/ConfirmSheet';
import {
    ATTACHMENT_ACCEPT, MAX_ATTACHMENTS, SupportError, categoryLabel, checkAttachment, formatSize, idOf, isTicketClosed, messageAuthorName,
    messageText, supportErrorText, ticketRef, ticketStatus, unwrap, type Attachment, type Ticket, type TicketMessage,
} from './support';
import { ATTACHMENT_ONLY_BODY, chatRows, isImage, isReadBySupport, sideOf, timeLabel } from './chat';
import { uploadAttachments } from './attachments';
import { pageFade } from '../../utils/motion';
import { cn } from '../../lib/utils';
import { livePoll, useSupportLive } from './realtime';
import { guestApi } from './guest';

const MAX_REPLY = 5000;

/** A message on its way to the server (shown at once, like in WhatsApp). */
type Pending = { key: string; text: string; files: File[]; previews: string[]; at: string; failed?: string };
type Row = { kind: 'sent'; m: TicketMessage } | { kind: 'pending'; p: Pending };

/** A local preview of a photo being sent (none for a PDF, or where the browser cannot make one). */
const preview = (f: File) => (f.type.startsWith('image/') && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : '');
const release = (u: string) => { if (u && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(u); };

const WALLPAPER = { backgroundColor: '#EFEAE2', backgroundImage: 'radial-gradient(rgba(11,20,26,0.05) 1px, transparent 1px)', backgroundSize: '18px 18px' };

/**
 * One request as a chat with the support, laid out like WhatsApp because that is
 * the chat our members use every day: bubbles, times, ticks (sent, read by the
 * support), photos in the conversation, a message bar at the bottom.
 */
export default function HelpTicket({ guestKey }: {
    /** A request sent without an account, opened with its key (GuestTicketPage). */
    guestKey?: string;
} = {}) {
    const { id = '' } = useParams();
    const queryClient = useQueryClient();
    const key = useMemo(() => (guestKey ? ['support', 'guest', id] : ['support', 'ticket', id]), [id, guestKey]);
    const live = useSupportLive(guestKey ? { ticketId: id, key: guestKey } : null);
    const q = useQuery({
        queryKey: key,
        queryFn: async () => {
            if (guestKey) return guestApi.ticket(id, guestKey);
            const data = unwrap<Ticket & { ticket?: Ticket }>(await sbcApiService.supportTicket(id));
            return data?.ticket ?? data;
        },
        // A LiveKit signal reloads it as soon as the agent replies or reads. Polling is
        // the fallback: every 5 s without the connection, stopped once closed.
        refetchInterval: (query) => (isTicketClosed((query.state.data as Ticket | undefined)?.status) ? false : livePoll(live, 5_000)),
        refetchOnWindowFocus: true,
    });
    const t = q.data;
    const closed = isTicketClosed(t?.status);

    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [fileErrors, setFileErrors] = useState<string[]>([]);
    const [pending, setPending] = useState<Pending[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);
    const [unseen, setUnseen] = useState(0);

    const scroller = useRef<HTMLDivElement>(null);
    const atBottom = useRef(true);
    const shown = useRef(0);
    const textarea = useRef<HTMLTextAreaElement>(null);

    const refreshList = () => void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });

    // ---- sending ----
    const deliver = async (p: Pending) => {
        setPending((ps) => ps.map((x) => (x.key === p.key ? { ...x, failed: undefined } : x)));
        try {
            const attachmentIds = p.files.length ? await uploadAttachments(p.files, guestKey ? (f) => guestApi.upload(id, guestKey, f) : undefined) : [];
            const body = { message: p.text || ATTACHMENT_ONLY_BODY, attachmentIds };
            const data: Ticket & { ticket?: Ticket } = guestKey ? await guestApi.reply(id, guestKey, body) : unwrap<Ticket & { ticket?: Ticket }>(await sbcApiService.supportReply(id, body));
            const fresh = data?.ticket ?? data;
            if (fresh && Array.isArray(fresh.messages)) queryClient.setQueryData(key, fresh);
            else await queryClient.invalidateQueries({ queryKey: key });
            setPending((ps) => ps.filter((x) => x.key !== p.key));
            p.previews.forEach(release);
            refreshList();
        } catch (err) {
            const why = err instanceof SupportError && err.message.startsWith('«') ? err.message : supportErrorText(err);
            setPending((ps) => ps.map((x) => (x.key === p.key ? { ...x, failed: why } : x)));
        }
    };

    const submit = (e?: FormEvent) => {
        e?.preventDefault();
        const message = text.trim();
        if (!message && !files.length) return;
        const p: Pending = {
            key: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: message, files,
            previews: files.map(preview), at: new Date().toISOString(),
        };
        atBottom.current = true;
        setPending((ps) => [...ps, p]);
        setText('');
        setFiles([]);
        setFileErrors([]);
        if (textarea.current) textarea.current.style.height = '';
        void deliver(p);
    };

    const discard = (p: Pending) => {
        p.previews.forEach(release);
        setPending((ps) => ps.filter((x) => x.key !== p.key));
    };

    // Enter sends on a computer; on a phone it makes a new line, like WhatsApp.
    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && window.matchMedia?.('(pointer: fine)').matches) {
            e.preventDefault();
            submit();
        }
    };

    const grow = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    };

    const addFiles = (list: FileList | null) => {
        if (!list) return;
        const next = [...files];
        const problems: string[] = [];
        for (const f of Array.from(list)) {
            const why = checkAttachment(f);
            if (why) problems.push(why);
            else if (next.length >= MAX_ATTACHMENTS) problems.push(`${MAX_ATTACHMENTS} fichiers au maximum par message.`);
            else next.push(f);
        }
        setFileErrors([...new Set(problems)]);
        setFiles(next);
    };

    // ---- closing ----
    const close = async () => {
        setClosing(true);
        setCloseError(null);
        try {
            if (guestKey) await guestApi.close(id, guestKey);
            else unwrap(await sbcApiService.supportCloseTicket(id));
            setConfirmClose(false);
            void queryClient.invalidateQueries({ queryKey: key });
            refreshList();
        } catch (err) {
            setCloseError(supportErrorText(err));
            setConfirmClose(false);
        } finally {
            setClosing(false);
        }
    };

    // ---- conversation rows ----
    const rows = useMemo(() => {
        const items: Row[] = [...(t?.messages ?? []).map((m) => ({ kind: 'sent' as const, m })), ...pending.map((p) => ({ kind: 'pending' as const, p }))];
        return chatRows(
            items,
            (r) => (r.kind === 'sent' ? r.m.createdAt : r.p.at),
            (r) => (r.kind === 'pending' ? 'mine' : `${sideOf(r.m)}:${messageAuthorName(r.m) ?? ''}`),
            (r, i) => (r.kind === 'pending' ? r.p.key : idOf(r.m) || `m${i}`),
        );
    }, [t?.messages, pending]);

    // Stay at the bottom like a chat; if the member scrolled up, count what arrives instead.
    const count = (t?.messages?.length ?? 0) + pending.length;
    useLayoutEffect(() => {
        const el = scroller.current;
        if (!el || !t) return;
        const added = count - shown.current;
        if (shown.current === 0 || atBottom.current) el.scrollTop = el.scrollHeight;
        else if (added > 0) setUnseen((u) => u + added);
        shown.current = count;
    }, [count, t]);

    const onScroll = () => {
        const el = scroller.current;
        if (!el) return;
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (atBottom.current) setUnseen(0);
    };
    const toBottom = () => {
        const el = scroller.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        atBottom.current = true;
        setUnseen(0);
    };
    const onMediaLoad = () => {
        const el = scroller.current;
        if (el && atBottom.current) el.scrollTop = el.scrollHeight;
    };

    useEffect(() => () => pending.forEach((p) => p.previews.forEach(release)), []); // eslint-disable-line react-hooks/exhaustive-deps

    const s = ticketStatus(t?.status);

    return (
        <motion.div variants={pageFade} initial="hidden" animate="show" className="flex h-[100dvh] flex-col bg-bg">
            <ChatHeader
                backTo={guestKey ? '/connexion' : '/aide/demandes'}
                subtitle={t ? `${ticketRef(t)} · ${s.label}` : 'Ma demande'}
                menu={t && !closed ? (
                    <HeaderMenu open={menuOpen} onOpenChange={setMenuOpen}>
                        <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setConfirmClose(true); }}
                            className="w-full px-4 py-3 text-left text-sm text-ink hover:bg-surface-2">
                            Mon problème est réglé : fermer la demande
                        </button>
                    </HeaderMenu>
                ) : null}
            />

            <div className="relative min-h-0 flex-1">
                <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto px-3 py-3" style={WALLPAPER}>
                    {q.isLoading ? (
                        <div className="space-y-3" aria-busy="true" aria-label="Chargement">
                            {[60, 45, 70].map((w, i) => <div key={i} className={cn('h-12 animate-pulse rounded-lg bg-white/70', i % 2 ? 'ml-auto' : '')} style={{ width: `${w}%` }} />)}
                        </div>
                    ) : q.isError || !t ? (
                        <Notice tone="error">
                            {q.error instanceof SupportError && q.error.status === 404 ? 'Cette demande est introuvable.' : supportErrorText(q.error)}{' '}
                            <button type="button" onClick={() => q.refetch()} className="font-semibold underline">Réessayer</button>
                        </Notice>
                    ) : (
                        <>
                            <Notice tone="safety">
                                <HugeiconsIcon icon={LockIcon} size={12} className="mr-1 inline -mt-0.5" />
                                SBC ne vous demandera jamais votre mot de passe ni vos codes, ici ou ailleurs.
                            </Notice>
                            <section aria-label="Résumé de la demande" className="mx-auto my-2 w-fit max-w-[90%] rounded-lg bg-white/90 px-3 py-1.5 text-center shadow-sm">
                                <h2 className="text-sm font-semibold text-ink">{t.subject || categoryLabel(t.category)}</h2>
                                <p className="text-xs text-ink-3">{categoryLabel(t.category)}</p>
                            </section>

                            <ol aria-label="Conversation" className="pb-1">
                                {rows.map((r) => r.kind === 'day' ? (
                                    <li key={r.key} className="sticky top-1 z-10 my-2 flex justify-center">
                                        <span className="rounded-lg bg-white/95 px-3 py-1 text-xs font-medium text-[#54656F] shadow-sm">{r.label}</span>
                                    </li>
                                ) : r.item.kind === 'sent' ? (
                                    <SentMessage key={r.key} m={r.item.m} first={r.first} readAt={t.agentReadAt} onMediaLoad={onMediaLoad} />
                                ) : (
                                    <PendingRow key={r.key} p={r.item.p} first={r.first} onRetry={deliver} onDiscard={discard} />
                                ))}
                            </ol>
                            {closeError && <Notice tone="error">{closeError}</Notice>}
                        </>
                    )}
                </div>
                {unseen > 0 && (
                    <button type="button" onClick={toBottom}
                        className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-semibold text-primary shadow-md">
                        <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
                        {unseen === 1 ? '1 nouveau message' : `${unseen} nouveaux messages`}
                    </button>
                )}
            </div>

            {t && (closed ? (
                <div className="bg-[#F0F2F5] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-sm text-ink-2">
                    Cette demande est fermée.{' '}
                    <Link to={guestKey ? '/signaler-un-probleme' : '/aide/demandes/nouvelle'} className="font-semibold text-primary underline">Créer une nouvelle demande</Link>
                </div>
            ) : (
                <Composer
                    text={text} files={files} fileErrors={fileErrors} textareaRef={textarea}
                    onText={(v, el) => { setText(v); grow(el); }} onKeyDown={onKeyDown} onFiles={addFiles}
                    onRemoveFile={(i) => setFiles((fs) => fs.filter((_, j) => j !== i))} onSubmit={submit}
                />
            ))}

            <ConfirmSheet
                open={confirmClose}
                title="Fermer cette demande ?"
                message="L’agent ne pourra plus y répondre. Si le problème revient, vous pourrez créer une nouvelle demande."
                confirmLabel="Fermer la demande"
                busy={closing}
                onConfirm={close}
                onCancel={() => setConfirmClose(false)}
            />
        </motion.div>
    );
}

function ChatHeader({ subtitle, menu, backTo }: { subtitle: string; menu: ReactNode; backTo: string }) {
    const navigate = useNavigate();
    const goBack = () => {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) navigate(-1);
        else navigate(backTo, { replace: true });
    };
    return (
        <header className="z-20 flex items-center gap-2 border-b border-border bg-surface px-2 py-2">
            <button type="button" onClick={goBack} aria-label="Retour" className="shrink-0 rounded-xl bg-[#94B027] p-2 text-white">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={22} />
            </button>
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <HugeiconsIcon icon={CustomerSupportIcon} size={22} />
            </span>
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold text-ink">Support SBC</h1>
                <p className="truncate text-xs text-ink-3">{subtitle}</p>
            </div>
            {menu}
        </header>
    );
}

function HeaderMenu({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onOpenChange(false); };
        const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
        document.addEventListener('pointerdown', away);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
    }, [open, onOpenChange]);
    return (
        <div ref={ref} className="relative">
            <button type="button" aria-label="Plus d’options" aria-haspopup="menu" aria-expanded={open} onClick={() => onOpenChange(!open)}
                className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2">
                <HugeiconsIcon icon={MoreVerticalIcon} size={20} />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                    {children}
                </div>
            )}
        </div>
    );
}

function Notice({ tone, children }: { tone: 'safety' | 'error'; children: ReactNode }) {
    return (
        <p role={tone === 'error' ? 'alert' : undefined}
            className={cn('mx-auto my-2 w-fit max-w-[90%] rounded-lg px-3 py-1.5 text-center text-xs shadow-sm',
                tone === 'safety' ? 'bg-[#FFF3C4] text-[#54656F]' : 'bg-danger-soft text-danger')}>
            {children}
        </p>
    );
}

function Bubble({ mine, first, children, label }: { mine: boolean; first: boolean; children: ReactNode; label: string }) {
    return (
        <li aria-label={label} className={cn('flex', mine ? 'justify-end' : 'justify-start', first ? 'mt-2' : 'mt-0.5')}>
            <div className={cn(
                'relative max-w-[85%] rounded-lg px-2 pb-1 pt-1.5 text-[15px] leading-snug text-[#111B21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
                mine ? 'bg-[#D9FDD3]' : 'bg-white',
                first && (mine ? 'rounded-tr-none' : 'rounded-tl-none'),
            )}>
                {children}
            </div>
        </li>
    );
}

type TickState = 'sending' | 'sent' | 'read' | 'failed';
function Ticks({ state }: { state: TickState }) {
    const [icon, label, cls] = state === 'sending' ? [Clock01Icon, 'Envoi en cours', ''] as const
        : state === 'failed' ? [AlertCircleIcon, 'Non envoyé', 'text-danger'] as const
            : state === 'read' ? [TickDouble02Icon, 'Lu par le support', 'text-[#53BDEB]'] as const
                : [Tick02Icon, 'Envoyé', ''] as const;
    return <span role="img" aria-label={label} className={cn('inline-flex', cls)}><HugeiconsIcon icon={icon} size={state === 'sending' ? 13 : 16} /></span>;
}

/** Text with its time (and ticks) tucked at the bottom right, as in WhatsApp. */
function TextWithTime({ text, time, ticks }: { text: string; time: string; ticks?: ReactNode }) {
    const stamp = <span className="flex items-center gap-0.5 text-[11px] text-[#667781]">{time}{ticks}</span>;
    if (!text) return <div className="flex justify-end">{stamp}</div>;
    return (
        <p className="whitespace-pre-line break-words px-0.5">
            {text}
            <span aria-hidden="true" className={cn('inline-block', ticks ? 'w-[4.25rem]' : 'w-10')} />
            <span className="absolute bottom-1 right-2">{stamp}</span>
        </p>
    );
}

function Files({ items, onMediaLoad }: { items: { key: string; name: string; size?: number; url?: string | null; image: boolean }[]; onMediaLoad?: () => void }) {
    if (!items.length) return null;
    return (
        <div className="mb-1 space-y-1">
            {items.map((f) => f.image && f.url ? (
                <a key={f.key} href={f.url} target="_blank" rel="noopener noreferrer" className="-mx-1 block overflow-hidden rounded-md">
                    <img src={f.url} alt={f.name} loading="lazy" onLoad={onMediaLoad} className="max-h-72 w-full min-w-48 object-cover" />
                </a>
            ) : (
                <a key={f.key} href={f.url ?? undefined} target="_blank" rel="noopener noreferrer"
                    className="flex min-w-52 items-center gap-2 rounded-md bg-black/5 px-2 py-2 text-sm">
                    <HugeiconsIcon icon={f.image ? Attachment01Icon : Pdf01Icon} size={22} className="shrink-0 text-danger" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    {f.size ? <span className="shrink-0 text-xs text-[#667781]">{formatSize(f.size)}</span> : null}
                </a>
            ))}
        </div>
    );
}

function SentMessage({ m, first, readAt, onMediaLoad }: { m: TicketMessage; first: boolean; readAt?: string | null; onMediaLoad: () => void }) {
    const side = sideOf(m);
    const atts: Attachment[] = m.attachments ?? [];
    const raw = messageText(m);
    const text = atts.length && raw.trim() === ATTACHMENT_ONLY_BODY ? '' : raw;
    if (side === 'system') {
        return <li className="my-2 flex justify-center"><span className="rounded-lg bg-white/90 px-3 py-1 text-xs text-[#54656F] shadow-sm">{raw}</span></li>;
    }
    const mine = side === 'mine';
    const who = mine ? 'Vous' : sideName(m);
    return (
        <Bubble mine={mine} first={first} label={`Message de ${who}`}>
            {!mine && first && <p className="px-0.5 text-[13px] font-semibold text-primary">{who}</p>}
            <Files onMediaLoad={onMediaLoad} items={atts.map((a, i) => ({ key: idOf(a) || String(i), name: a.name ?? a.filename ?? `Pièce jointe ${i + 1}`, size: a.size, url: a.url, image: isImage(a) }))} />
            <TextWithTime text={text} time={timeLabel(m.createdAt)} ticks={mine ? <Ticks state={isReadBySupport(m.createdAt, readAt) ? 'read' : 'sent'} /> : undefined} />
        </Bubble>
    );
}

const sideName = (m: TicketMessage) => {
    const author = typeof m.author === 'object' && m.author ? m.author.type : m.author;
    return author === 'assistant' ? 'Assistant SBC' : messageAuthorName(m) || 'Équipe SBC';
};

function PendingRow({ p, first, onRetry, onDiscard }: { p: Pending; first: boolean; onRetry: (p: Pending) => void; onDiscard: (p: Pending) => void }) {
    return <PendingMessage p={p} first={first} onRetry={() => onRetry(p)} onDiscard={() => onDiscard(p)} />;
}

function PendingMessage({ p, first, onRetry, onDiscard }: { p: Pending; first: boolean; onRetry: () => void; onDiscard: () => void }) {
    return (
        <>
            <Bubble mine first={first} label="Message de Vous">
                <Files items={p.files.map((f, i) => ({ key: `${f.name}-${i}`, name: f.name, size: f.size, url: p.previews[i] || null, image: f.type.startsWith('image/') }))} />
                <TextWithTime text={p.text} time={timeLabel(p.at)} ticks={<Ticks state={p.failed ? 'failed' : 'sending'} />} />
            </Bubble>
            {p.failed && (
                <li className="mt-1 flex justify-end">
                    <div role="alert" className="max-w-[85%] text-right text-xs text-danger">
                        <p>Non envoyé. {p.failed}</p>
                        <p className="mt-0.5 space-x-3">
                            <button type="button" onClick={onRetry} className="font-semibold underline">Réessayer</button>
                            <button type="button" onClick={onDiscard} className="text-ink-3 underline">Supprimer</button>
                        </p>
                    </div>
                </li>
            )}
        </>
    );
}

function Composer({ text, files, fileErrors, textareaRef, onText, onKeyDown, onFiles, onRemoveFile, onSubmit }: {
    text: string; files: File[]; fileErrors: string[]; textareaRef: React.RefObject<HTMLTextAreaElement>;
    onText: (v: string, el: HTMLTextAreaElement) => void; onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
    onFiles: (l: FileList | null) => void; onRemoveFile: (i: number) => void; onSubmit: (e: FormEvent) => void;
}) {
    const inputId = useId();
    const fileInput = useRef<HTMLInputElement>(null);
    const canSend = Boolean(text.trim() || files.length);
    return (
        <div className="bg-[#F0F2F5] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {files.length > 0 && (
                <ul aria-label="Fichiers joints" className="mb-2 flex gap-2 overflow-x-auto pb-1">
                    {files.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex max-w-56 shrink-0 items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-sm text-ink shadow-sm">
                            <HugeiconsIcon icon={f.type === 'application/pdf' ? Pdf01Icon : Attachment01Icon} size={16} className="shrink-0 text-ink-3" />
                            <span className="min-w-0 flex-1 truncate">{f.name}</span>
                            <button type="button" onClick={() => onRemoveFile(i)} aria-label={`Retirer ${f.name}`} className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
                                <HugeiconsIcon icon={Cancel01Icon} size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {fileErrors.length > 0 && (
                <ul role="alert" className="mb-2 space-y-0.5 px-2">
                    {fileErrors.map((e) => <li key={e} className="text-xs text-danger">{e}</li>)}
                </ul>
            )}
            <form onSubmit={onSubmit} noValidate className="flex items-end gap-2">
                <div className="flex min-h-11 flex-1 items-end rounded-3xl bg-white pl-1 pr-3 shadow-sm">
                    <input ref={fileInput} id={inputId} type="file" accept={ATTACHMENT_ACCEPT} multiple className="sr-only"
                        disabled={files.length >= MAX_ATTACHMENTS}
                        onChange={(e) => { onFiles(e.target.files); if (fileInput.current) fileInput.current.value = ''; }} />
                    <label htmlFor={inputId} aria-label="Joindre une photo ou un PDF" title="Photo ou PDF (10 Mo au plus)"
                        className="grid size-11 shrink-0 cursor-pointer place-items-center text-[#54656F] has-[:disabled]:opacity-40">
                        <HugeiconsIcon icon={Attachment01Icon} size={22} />
                    </label>
                    <textarea ref={textareaRef} aria-label="Message" rows={1} value={text} maxLength={MAX_REPLY} placeholder="Message"
                        onChange={(e) => onText(e.target.value, e.target)} onKeyDown={onKeyDown}
                        className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[15px] text-[#111B21] outline-none placeholder:text-[#8696A0]" />
                </div>
                <button type="submit" aria-label="Envoyer" disabled={!canSend}
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-[#94B027] text-white shadow-sm transition-opacity disabled:opacity-50">
                    <HugeiconsIcon icon={SentIcon} size={20} />
                </button>
            </form>
        </div>
    );
}
