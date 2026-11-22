import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Camera01Icon, CancelCircleIcon, CheckmarkCircle02Icon, Clock01Icon, InformationCircleIcon, LockIcon,
} from '@hugeicons/core-free-icons';
import { Card, Pill } from './ui';
import { primaryBtn, secondaryBtn } from './styles';
import { supportErrorText } from './support';
import { shrinkPhoto, type IdentityKind, type IdentityStatus } from './identity';

const SLOTS: { kind: IdentityKind; title: string; hint: string; required: boolean; capture: 'environment' | 'user' }[] = [
    { kind: 'id_front', title: 'Pièce d’identité (recto)', hint: 'Carte d’identité, passeport ou permis. Les 4 coins visibles, sans reflet, texte lisible.', required: true, capture: 'environment' },
    { kind: 'id_back', title: 'Pièce d’identité (verso)', hint: 'Facultatif : pour une carte, le dos.', required: false, capture: 'environment' },
    { kind: 'selfie', title: 'Selfie', hint: 'Votre visage de face, bien éclairé, sans lunettes de soleil ni casquette. Vous seul sur la photo.', required: true, capture: 'user' },
];

type Picked = { blob: Blob; url: string };

/** One photo: take it (or choose it), preview, replace. Shrunk on the phone before sending. */
function PhotoSlot({ slot, value, onChange, disabled }: {
    slot: typeof SLOTS[number]; value: Picked | null; onChange: (p: Picked | null) => void; disabled: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pick = async (file: File | undefined) => {
        if (!file) return;
        setBusy(true);
        setError('');
        try {
            const blob = await shrinkPhoto(file);
            onChange({ blob, url: URL.createObjectURL(blob) });
        } catch (e) {
            setError(supportErrorText(e));
        } finally {
            setBusy(false);
            if (input.current) input.current.value = '';
        }
    };
    return (
        <div className="rounded-tile border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
                <p className="flex-1 text-sm font-semibold text-ink">{slot.title}{slot.required ? '' : ' (facultatif)'}</p>
                {value && <Pill tone="success">Prête</Pill>}
            </div>
            <p className="mt-1 text-xs text-ink-2">{slot.hint}</p>
            {value && <img src={value.url} alt={slot.title} className="mt-2 max-h-48 w-full rounded-tile object-contain bg-surface-2" />}
            {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
            <input
                ref={input} type="file" accept="image/*" capture={slot.capture} className="hidden"
                aria-label={slot.title} data-testid={`photo-${slot.kind}`}
                onChange={(e) => void pick(e.target.files?.[0])}
            />
            <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()} className={`${secondaryBtn} mt-2`}>
                <HugeiconsIcon icon={Camera01Icon} size={18} />
                {busy ? 'Préparation…' : value ? 'Reprendre la photo' : 'Prendre la photo'}
            </button>
        </div>
    );
}

const STATUS: Record<IdentityStatus['status'], { title: string; text: string; tone: 'warning' | 'success' | 'danger'; icon: typeof Clock01Icon }> = {
    pending: {
        title: 'Vérification en cours', tone: 'warning', icon: Clock01Icon,
        text: 'Un agent SBC examine vos photos. Vous recevrez une notification ; suivez sa réponse dans votre demande.',
    },
    approved: {
        title: 'Identité vérifiée', tone: 'success', icon: CheckmarkCircle02Icon,
        text: 'Un agent a confirmé votre identité. Il poursuit le traitement de votre demande.',
    },
    refused: {
        title: 'Vérification refusée', tone: 'danger', icon: CancelCircleIcon,
        text: 'Vos photos n’ont pas pu être acceptées. Lisez le message de l’agent dans votre demande, puis renvoyez des photos nettes si besoin.',
    },
};

/** Where a verification stands; `onRetry` after a refusal. */
export function IdentityStatusCard({ status, onRetry, ticketLink }: { status: IdentityStatus; onRetry?: () => void; ticketLink?: React.ReactNode }) {
    const s = STATUS[status.status];
    return (
        <Card title={s.title} icon={s.icon}>
            <p className="text-sm text-ink-2" data-testid="identity-status">{s.text}</p>
            {ticketLink && <div className="mt-3">{ticketLink}</div>}
            {status.status === 'refused' && onRetry && (
                <button type="button" onClick={onRetry} className={`${primaryBtn} mt-3`}>Envoyer de nouvelles photos</button>
            )}
        </Card>
    );
}

/**
 * The three photos and the send button. `send` does the upload (member or guest); the parent
 * shows the result. Privacy and safety notes are always visible.
 */
export function IdentityForm({ why, send }: { why: string; send: (images: Partial<Record<IdentityKind, Blob>>) => Promise<void> }) {
    const [photos, setPhotos] = useState<Partial<Record<IdentityKind, Picked | null>>>({});
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => () => { Object.values(photos).forEach((p) => p && URL.revokeObjectURL(p.url)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const ready = !!photos.id_front && !!photos.selfie;
    const submit = async () => {
        if (!ready) return;
        setSending(true);
        setError('');
        try {
            const images: Partial<Record<IdentityKind, Blob>> = {};
            for (const [k, p] of Object.entries(photos)) if (p) images[k as IdentityKind] = p.blob;
            await send(images);
        } catch (e) {
            setError(supportErrorText(e));
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <p className="text-sm text-ink-2">{why}</p>
            {SLOTS.map((slot) => (
                <PhotoSlot key={slot.kind} slot={slot} value={photos[slot.kind] ?? null} disabled={sending}
                    onChange={(p) => setPhotos((cur) => {
                        const old = cur[slot.kind];
                        if (old) URL.revokeObjectURL(old.url);
                        return { ...cur, [slot.kind]: p };
                    })} />
            ))}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <button type="button" disabled={!ready || sending} onClick={() => void submit()} className={primaryBtn}>
                {sending ? 'Envoi en cours…' : 'Envoyer à l’équipe SBC'}
            </button>
            <div className="flex items-start gap-2 rounded-tile bg-accent-soft p-3 text-xs text-ink-2">
                <HugeiconsIcon icon={LockIcon} size={18} className="text-accent shrink-0" />
                <p>
                    Vos photos sont chiffrées et vues uniquement par l’équipe support SBC. Elles sont supprimées 30 jours après la
                    décision de l’agent.
                </p>
            </div>
            <div className="flex items-start gap-2 rounded-tile bg-surface-2 p-3 text-xs text-ink-2">
                <HugeiconsIcon icon={InformationCircleIcon} size={18} className="shrink-0" />
                <p>Envoyez vos photos uniquement ici. L’équipe SBC ne vous les demandera jamais par WhatsApp, et ne vous demandera jamais votre mot de passe ni vos codes.</p>
            </div>
        </>
    );
}
