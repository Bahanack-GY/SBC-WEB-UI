import { allAfricanCountries, type CountryData } from '../../utils/countriesData';

/**
 * Everything the old sign-up form and the profile-completion form asked,
 * answered one question at a time. Sent to the same endpoints with the same
 * shapes (see SignupChat).
 */
export interface SignupAnswers {
    name: string;
    /** CountryData.value, as the old form stored it (e.g. "Cameroun"). */
    country: string;
    /** CountryData.value of the dial code (defaults to the country's). */
    dialCountry: string;
    /** Local part of the WhatsApp number, as typed (spaces removed). */
    phone: string;
    email: string;
    password: string;
    sponsor: string;
    terms: boolean;
}

export interface ProfileAnswers {
    sex?: 'male' | 'female';
    birthDate?: string;
    region?: string;
    profession?: string;
    language?: 'fr' | 'en';
    interests?: string[];
}

export const EMPTY_ANSWERS: SignupAnswers = {
    name: '', country: '', dialCountry: '', phone: '', email: '', password: '', sponsor: '', terms: false,
};

export const countryByValue = (value?: string): CountryData | undefined =>
    allAfricanCountries.find((c) => c.value === value);

/** A country given as a value ("Cameroun") or an ISO code ("CM"). */
export const findCountry = (raw?: string | null): CountryData | undefined => {
    if (!raw) return undefined;
    const v = raw.trim().toLowerCase();
    return allAfricanCountries.find((c) => c.value.toLowerCase() === v || c.code.toLowerCase() === v);
};

const EMAIL = /\S+@\S+\.\S+$/;

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || '';

export const validateName = (v: string): string | null => {
    const t = v.trim();
    if (!t) return 'Votre nom complet, s’il vous plaît.';
    if (t.length < 2) return 'Ce nom est un peu court. Écrivez votre nom complet.';
    return null;
};

export const validateEmail = (v: string): string | null =>
    EMAIL.test(v.trim()) ? null : 'Cette adresse e-mail ne semble pas valide. Exemple : jean.paul@gmail.com';

export const validatePassword = (v: string): string | null =>
    v.length >= 8 ? null : 'Le mot de passe doit avoir au moins 8 caractères.';

export const validateConfirmation = (password: string, confirmation: string): string | null =>
    password === confirmation ? null : 'Les deux mots de passe ne correspondent pas. Réessayons.';

/**
 * A WhatsApp number as typed. Spaces, dashes and brackets are dropped. If the
 * person typed the international form (+237…, 00237…), the dial code is read
 * from it. The leading 0 of the local part is kept as typed: in
 * Congo-Brazzaville it belongs to the number (see server CLAUDE.md).
 */
export const parsePhone = (raw: string, dialCountry: string): { phone: string; dialCountry: string } | { error: string } => {
    let s = raw.replace(/[\s\-().]/g, '');
    let dial = dialCountry;
    if (s.startsWith('00')) s = `+${s.slice(2)}`;
    if (s.startsWith('+')) {
        // Longest prefix first, so +2420… is Congo, not +24 something shorter.
        const match = [...allAfricanCountries].sort((a, b) => b.phoneCode.length - a.phoneCode.length)
            .find((c) => s.startsWith(c.phoneCode));
        if (!match) return { error: 'Je ne reconnais pas cet indicatif. Choisissez-le dans la liste puis tapez votre numéro.' };
        dial = match.value;
        s = s.slice(match.phoneCode.length);
    }
    if (!/^\d+$/.test(s)) return { error: 'Un numéro ne contient que des chiffres. Exemple : 675090755' };
    if (s.length < 6 || s.length > 15) return { error: 'Ce numéro ne semble pas complet. Vérifiez-le.' };
    return { phone: s, dialCountry: dial };
};

export const fullPhone = (a: Pick<SignupAnswers, 'dialCountry' | 'phone'>) =>
    `${countryByValue(a.dialCountry)?.phoneCode ?? ''}${a.phone}`;

/** "+237 675 090 755" for display. */
export const displayPhone = (a: Pick<SignupAnswers, 'dialCountry' | 'phone'>) =>
    `${countryByValue(a.dialCountry)?.phoneCode ?? ''} ${a.phone.replace(/(\d{3})(?=\d)/g, '$1 ')}`.trim();

export const validateBirthDate = (v: string, now = new Date()): string | null => {
    const d = new Date(v);
    if (!v || Number.isNaN(d.getTime())) return 'Choisissez une date.';
    if (d > now) return 'Cette date est dans le futur.';
    if (d.getFullYear() < 1900) return 'Cette date semble trop ancienne.';
    return null;
};

// ---------- draft (survives a reload; never the password) ----------

export const DRAFT_KEY = 'signupChatDraft';

export interface Draft {
    answers: Omit<SignupAnswers, 'password'>;
    /** Questions already answered, in order. */
    done: string[];
}

export const saveDraft = (answers: SignupAnswers, done: string[]) => {
    try {
        const { password: _pw, ...rest } = answers;
        void _pw;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: rest, done: done.filter((d) => d !== 'password' && d !== 'confirm') }));
    } catch { /* storage unavailable: the chat simply starts over after a reload */ }
};

export const loadDraft = (): Draft | null => {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
        return null;
    }
};

export const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
};
