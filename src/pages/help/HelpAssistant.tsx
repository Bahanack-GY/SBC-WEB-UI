import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    AiChat02Icon, BookOpen01Icon, CheckmarkCircle02Icon, CustomerSupportIcon, Loading03Icon, SentIcon, Shield01Icon,
} from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { Sheet } from '../../components/relance/ui/Sheet';
import {
    ROUTE_TARGET, ROUTE_TO_CATEGORY, TICKET_CATEGORIES, idOf, isRateLimited, supportErrorText, unwrap,
    type AssistantAnswer,
} from './support';
import { ErrorNote, HelpPage, RichText } from './ui';
import { inputCls, primaryBtn, secondaryBtn } from './styles';
import { cn } from '../../lib/utils';

type Msg =
    | { id: number; role: 'member'; text: string }
    | { id: number; role: 'bot'; answer: AssistantAnswer; question: string; feedback?: 'yes' | 'no' };

const MAX_QUESTION = 500;

/**
 * The assistant, in three levels:
 *  1. an answer from the help centre (FAQ, guided paths),
 *  2. « Ça ne répond pas à ma question » → an AI answer built only from the
 *     published articles it cites,
 *  3. « Parler à un agent » → a ticket with the whole conversation attached.
 * The server strips personal data before the AI sees anything and never lets it
 * act on money or the account; personal questions get a `route` instead.
 */
export default function HelpAssistant() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [input, setInput] = useState(() => (params.get('q') ?? '').slice(0, MAX_QUESTION));
    const [messages, setMessages] = useState<Msg[]>([]);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<{ text: string; limited: boolean } | null>(null);
    const [escalating, setEscalating] = useState(false);
    const nextId = useRef(1);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    }, [messages.length, busy]);

    const ask = async (question: string, level?: 'ai') => {
        setBusy(true);
        setError(null);
        try {
            const answer = unwrap<AssistantAnswer>(await sbcApiService.supportAsk(question, conversationId, level));
            if (answer.conversationId) setConversationId(answer.conversationId);
            setMessages((m) => [...m, { id: nextId.current++, role: 'bot', answer: { ...answer, articles: answer.articles ?? [] }, question }]);
        } catch (e) {
            setError({ text: supportErrorText(e, 'assistant'), limited: isRateLimited(e) });
        } finally {
            setBusy(false);
        }
    };

    const send = (e: React.FormEvent) => {
        e.preventDefault();
        const question = input.trim();
        if (!question || busy) return;
        setMessages((m) => [...m, { id: nextId.current++, role: 'member', text: question }]);
        setInput('');
        void ask(question);
    };

    const setFeedback = (id: number, feedback: 'yes' | 'no') =>
        setMessages((m) => m.map((x) => (x.id === id && x.role === 'bot' ? { ...x, feedback } : x)));

    const notAnswered = (msg: Extract<Msg, { role: 'bot' }>) => {
        setFeedback(msg.id, 'no');
        void ask(msg.question, 'ai');
    };

    const last = [...messages].reverse().find((m): m is Extract<Msg, { role: 'bot' }> => m.role === 'bot');
    const defaultCategory = last?.answer.route ? ROUTE_TO_CATEGORY[last.answer.route] : 'other';

    return (
        <HelpPage title="Assistant">
            <div className="flex items-start gap-2 rounded-tile bg-primary-soft p-3 text-xs text-ink-2">
                <HugeiconsIcon icon={Shield01Icon} size={18} className="text-primary shrink-0" />
                <p>
                    L’assistant ne voit jamais vos données personnelles : numéros, emails, montants et références sont retirés
                    avant qu’il lise votre question. Il ne peut rien faire sur votre argent ni sur votre compte. N’écrivez
                    jamais votre mot de passe ou un code reçu.
                </p>
            </div>

            <div role="log" aria-live="polite" aria-label="Conversation avec l’assistant" className="space-y-3">
                {messages.length === 0 && (
                    <p className="text-sm text-ink-2">
                        Posez votre question avec vos mots, par exemple : « Comment inviter un filleul ? » ou
                        « Combien de temps prend un retrait ? »
                    </p>
                )}
                {messages.map((m) =>
                    m.role === 'member' ? (
                        <div key={m.id} className="flex justify-end">
                            <p className="max-w-[85%] rounded-card rounded-br-md bg-primary px-3 py-2 text-sm text-white whitespace-pre-line">{m.text}</p>
                        </div>
                    ) : (
                        <BotBubble
                            key={m.id}
                            msg={m}
                            isLast={m === last && !busy}
                            onYes={() => setFeedback(m.id, 'yes')}
                            onNo={() => notAnswered(m)}
                            onAgent={() => setEscalating(true)}
                        />
                    ),
                )}
                {busy && (
                    <p className="flex items-center gap-2 text-sm text-ink-3">
                        <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" /> L’assistant cherche une réponse…
                    </p>
                )}
                {error && (
                    <div className="space-y-2">
                        <ErrorNote>{error.text}</ErrorNote>
                        {error.limited && (
                            <Link to="/aide/demandes/nouvelle" className={secondaryBtn}>
                                <HugeiconsIcon icon={CustomerSupportIcon} size={18} /> Écrire à un agent
                            </Link>
                        )}
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <form onSubmit={send} className="sticky bottom-0 bg-bg pt-2 pb-3 flex items-end gap-2">
                <label htmlFor="assistant-question" className="sr-only">Votre question</label>
                <textarea
                    id="assistant-question"
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_QUESTION))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
                    rows={2}
                    placeholder="Votre question…"
                    className={cn(inputCls, 'py-2 resize-none flex-1')}
                />
                <button type="submit" disabled={busy || !input.trim()} aria-label="Envoyer la question"
                    className="size-11 shrink-0 grid place-items-center rounded-pill bg-primary text-white disabled:opacity-50">
                    <HugeiconsIcon icon={SentIcon} size={20} />
                </button>
            </form>

            {conversationId && (
                <EscalateSheet
                    open={escalating}
                    conversationId={conversationId}
                    defaultCategory={defaultCategory}
                    onClose={() => setEscalating(false)}
                    onDone={(ticketId) => {
                        void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
                        navigate(ticketId ? `/aide/demandes/${encodeURIComponent(ticketId)}` : '/aide/demandes');
                    }}
                />
            )}
        </HelpPage>
    );
}

