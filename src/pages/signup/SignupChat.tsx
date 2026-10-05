import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAffiliation } from '../../contexts/AffiliationContext';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse, removeAccents } from '../../utils/apiHelpers';
import { clearSignupCache } from '../../utils/signupHelpers';
import { safeRecoveryApiCall } from '../../utils/recoveryHelpers';
import { allAfricanCountries, regionsPerCountry } from '../../utils/countriesData';
import { professionOptions, predefinedInterestOptions, getInterestBaseValue } from '../ModifierLeProfil';
import RecoveryCompletedNotification from '../../components/RecoveryCompletedNotification';
import {
    ChipsComposer, DateComposer, ListComposer, MultiComposer, OtpComposer, PasswordComposer, PhoneComposer, TextComposer,
} from './ChatComposers';
import {
    EMPTY_ANSWERS, clearDraft, countryByValue, displayPhone, findCountry, firstName, fullPhone, loadDraft, parsePhone, saveDraft,
    validateBirthDate, validateConfirmation, validateEmail, validateName, validatePassword,
    type ProfileAnswers, type SignupAnswers,
} from './signupChatLogic';

/**
 * Account creation as a conversation: the assistant asks one thing at a time,
 * the member types or taps an answer. It asks exactly what the old form and
 * the profile-completion page asked, with the same checks and the same API
 * calls (the old form stays at /signup/formulaire):
 *  - sign-up: name, country, WhatsApp number (dial code), e-mail, password ×2,
 *    sponsor code (unless the invitation link gave it), terms; existing
 *    e-mail/number refused early, recoverable old accounts announced;
 *  - the verification code, with resend (e-mail or WhatsApp) and the server's
 *    cooldown;
 *  - the optional profile: sex, birth date, region, profession, language,
 *    interests — any question can be skipped.
 * Any answer can be changed by tapping it until the account is created. A
 * reload resumes where it stopped (the password is never stored).
 */

type Step =
    | 'name' | 'country' | 'phone' | 'email' | 'password' | 'confirm' | 'sponsor' | 'terms' | 'review'
    | 'otp' | 'profileIntro' | 'sex' | 'birthDate' | 'region' | 'profession' | 'language' | 'interests' | 'done';

const SIGNUP: Step[] = ['name', 'country', 'phone', 'email', 'password', 'confirm', 'sponsor', 'terms'];
const PROFILE: Step[] = ['sex', 'birthDate', 'region', 'profession', 'language', 'interests'];
const EDITABLE: Step[] = ['name', 'country', 'phone', 'email', 'password', 'sponsor'];
const LABEL: Partial<Record<Step, string>> = {
    name: 'nom', country: 'pays', phone: 'numéro WhatsApp', email: 'e-mail', password: 'mot de passe', sponsor: 'code parrain',
};
const PENDING_KEY = 'signupChatPending';
const RESEND_COOLDOWN = 60;

interface Msg { id: number; from: 'bot' | 'me'; content: ReactNode; step?: Step; tone?: 'error' | 'success' }
interface Quick { label: string; run: () => void }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const formatWait = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const COUNTRY_OPTIONS = allAfricanCountries.map((c) => ({ value: c.value, label: `${c.flag} ${c.value}` }));

