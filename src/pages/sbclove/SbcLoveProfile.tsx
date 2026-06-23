import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FaHeart, FaPlus, FaTrash } from 'react-icons/fa';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import ProtectedImage from '../../components/sbclove/ProtectedImage';
import { INTENTION_LABELS } from '../../types/sbclove';
import type { Intention, SbcloveProfile } from '../../types/sbclove';

const DESCRIPTION_MAX = 300;
const OTHER_MAX = 80;
const MAX_PHOTOS = 3;

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
    pending: { text: 'En attente de validation', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    approved: { text: 'Validé', cls: 'bg-green-50 text-green-800 border-green-200' },
    rejected: { text: 'Refusé', cls: 'bg-red-50 text-red-700 border-red-200' },
    suspended: { text: 'Suspendu', cls: 'bg-gray-100 text-gray-700 border-gray-300' },
};

function SbcLoveProfile() {
    const queryClient = useQueryClient();
    const fileRef = useRef<HTMLInputElement>(null);
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [displayName, setDisplayName] = useState('');
    const [intention, setIntention] = useState<Intention>('relation_serieuse');
    const [otherIntentionText, setOtherIntentionText] = useState('');
    const [description, setDescription] = useState('');

    const { data: profile, isLoading } = useQuery<SbcloveProfile | null>({
        queryKey: ['sbclove', 'my-profile'],
        queryFn: async () => {
            const res = await sbcApiService.sbcloveGetMyProfile();
            return res.isSuccessByStatusCode ? (res.body?.data ?? null) : null;
        },
    });

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName ?? '');
            setIntention(profile.intention);
            setOtherIntentionText(profile.otherIntentionText ?? '');
            setDescription(profile.description ?? '');
        }
    }, [profile]);

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['sbclove', 'my-profile'] });

    const save = async () => {
        setSaving(true);
        setBanner(null);
        const body = {
            displayName: displayName.trim() || undefined,
            intention,
            otherIntentionText: intention === 'autre' ? otherIntentionText.trim() : undefined,
            description: description.trim(),
        };
        try {
            const res = profile
                ? await sbcApiService.sbcloveUpdateProfile(body)
                : await sbcApiService.sbcloveCreateProfile(body);
            if (!res.isSuccessByStatusCode) {
                throw new Error(res.body?.message || "Échec de l'enregistrement.");
            }
            setBanner({ type: 'success', text: 'Profil enregistré. Il passe en validation.' });
            refresh();
        } catch (e) {
            setBanner({ type: 'error', text: e instanceof Error ? e.message : 'Erreur.' });
        } finally {
            setSaving(false);
        }
    };

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        setUploading(true);
        setBanner(null);
        try {
            const res = await sbcApiService.sbcloveUploadPhotos(files);
            if (!res.isSuccessByStatusCode) throw new Error(res.body?.message || "Échec de l'envoi des photos.");
            refresh();
        } catch (err) {
            setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const deletePhoto = async (fileId: string) => {
        try {
            await handleApiResponse(await sbcApiService.sbcloveDeletePhoto(fileId));
            refresh();
        } catch {
            /* refetch will reconcile */
        }
    };

    if (isLoading) return <div className="p-4"><Skeleton className="h-80 w-full" /></div>;

    const photos = profile?.photos ?? [];
    const status = profile ? STATUS_LABELS[profile.status] : null;

    return (
        <div className="p-4 max-w-xl mx-auto pb-24">
            <div className="flex items-center gap-3 mb-4">
                <BackButton />
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FaHeart className="text-[#115CF6]" /> Mon profil SBC Love
                </h1>
            </div>

            {status && (
                <div className={`mb-4 rounded-xl border px-3 py-2 text-sm ${status.cls}`}>{status.text}</div>
            )}
            {banner && (
                <div className={`mb-4 rounded-xl p-3 text-sm ${banner.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {banner.text}
                </div>
            )}

            {/* Photos */}
            <label className="block text-sm font-medium mb-2">Photos (1 à {MAX_PHOTOS})</label>
            <div className="flex gap-3 mb-5 flex-wrap">
                {photos.slice().sort((a, b) => a.order - b.order).map((ph) => (
                    <div key={ph.url} className="relative">
                        <ProtectedImage url={ph.url} alt="photo" className="h-24 w-24 rounded-xl" watermark={false} />
                        <button
                            onClick={() => { const id = ph.url?.split('/').pop(); if (id) deletePhoto(id); }}
                            className="absolute -top-2 -right-2 rounded-full bg-red-600 p-1.5 text-white shadow"
                            aria-label="Supprimer la photo"
                        >
                            <FaTrash size={11} />
                        </button>
                    </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="h-24 w-24 rounded-xl border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-300 disabled:opacity-50"
                    >
                        <FaPlus size={20} />
                    </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onUpload} />
            </div>

            {/* Fields */}
            <label className="block text-sm font-medium mb-1">Prénom ou pseudo</label>
            <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="Laisser vide pour utiliser votre nom SBC"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 mb-4"
            />

            <label className="block text-sm font-medium mb-1">Intention relationnelle</label>
            <select
                value={intention}
                onChange={(e) => setIntention(e.target.value as Intention)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 mb-4 bg-white"
            >
                {(Object.keys(INTENTION_LABELS) as Intention[]).map((key) => (
                    <option key={key} value={key}>{INTENTION_LABELS[key]}</option>
                ))}
            </select>

            {intention === 'autre' && (
                <>
                    <label className="block text-sm font-medium mb-1">Précisez votre intention</label>
                    <input
                        value={otherIntentionText}
                        onChange={(e) => setOtherIntentionText(e.target.value)}
                        maxLength={OTHER_MAX}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 mb-4"
                    />
                </>
            )}

            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-3 py-2"
                placeholder="Présentez-vous en quelques mots (pas de numéro, réseau social ni lien)."
            />
            <p className="text-right text-xs text-gray-400 mb-5">{description.length}/{DESCRIPTION_MAX}</p>

            <button
                onClick={save}
                disabled={saving || !description.trim()}
                className="w-full rounded-xl bg-[#115CF6] hover:bg-blue-700 py-3 font-semibold text-white disabled:opacity-40"
            >
                {saving ? 'Enregistrement…' : profile ? 'Mettre à jour' : 'Créer mon profil'}
            </button>
        </div>
    );
}

export default SbcLoveProfile;