function BotBubble({ msg, isLast, onYes, onNo, onAgent }: {
    msg: Extract<Msg, { role: 'bot' }>; isLast: boolean; onYes: () => void; onNo: () => void; onAgent: () => void;
}) {
    const { answer, feedback } = msg;
    const route = answer.route ? ROUTE_TARGET[answer.route] : null;
    const isAi = answer.source === 'ai';
    return (
        <div className="flex">
            <div className="max-w-[92%] rounded-card rounded-bl-md bg-surface border border-border px-3 py-2 space-y-2">
                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                    <HugeiconsIcon icon={isAi ? AiChat02Icon : BookOpen01Icon} size={14} />
                    {isAi ? 'Réponse de l’assistant IA' : 'Réponse de l’aide SBC'}
                </p>
                <RichText text={answer.answer ?? ''} />
                {isAi && <p className="text-[11px] text-ink-3">Réponse rédigée à partir des articles ci-dessous. En cas de doute, ce sont eux qui font foi.</p>}
                {answer.articles.length > 0 && (
                    <ul aria-label={isAi ? 'Articles cités' : 'À lire'} className="space-y-1">
                        {answer.articles.map((a) => (
                            <li key={a.slug}>
                                <Link to={`/aide/articles/${encodeURIComponent(a.slug)}`} className="inline-flex items-center gap-1 text-sm text-primary underline">
                                    <HugeiconsIcon icon={BookOpen01Icon} size={14} /> {a.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
                {route && (
                    <Link to={route.to} className={primaryBtn}>{route.label}</Link>
                )}
                {isLast && !feedback && (
                    <div className="flex flex-col gap-2 pt-1">
                        <button type="button" onClick={onYes} className={secondaryBtn}>
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} /> Ça répond à ma question
                        </button>
                        {answer.source === 'faq' ? (
                            <button type="button" onClick={onNo} className={secondaryBtn}>Ça ne répond pas à ma question</button>
                        ) : answer.canEscalate ? (
                            <button type="button" onClick={onAgent} className={secondaryBtn}>
                                <HugeiconsIcon icon={CustomerSupportIcon} size={18} /> Parler à un agent
                            </button>
                        ) : (
                            <Link to="/aide/demandes/nouvelle" className={secondaryBtn}>
                                <HugeiconsIcon icon={CustomerSupportIcon} size={18} /> Écrire à un agent
                            </Link>
                        )}
                    </div>
                )}
                {feedback === 'yes' && <p className="text-xs text-success">Merci ! Bonne continuation sur SBC.</p>}
            </div>
        </div>
    );
}

function EscalateSheet({ open, conversationId, defaultCategory, onClose, onDone }: {
    open: boolean; conversationId: string; defaultCategory: string; onClose: () => void; onDone: (ticketId: string) => void;
}) {
    const [category, setCategory] = useState(defaultCategory);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => { if (open) { setCategory(defaultCategory); setError(null); } }, [open, defaultCategory]);

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            const data = unwrap<{ ticketId?: string; ticket?: { _id?: string; id?: string }; _id?: string; id?: string }>(
                await sbcApiService.supportEscalate(conversationId, category));
            onDone(data?.ticketId || idOf(data?.ticket) || idOf(data));
        } catch (e) {
            setError(supportErrorText(e, 'ticket'));
            setBusy(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Parler à un agent"
            footer={
                <button type="button" onClick={submit} disabled={busy} className={primaryBtn}>
                    {busy ? 'Envoi…' : 'Envoyer à un agent'}
                </button>
            }
        >
            <p className="text-sm text-ink-2 mb-3">
                Une demande est créée avec cette conversation : l’agent la lit, vous n’avez rien à répéter. Vous suivez sa
                réponse dans « Mes demandes ».
            </p>
            <fieldset>
                <legend className="text-sm font-semibold text-ink mb-2">Sujet de la demande</legend>
                <div className="space-y-1">
                    {TICKET_CATEGORIES.map((c) => (
                        <label key={c.value} className="flex items-center gap-3 rounded-tile px-2 py-2 text-sm text-ink has-[:checked]:bg-primary-soft">
                            <input type="radio" name="escalate-category" value={c.value} checked={category === c.value}
                                onChange={() => setCategory(c.value)} className="accent-primary size-4" />
                            {c.label}
                        </label>
                    ))}
                </div>
            </fieldset>
            {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
        </Sheet>
    );
}