export default function SignupChat({ pace = 450 }: { pace?: number }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, verifyOtp, updateProfile } = useAuth();
    const { affiliationCode } = useAffiliation();

    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [step, setStep] = useState<Step | null>(null);
    const [typing, setTyping] = useState(false);
    const [busy, setBusy] = useState(false);
    const [quick, setQuick] = useState<Quick[]>([]);
    const [answers, setAnswers] = useState<SignupAnswers>(EMPTY_ANSWERS);
    const [resendIn, setResendIn] = useState(0);
    const [recovery, setRecovery] = useState<ComponentProps<typeof RecoveryCompletedNotification>['recoveryData'] | null>(null);

    const answersRef = useRef<SignupAnswers>(EMPTY_ANSWERS);
    const doneRef = useRef<Set<Step>>(new Set());
    const profileRef = useRef<ProfileAnswers>({});
    const editingRef = useRef<Step | null>(null);
    const sponsorRef = useRef<{ code: string; name: string; locked: boolean } | null>(null);
    const pendingRef = useRef<{ userId: string; email: string; phone: string } | null>(null);
    const idRef = useRef(0);
    const started = useRef(false);
    const endRef = useRef<HTMLDivElement>(null);

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => handleApiResponse(await sbcApiService.getAppSettings()),
        staleTime: 5 * 60_000, retry: 1,
    });
    const termsUrl = settings?.termsAndConditionsPdf?.fileId ? sbcApiService.generateSettingsFileUrl(settings.termsAndConditionsPdf.fileId) : undefined;

    useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [msgs, typing, step, quick]);
    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    // ---------- conversation primitives ----------
    const push = (m: Omit<Msg, 'id'>) => setMsgs((list) => [...list, { ...m, id: ++idRef.current }]);
    const bot = useCallback(async (...lines: Array<ReactNode | { content: ReactNode; tone: Msg['tone'] }>) => {
        for (const line of lines) {
            setTyping(true);
            await sleep(pace);
            setTyping(false);
            const isObj = typeof line === 'object' && line !== null && 'tone' in (line as object);
            push(isObj ? { from: 'bot', ...(line as { content: ReactNode; tone: Msg['tone'] }) } : { from: 'bot', content: line as ReactNode });
        }
    }, [pace]);
    const error = (text: ReactNode) => bot({ content: text, tone: 'error' });
    const me = (content: ReactNode, s?: Step) => push({ from: 'me', content, step: s });

    const setA = (patch: Partial<SignupAnswers>) => {
        answersRef.current = { ...answersRef.current, ...patch };
        setAnswers(answersRef.current);
    };
    const markDone = (s: Step) => {
        doneRef.current.add(s);
        saveDraft(answersRef.current, [...doneRef.current]);
    };

    const skipped = (s: Step) => (s === 'sponsor' && !!sponsorRef.current?.locked);
    const nextSignupStep = (): Step => SIGNUP.find((s) => !doneRef.current.has(s) && !skipped(s)) ?? 'review';

    // ---------- prompts ----------
    const ask = async (s: Step) => {
        setStep(null);
        setQuick([]);
        const a = answersRef.current;
        const fn = firstName(a.name);
        switch (s) {
            case 'name':
                await bot('Pour commencer, quel est votre nom complet ?');
                setQuick([{ label: 'J’ai déjà un compte', run: () => navigate('/connexion') }]);
                break;
            case 'country': await bot(fn ? `Enchanté(e), ${fn} ! Dans quel pays vivez-vous ?` : 'Dans quel pays vivez-vous ?'); break;
            case 'phone': await bot('Quel est votre numéro WhatsApp ? Vous pouvez changer l’indicatif si votre numéro est d’un autre pays.'); break;
            case 'email': await bot('Quelle est votre adresse e-mail ? Votre code de vérification y sera envoyé.'); break;
            case 'password': await bot('Choisissez un mot de passe (au moins 8 caractères).'); break;
            case 'confirm': await bot('Retapez-le pour être sûr qu’il n’y a pas de faute de frappe.'); break;
            case 'sponsor': await bot('Quel est le code de votre parrain ? Il figure dans le lien ou le message d’invitation reçu.'); break;
            case 'terms':
                await bot(<>Dernière question : acceptez-vous les <TermsLink url={termsUrl} /> de SBC ?</>);
                break;
            case 'review': await showReview(); return;
            case 'sex': await bot('Vous êtes…'); break;
            case 'birthDate': await bot('Quelle est votre date de naissance ?'); break;
            case 'region': await bot('Dans quelle région habitez-vous ?'); break;
            case 'profession': await bot('Quelle est votre profession ?'); break;
            case 'language': await bot('Quelle langue préférez-vous ?'); break;
            case 'interests': await bot('Pour finir, quels sont vos centres d’intérêt ? Choisissez-en autant que vous voulez.'); break;
            default: break;
        }
        setStep(s);
    };

    const showReview = async () => {
        editingRef.current = null;
        const a = answersRef.current;
        const sp = sponsorRef.current;
        const rows: Array<[Step, string, string]> = [
            ['name', 'Nom', a.name],
            ['country', 'Pays', `${countryByValue(a.country)?.flag ?? ''} ${a.country}`],
            ['phone', 'WhatsApp', displayPhone(a)],
            ['email', 'E-mail', a.email],
            ['password', 'Mot de passe', '••••••••'],
            ['sponsor', 'Parrain', sp?.name ? `${sp.name} (${sp.code})` : a.sponsor],
        ];
        await bot(
            <div className="space-y-2">
                <p>Voici le récapitulatif. Touchez une ligne pour la modifier.</p>
                <dl className="rounded-tile bg-bg divide-y divide-border">
                    {rows.map(([s, k, v]) => (
                        <button key={s} type="button" onClick={() => edit(s)} disabled={s === 'sponsor' && !!sp?.locked}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left disabled:cursor-default">
                            <span className="min-w-0"><dt className="text-xs text-ink-3">{k}</dt><dd className="text-sm text-ink break-all">{v}</dd></span>
                            {!(s === 'sponsor' && sp?.locked) && <HugeiconsIcon icon={PencilEdit02Icon} size={16} className="shrink-0 text-ink-3" />}
                        </button>
                    ))}
                </dl>
            </div>,
        );
        setStep('review');
    };

    const edit = (s: Step) => {
        if (pendingRef.current || busy || !EDITABLE.includes(s)) return;
        editingRef.current = s;
        doneRef.current.delete(s);
        if (s === 'password') doneRef.current.delete('confirm');
        void (async () => {
            await bot(`D’accord, modifions votre ${LABEL[s]}.`);
            await ask(s);
        })();
    };

    const advance = async () => {
        const s = editingRef.current;
        // Editing the password needs its confirmation; anything else goes back to the summary.
        if (s && s !== 'password') { await ask('review'); return; }
        if (s === 'password' && doneRef.current.has('confirm')) { await ask('review'); return; }
        await ask(nextSignupStep());
    };

    // ---------- existence / recovery checks (same endpoints as the form) ----------
    /** null when free; otherwise a refusal already said in the chat. */
    const checkTaken = async (kind: 'email' | 'phone', value: string): Promise<'taken' | 'error' | null> => {
        try {
            const res = await sbcApiService.checkUserExistence(kind === 'email' ? { email: value } : { phoneNumber: value });
            if (handleApiResponse(res)?.exists) return 'taken';
        } catch (e) {
            await error(errText(e, 'Je n’arrive pas à vérifier pour le moment. Vérifiez votre connexion et réessayez.'));
            return 'error';
        }
        // A pending recovery (transactions from an old account) is good news; a 409 means the account exists.
        const a = answersRef.current;
        const rec = await safeRecoveryApiCall(() => sbcApiService.checkRecoveryRegistration(
            kind === 'email' ? value : a.email, kind === 'phone' ? value : (a.phone ? fullPhone(a) : undefined)));
        if (rec) {
            if (sbcApiService.parseConflictError(rec)) return 'taken';
            try {
                const data = handleApiResponse(rec);
                if (data?.hasPendingRecoveries) {
                    const n = data.recoveryDetails?.totalTransactions || 0;
                    const amount = data.recoveryDetails?.totalAmount || 0;
                    await bot({ content: `Bonne nouvelle : nous avons retrouvé un ancien compte lié à ${kind === 'email' ? 'cette adresse' : 'ce numéro'} (${n} transaction${n > 1 ? 's' : ''}, ${amount} XAF). Il sera récupéré à la création de votre compte.`, tone: 'success' });
                }
            } catch { /* recovery is best-effort, as in the form */ }
        }
        return null;
    };

    const refuseTaken = async (kind: 'email' | 'phone') => {
        await error(kind === 'email'
            ? 'Cette adresse e-mail est déjà utilisée par un compte SBC.'
            : 'Ce numéro WhatsApp est déjà associé à un compte SBC.');
        await bot(kind === 'email' ? 'Connectez-vous, ou donnez une autre adresse.' : 'Connectez-vous, ou donnez un autre numéro.');
        setQuick([{ label: 'Me connecter', run: () => navigate('/connexion') }]);
    };

    // ---------- answers ----------
    const answer = async (s: Step, value: string | string[]) => {
        if (busy) return;
        setBusy(true);
        setQuick([]);
        try { await handle(s, value); } finally { setBusy(false); }
    };

    const handle = async (s: Step, value: string | string[]) => {
        const v = typeof value === 'string' ? value : '';
        switch (s) {
            case 'name': {
                me(v, s);
                const err = validateName(v);
                if (err) { await error(err); return; }
                setA({ name: v.trim().replace(/\s+/g, ' ') });
                markDone(s); await advance(); return;
            }
            case 'country': {
                const c = countryByValue(v);
                me(`${c?.flag ?? ''} ${v}`, s);
                // The dial code follows the country unless a number was already given with another one.
                setA({ country: v, dialCountry: answersRef.current.phone ? answersRef.current.dialCountry : v });
                markDone(s); await advance(); return;
            }
            case 'phone': {
                const parsed = parsePhone(v, answersRef.current.dialCountry || answersRef.current.country);
                if ('error' in parsed) { me(v, s); await error(parsed.error); return; }
                me(displayPhone(parsed), s);
                const taken = await checkTaken('phone', fullPhone(parsed));
                if (taken === 'taken') { await refuseTaken('phone'); return; }
                if (taken === 'error') return;
                setA(parsed);
                markDone(s); await advance(); return;
            }
            case 'email': {
                me(v, s);
                const err = validateEmail(v);
                if (err) { await error(err); return; }
                const email = v.trim().toLowerCase();
                const taken = await checkTaken('email', email);
                if (taken === 'taken') { await refuseTaken('email'); return; }
                if (taken === 'error') return;
                setA({ email });
                markDone(s); await advance(); return;
            }
            case 'password': {
                me('••••••••', s);
                const err = validatePassword(v);
                if (err) { await error(err); return; }
                setA({ password: v });
                markDone(s); await advance(); return;
            }
            case 'confirm': {
                me('••••••••', s);
                const err = validateConfirmation(answersRef.current.password, v);
                if (err) {
                    await error(err);
                    doneRef.current.delete('password');
                    await ask('password');
                    return;
                }
                markDone(s);
                if (editingRef.current === 'password') { await ask('review'); return; }
                await advance(); return;
            }
            case 'sponsor': {
                me(v, s);
                const code = v.trim();
                try {
                    const info = handleApiResponse(await sbcApiService.getAffiliationInfo(code));
                    if (!info?.name) { await error('Ce code parrain n’existe pas. Vérifiez-le auprès de la personne qui vous a invité(e).'); return; }
                    sponsorRef.current = { code, name: info.name, locked: false };
                    setA({ sponsor: code });
                    await bot({ content: `Votre parrain : ${info.name} ✅`, tone: 'success' });
                } catch (e) {
                    await error(errText(e, 'Erreur lors de la vérification du code parrain.'));
                    return;
                }
                markDone(s); await advance(); return;
            }
            case 'terms': {
                me('J’accepte', s);
                setA({ terms: true });
                markDone(s); await ask('review'); return;
            }
            case 'otp': {
                me(v.toUpperCase(), s);
                const p = pendingRef.current;
                if (!p) { await error('Votre session a expiré. Recommencez l’inscription.'); return; }
                try {
                    await verifyOtp(p.userId, v);
                } catch (e) {
                    // handleApiResponse turns every 401 into a login message; for a code, say what happened.
                    const msg = errText(e, '');
                    await error(!msg || /mot de passe ou email/i.test(msg)
                        ? 'Ce code ne correspond pas ou a expiré. Vérifiez-le, ou demandez-en un nouveau.'
                        : msg);
                    return;
                }
                pendingRef.current = null;
                try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
                // SSO: back to the consent screen that sent the member here.
                const sso = sessionStorage.getItem('sso_return_to');
                if (sso) { sessionStorage.removeItem('sso_return_to'); window.location.replace(sso); return; }
                await bot({ content: `Votre compte est créé 🎉 Bienvenue chez SBC, ${firstName(answersRef.current.name) || 'et merci'} !`, tone: 'success' });
                await bot('Encore quelques questions, toutes facultatives, pour personnaliser votre expérience ?');
                setStep('profileIntro');
                return;
            }
            case 'profileIntro': {
                me(v === 'yes' ? 'Oui, allons-y' : 'Plus tard');
                if (v !== 'yes') { await finishProfile(true); return; }
                await nextProfile(null); return;
            }
            case 'sex': {
                me(v === 'male' ? 'Un homme' : 'Une femme');
                profileRef.current.sex = v as 'male' | 'female';
                await nextProfile(s); return;
            }
            case 'birthDate': {
                me(new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
                const err = validateBirthDate(v);
                if (err) { await error(err); return; }
                profileRef.current.birthDate = v;
                await nextProfile(s); return;
            }
            case 'region': { me(v); profileRef.current.region = v; await nextProfile(s); return; }
            case 'profession': { me(v); profileRef.current.profession = v; await nextProfile(s); return; }
            case 'language': {
                me(v === 'fr' ? 'Français' : 'Anglais');
                profileRef.current.language = v as 'fr' | 'en';
                await nextProfile(s); return;
            }
            case 'interests': {
                const picked = value as string[];
                me(picked.join(', '));
                profileRef.current.interests = picked.map(getInterestBaseValue);
                await finishProfile(false); return;
            }
            default: return;
        }
    };

    const skipProfile = async (s: Step) => {
        if (busy) return;
        setBusy(true);
        try {
            me('Passer');
            if (s === 'interests') await finishProfile(false);
            else await nextProfile(s);
        } finally { setBusy(false); }
    };

    const regions = () => regionsPerCountry[countryByValue(answersRef.current.country)?.code ?? ''] ?? [];

    const nextProfile = async (after: Step | null) => {
        const from = after ? PROFILE.indexOf(after) + 1 : 0;
        const next = PROFILE.slice(from).find((s) => s !== 'region' || regions().length > 0);
        await ask(next ?? 'interests');
    };

    /** Same fields and transforms as CompleteProfile. */
    const finishProfile = async (later: boolean) => {
        setStep(null);
        const p = profileRef.current;
        const updates: Record<string, unknown> = {};
        if (p.region) updates.region = p.region;
        if (p.birthDate) updates.birthDate = p.birthDate;
        if (p.sex) updates.sex = p.sex;
        if (p.profession) updates.profession = removeAccents(p.profession);
        // user-service stores languages as a list and ignores a lone string.
        if (p.language) updates.language = [p.language];
        if (p.interests?.length) updates.interests = p.interests.map((i) => removeAccents(i));
        if (later || Object.keys(updates).length === 0) {
            localStorage.setItem('profileCompletionSkipped', 'true');
            await bot('Pas de souci : vous pourrez compléter votre profil plus tard depuis « Modifier le profil ».');
        } else {
            try {
                await updateProfile(updates);
                localStorage.setItem('profileCompletionDone', 'true');
                await bot({ content: 'Merci, votre profil est complété ✅', tone: 'success' });
            } catch (e) {
                await error(errText(e, 'Erreur lors de la sauvegarde du profil.'));
                setQuick([
                    { label: 'Réessayer', run: () => void finishProfile(false) },
                    { label: 'Passer', run: () => void finishProfile(true) },
                ]);
                return;
            }
        }
        await bot('Il ne reste plus qu’à activer votre compte pour profiter de SBC.');
        setStep('done');
    };

    // ---------- account creation and code ----------
    const createAccount = async () => {
        if (busy) return;
        setBusy(true);
        setStep(null);
        setQuick([]);
        me('Créer mon compte');
        const a = answersRef.current;
        try {
            const result = await register({
                email: a.email,
                password: a.password,
                name: a.name,
                phoneNumber: fullPhone(a),
                referrerCode: a.sponsor || undefined,
                country: countryByValue(a.country)?.code || a.country,
            });
            pendingRef.current = { userId: result.userId, email: a.email, phone: displayPhone(a) };
            try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...pendingRef.current, name: a.name, country: a.country })); } catch { /* ignore */ }
            clearSignupCache();
            clearDraft();
            // Old accounts found by e-mail/number are restored by the backend a moment after creation.
            setTimeout(async () => {
                const rec = await safeRecoveryApiCall(() => sbcApiService.getRecoveryNotification(a.email, fullPhone(a)));
                if (!rec) return;
                try { const d = handleApiResponse(rec); if (d?.hasRecoveries) setRecovery(d); } catch { /* best-effort */ }
            }, 2000);
            setResendIn(RESEND_COOLDOWN);
            await bot(
                <>C’est presque fini ! Je vous ai envoyé un code de 6 caractères par e-mail à <b>{a.email}</b>.</>,
                'Il est valable 10 minutes. Pensez à regarder dans les spams. Tapez-le ici :',
            );
            setStep('otp');
        } catch (e) {
            await error(errText(e, 'La création du compte a échoué.'));
            setQuick([
                { label: 'Réessayer', run: () => void createAccount() },
                { label: 'Modifier mes réponses', run: () => void ask('review') },
            ]);
        } finally {
            setBusy(false);
        }
    };

    const resend = async (channel: 'email' | 'whatsapp') => {
        const p = pendingRef.current;
        if (!p || busy || resendIn > 0) return;
        setBusy(true);
        me(channel === 'email' ? 'Renvoyer le code par e-mail' : 'Renvoyer le code par WhatsApp');
        try {
            const res = await sbcApiService.resendOtpEnhanced({ userId: p.userId, identifier: p.email, purpose: 'register', channel });
            if (res.statusCode === 429) {
                setResendIn(res.body?.retryAfterSeconds ?? RESEND_COOLDOWN);
                await error(res.body?.message || 'Un code vous a déjà été envoyé. Vérifiez votre boîte mail (et les spams).');
                return;
            }
            handleApiResponse(res);
            setResendIn(RESEND_COOLDOWN);
            await bot(channel === 'whatsapp'
                ? `Code renvoyé sur WhatsApp au ${p.phone}, avec une copie par e-mail.`
                : `Code renvoyé par e-mail à ${p.email}.`);
        } catch (e) {
            await error(errText(e, 'Échec du renvoi du code.'));
        } finally {
            setBusy(false);
        }
    };

    // ---------- start ----------
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        void (async () => {
            // A code was sent before a reload: carry on with it.
            try {
                const raw = sessionStorage.getItem(PENDING_KEY);
                if (raw) {
                    const p = JSON.parse(raw);
                    pendingRef.current = { userId: p.userId, email: p.email, phone: p.phone };
                    setA({ ...EMPTY_ANSWERS, name: p.name ?? '', country: p.country ?? '', email: p.email });
                    await bot(<>Reprenons : entrez le code de 6 caractères envoyé par e-mail à <b>{p.email}</b>.</>);
                    setStep('otp');
                    return;
                }
            } catch { /* start over */ }

            // Invitation link: the sponsor is known and can't be changed (as in the form).
            // Read the URL too: App stores ?affiliationCode in the context only
            // after this page has mounted (parent effects run after the child's).
            const linkCode = affiliationCode || new URLSearchParams(location.search).get('affiliationCode');
            if (linkCode) {
                try {
                    const info = handleApiResponse(await sbcApiService.getAffiliationInfo(linkCode));
                    if (info?.name) sponsorRef.current = { code: linkCode, name: info.name, locked: true };
                } catch { /* an invalid link code is asked like any other */ }
            }

            const draft = loadDraft();
            const params = new URLSearchParams(location.search);
            const prefill: Partial<SignupAnswers> = {};
            let fromLink = false;
            if (draft) Object.assign(prefill, draft.answers);
            // Recovery redirects bring e-mail / phone / country / password in the URL.
            const urlEmail = params.get('email');
            const urlPhone = params.get('phone');
            const urlCountry = findCountry(params.get('country'));
            const urlPassword = params.get('password');
            if (urlEmail) { prefill.email = urlEmail.trim().toLowerCase(); fromLink = true; }
            if (urlCountry) { prefill.country = urlCountry.value; prefill.dialCountry ||= urlCountry.value; fromLink = true; }
            if (urlPhone) {
                const parsed = parsePhone(urlPhone.startsWith('+') ? urlPhone : `+${urlPhone}`, prefill.dialCountry || '');
                if (!('error' in parsed)) { Object.assign(prefill, parsed); fromLink = true; }
            }
            if (urlPassword) { prefill.password = urlPassword; fromLink = true; }
            if (sponsorRef.current) prefill.sponsor = sponsorRef.current.code;
            setA({ ...EMPTY_ANSWERS, ...prefill });

            const a = answersRef.current;
            const known: Step[] = [];
            if (draft) for (const s of draft.done) if (SIGNUP.includes(s as Step)) known.push(s as Step);
            if (a.name && !known.includes('name')) known.push('name');
            if (a.country) known.push('country');
            if (a.phone) known.push('phone');
            if (a.email) known.push('email');
            if (a.password) known.push('password', 'confirm');
            if (a.sponsor && !sponsorRef.current?.locked && draft?.done.includes('sponsor')) known.push('sponsor');
            known.forEach((s) => doneRef.current.add(s));

            await bot('Bonjour 👋 Je suis l’assistant SBC. Je vais créer votre compte avec vous, en quelques questions.');
            if (sponsorRef.current?.locked) await bot({ content: `Vous êtes invité(e) par ${sponsorRef.current.name} 🎉`, tone: 'success' });
            if (draft && draft.done.length) {
                await bot('Je reprends où nous en étions.');
            } else if (fromLink) {
                await bot('J’ai déjà les informations de votre lien de récupération.');
            }
            const quickBefore = draft?.done.length;
            await ask(nextSignupStep());
            if (quickBefore) setQuick((q) => [...q, { label: 'Recommencer', run: () => { clearDraft(); window.location.reload(); } }]);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- composer ----------
    const disabled = busy || typing;
    let composer: ReactNode = null;
    switch (step) {
        case 'name':
            composer = <TextComposer key="name" label="Nom complet" placeholder="Ex. Jean Paul Mbarga" autoComplete="name" autoCapitalize="words" initial={editingRef.current ? answers.name : ''} onSubmit={(v) => answer('name', v)} disabled={disabled} />;
            break;
        case 'country':
            composer = <ListComposer key="country" label="Pays" placeholder="Chercher un pays" options={COUNTRY_OPTIONS} onSubmit={(v) => answer('country', v)} disabled={disabled} />;
            break;
        case 'phone':
            composer = <PhoneComposer key="phone" dialCountry={answers.dialCountry || answers.country} onDialChange={(v) => setA({ dialCountry: v })} onSubmit={(v) => answer('phone', v)} disabled={disabled} />;
            break;
        case 'email':
            composer = <TextComposer key="email" label="Adresse e-mail" placeholder="Ex. jean.paul@gmail.com" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" onSubmit={(v) => answer('email', v)} disabled={disabled} />;
            break;
        case 'password':
            composer = <PasswordComposer key="password" label="Mot de passe" autoComplete="new-password" onSubmit={(v) => answer('password', v)} disabled={disabled} />;
            break;
        case 'confirm':
            composer = <PasswordComposer key="confirm" label="Confirmation du mot de passe" autoComplete="new-password" onSubmit={(v) => answer('confirm', v)} disabled={disabled} />;
            break;
        case 'sponsor':
            composer = <TextComposer key="sponsor" label="Code parrain" placeholder="Code du parrain" autoCapitalize="none" onSubmit={(v) => answer('sponsor', v)} disabled={disabled} />;
            break;
        case 'terms':
            composer = (
                <div className="flex flex-wrap gap-2 justify-end">
                    <a href={termsUrl || '/conditions'} target="_blank" rel="noopener noreferrer" className="rounded-pill border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink">Lire les conditions</a>
                    <button type="button" disabled={disabled} onClick={() => answer('terms', 'yes')} className="rounded-pill bg-primary text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50">J’accepte</button>
                </div>
            );
            break;
        case 'review':
            composer = (
                <button type="button" disabled={disabled} onClick={createAccount} className="w-full h-12 rounded-pill bg-primary text-white font-semibold disabled:opacity-50">
                    Créer mon compte
                </button>
            );
            break;
        case 'otp':
            composer = (
                <OtpComposer key="otp" onSubmit={(v) => answer('otp', v)} disabled={disabled}
                    footer={resendIn > 0
                        ? <p className="text-xs text-ink-3 text-center">Pas reçu ? Nouveau code possible dans {formatWait(resendIn)}.</p>
                        : (
                            <div className="flex flex-wrap gap-2 justify-center">
                                <button type="button" disabled={disabled} onClick={() => resend('email')} className="text-sm font-semibold text-primary px-2 py-1">Renvoyer par e-mail</button>
                                <button type="button" disabled={disabled} onClick={() => resend('whatsapp')} className="text-sm font-semibold text-primary px-2 py-1">Renvoyer par WhatsApp</button>
                            </div>
                        )} />
            );
            break;
        case 'profileIntro':
            composer = <ChipsComposer options={[{ value: 'later', label: 'Plus tard' }, { value: 'yes', label: 'Oui, allons-y' }]} onSubmit={(v) => answer('profileIntro', v)} disabled={disabled} />;
            break;
        case 'sex':
            composer = <ChipsComposer options={[{ value: 'skip', label: 'Passer' }, { value: 'male', label: '👨 Un homme' }, { value: 'female', label: '👩 Une femme' }]}
                onSubmit={(v) => (v === 'skip' ? skipProfile('sex') : answer('sex', v))} disabled={disabled} />;
            break;
        case 'birthDate':
            composer = <DateComposer key="birth" label="Date de naissance" onSubmit={(v) => answer('birthDate', v)} onSkip={() => skipProfile('birthDate')} disabled={disabled} />;
            break;
        case 'region':
            composer = <ListComposer key="region" label="Région" options={regions().map((r) => ({ value: r, label: r }))} onSubmit={(v) => answer('region', v)} onSkip={() => skipProfile('region')} disabled={disabled} />;
            break;
        case 'profession':
            composer = <ListComposer key="profession" label="Profession" placeholder="Chercher une profession" options={professionOptions.map((p) => ({ value: p, label: p }))} onSubmit={(v) => answer('profession', v)} onSkip={() => skipProfile('profession')} disabled={disabled} />;
            break;
        case 'language':
            composer = <ChipsComposer options={[{ value: 'skip', label: 'Passer' }, { value: 'fr', label: 'Français' }, { value: 'en', label: 'Anglais' }]}
                onSubmit={(v) => (v === 'skip' ? skipProfile('language') : answer('language', v))} disabled={disabled} />;
            break;
        case 'interests':
            composer = <MultiComposer options={predefinedInterestOptions.map((i) => ({ value: i, label: i }))} onSubmit={(v) => answer('interests', v)} onSkip={() => skipProfile('interests')} disabled={disabled} />;
            break;
        case 'done':
            composer = (
                <button type="button" onClick={() => navigate('/')} className="w-full h-12 rounded-pill bg-primary text-white font-semibold">
                    Continuer
                </button>
            );
            break;
        default: composer = null;
    }

    const counted = SIGNUP.filter((s) => !skipped(s));
    const position = step && counted.includes(step) ? counted.indexOf(step) + 1 : null;
    const formLink = `/signup/formulaire${location.search}`;

    return (
        <div className="fixed inset-0 flex flex-col bg-bg">
            <header className="shrink-0 bg-surface border-b border-border px-3 py-2.5 flex items-center gap-3">
                <button type="button" onClick={() => navigate(-1)} aria-label="Retour" className="size-10 grid place-items-center rounded-full text-ink-2">
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={22} />
                </button>
                <img src="/logo-sbc.png" alt="" className="size-9 rounded-full bg-white object-contain border border-border" />
                <div className="min-w-0 flex-1">
                    <h1 className="text-[15px] font-semibold text-ink leading-tight">Créer un compte</h1>
                    <p className="text-xs text-ink-3">{position ? `Question ${position} sur ${counted.length}` : typing ? 'écrit…' : 'Assistant SBC'}</p>
                </div>
                {!pendingRef.current && step !== 'profileIntro' && !PROFILE.includes(step as Step) && step !== 'done' && (
                    <Link to={formLink} className="text-xs font-semibold text-primary px-2 py-1">Remplir un formulaire</Link>
                )}
            </header>

            <div role="log" aria-live="polite" className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
                <div className="mx-auto w-full max-w-xl space-y-2">
                    {msgs.map((m) => <Bubble key={m.id} m={m} onEdit={m.from === 'me' && m.step && EDITABLE.includes(m.step) && !pendingRef.current ? () => edit(m.step!) : undefined} />)}
                    {typing && <TypingDots />}
                    <div ref={endRef} />
                </div>
            </div>

            <div className="shrink-0 bg-surface border-t border-border px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <div className="mx-auto w-full max-w-xl space-y-2">
                    {quick.length > 0 && !typing && (
                        <div className="flex flex-wrap gap-2 justify-end">
                            {quick.map((q) => (
                                <button key={q.label} type="button" onClick={q.run} disabled={busy}
                                    className="rounded-pill border border-border bg-bg px-3 py-1.5 text-sm font-medium text-ink-2">{q.label}</button>
                            ))}
                        </div>
                    )}
                    {!typing && composer}
                    {(typing || busy) && !composer && <div className="h-12" />}
                </div>
            </div>

            {recovery && <RecoveryCompletedNotification isOpen onClose={() => setRecovery(null)} recoveryData={recovery} />}
        </div>
    );
}

function Bubble({ m, onEdit }: { m: Msg; onEdit?: () => void }) {
    if (m.from === 'me') {
        return (
            <div className="flex justify-end">
                <button type="button" onClick={onEdit} disabled={!onEdit} aria-label={onEdit ? 'Modifier cette réponse' : undefined}
                    className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-white px-4 py-2.5 text-[15px] text-left break-words disabled:cursor-default">
                    {m.content}
                </button>
            </div>
        );
    }
    const tone = m.tone === 'error' ? 'bg-danger-soft text-danger' : m.tone === 'success' ? 'bg-success-soft text-ink' : 'bg-surface text-ink';
    return (
        <div className="flex justify-start">
            <div className={`max-w-[85%] rounded-2xl rounded-bl-md border border-border px-4 py-2.5 text-[15px] leading-snug break-words ${tone}`}>{m.content}</div>
        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex justify-start" aria-label="L’assistant écrit">
            <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3 flex gap-1">
                {[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-ink-3 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
            </div>
        </div>
    );
}

/** The terms PDF from the settings, or the app's public terms page when none is uploaded. */
function TermsLink({ url }: { url?: string }) {
    return <a href={url || '/conditions'} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">conditions d’utilisation</a>;
}
