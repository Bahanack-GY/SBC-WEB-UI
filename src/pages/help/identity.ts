import { sbcApiService } from '../../services/SBCApiService';
import { guestKeyFor } from './guest';
import { getBaseUrl } from '../../utils/apiHelpers';
import { SupportError, unwrap } from './support';

/**
 * KYC level 3 (2026-11-22): the recto (+ verso) of an ID and a selfie, checked by a support agent.
 * Asked when withdrawals are held by the security check, when the authenticator's phone is lost,
 * or when someone lost access to their account (also without an account, on their request).
 * Photos are stored encrypted and deleted 30 days after the decision.
 */
export type IdentityPurpose = 'fraud_hold' | 'authenticator_reset' | 'lost_access';
export type IdentityKind = 'id_front' | 'id_back' | 'selfie';
export type IdentityStatus = { id: string; purpose: IdentityPurpose; ticketId: string | null; status: 'pending' | 'approved' | 'refused'; submittedAt: string | null; decidedAt: string | null };

export const PURPOSES: Record<IdentityPurpose, { title: string; why: string }> = {
    fraud_hold: {
        title: 'Débloquer mes retraits',
        why: 'Vos retraits sont bloqués le temps d’une vérification de sécurité. Un agent doit confirmer que c’est bien vous.',
    },
    authenticator_reset: {
        title: 'J’ai perdu le téléphone de mon application d’authentification',
        why: 'Sans code de secours, un agent doit confirmer que c’est bien vous avant de retirer l’application de votre compte.',
    },
    lost_access: {
        title: 'J’ai perdu l’accès à mon compte',
        why: 'Un agent doit confirmer que c’est bien vous avant de changer l’email ou le numéro de votre compte.',
    },
};

const STATUSES = ['pending', 'approved', 'refused'];
/** A verification as the server sends it, or null (none yet, or an unexpected shape). */
export const asStatus = (v: unknown): IdentityStatus | null =>
    v && typeof v === 'object' && STATUSES.includes((v as IdentityStatus).status) ? (v as IdentityStatus) : null;

export const isPurpose = (v: unknown): v is IdentityPurpose => typeof v === 'string' && v in PURPOSES;

/** The server takes 4 MB per photo: phone photos are scaled to 1600 px and re-encoded as JPEG. */
export const MAX_SIDE = 1600;
export const MAX_BYTES = 4 * 1024 * 1024;

export async function shrinkPhoto(file: File): Promise<Blob> {
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
        throw new SupportError('Choisissez une photo.', 400);
    }
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        // The browser cannot read it (e.g. HEIC on some phones): send it as is if small enough.
        if (file.size <= MAX_BYTES && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
        throw new SupportError('Cette photo ne peut pas être lue. Reprenez-la avec l’appareil photo.', 400);
    }
    const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    for (const q of [0.85, 0.7, 0.55]) {
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
        if (blob && blob.size <= MAX_BYTES) return blob;
    }
    throw new SupportError('Cette photo est trop lourde. Reprenez-la.', 413);
}

export const identityApi = {
    // Read `data` itself: unwrap() falls back to the whole body when data is null (none sent yet).
    latest: async (): Promise<IdentityStatus | null> => {
        const res = await sbcApiService.supportIdentityLatest();
        unwrap(res);
        return asStatus(res.body?.data);
    },
    submit: async (purpose: IdentityPurpose, images: Partial<Record<IdentityKind, Blob>>, ticketId?: string): Promise<IdentityStatus> =>
        unwrap<IdentityStatus>(await sbcApiService.supportIdentitySubmit({ purpose, ticketId, images: images as Record<string, Blob> })),
};

/** For a request sent without an account (lost access), with the request's key kept on this device. */
async function guestCall<T>(id: string, init: RequestInit = {}): Promise<T> {
    const key = guestKeyFor(id);
    if (!key) throw new SupportError('Ouvrez le lien reçu par email pour retrouver votre demande.', 404);
    let res: Response;
    try {
        res = await fetch(`${getBaseUrl()}/support/public/tickets/${encodeURIComponent(id)}/identity-verification`, {
            ...init, headers: { Authorization: `SupportKey ${key}` },
        });
    } catch {
        throw new SupportError('', 0);
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) throw new SupportError(String(json?.message ?? ''), res.status, json?.code);
    return (json?.data ?? null) as T;
}

export const guestIdentityApi = {
    latest: async (ticketId: string) => asStatus(await guestCall<unknown>(ticketId)),
    submit: (ticketId: string, images: Partial<Record<IdentityKind, Blob>>) => {
        const form = new FormData();
        for (const [k, b] of Object.entries(images)) if (b) form.append(k, b, `${k}.jpg`);
        return guestCall<IdentityStatus>(ticketId, { method: 'POST', body: form });
    },
};
