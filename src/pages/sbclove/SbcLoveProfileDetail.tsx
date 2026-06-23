import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaHeart, FaFlag, FaBan } from 'react-icons/fa';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import ProtectedImage from '../../components/sbclove/ProtectedImage';
import { useSbcloveStatus } from '../../hooks/useSbcloveStatus';
import SbcLoveClosed from './SbcLoveClosed';
import { INTENTION_LABELS } from '../../types/sbclove';
import type { SbcloveProfile } from '../../types/sbclove';

function SbcLoveProfileDetail() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const { isOpen, nextOpenAt, isLoading: statusLoading } = useSbcloveStatus();
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const { data: profile, isLoading } = useQuery<SbcloveProfile | null>({
        queryKey: ['sbclove', 'profile', id],
        queryFn: async () => handleApiResponse(await sbcApiService.sbcloveGetProfile(id)),
        enabled: isOpen && !!id,
    });

    const act = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        setBanner(null);
        try {
            await fn();
            setBanner({ type: 'success', text: ok });
        } catch (e) {
            setBanner({ type: 'error', text: e instanceof Error ? e.message : 'Erreur.' });
        } finally {
            setBusy(false);
        }
    };

    if (statusLoading) return <div className="p-4"><Skeleton className="h-80 w-full" /></div>;
    if (!isOpen) return <SbcLoveClosed nextOpenAt={nextOpenAt} />;

    return (
        <div className="p-4 max-w-xl mx-auto pb-24">
            <div className="flex items-center gap-3 mb-4">
                <BackButton />
                <h1 className="text-xl font-bold">Profil</h1>
            </div>

            {banner && (
                <div className={`mb-4 rounded-xl p-3 text-sm ${banner.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {banner.text}
                </div>
            )}

            {isLoading || !profile ? (
                <Skeleton className="h-96 w-full rounded-2xl" />
            ) : (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="grid grid-cols-2 gap-1">
                        {profile.photos.length > 0 ? (
                            profile.photos.slice().sort((a, b) => a.order - b.order).map((ph, i) => (
                                <ProtectedImage key={i} url={ph.url} blurred={ph.blurred} alt={profile.displayName} className="h-48 w-full" />
                            ))
                        ) : (
                            <ProtectedImage url={undefined} alt={profile.displayName} className="h-48 w-full col-span-2" />
                        )}
                    </div>
                    <div className="p-4">
                        <p className="text-xl font-bold">{profile.displayName}</p>
                        <p className="text-sm text-gray-500">{[profile.ageBracket, profile.city, profile.country].filter(Boolean).join(' · ')}</p>
                        <p className="mt-1 text-sm font-medium text-pink-600">
                            {profile.intention === 'autre' ? profile.otherIntentionText : INTENTION_LABELS[profile.intention]}
                        </p>
                        <p className="mt-3 whitespace-pre-line text-gray-700">{profile.description}</p>

                        <button
                            disabled={busy}
                            onClick={() => act(
                                async () => {
                                    const r = await handleApiResponse(await sbcApiService.sbcloveExpressInterest(profile.id));
                                    setBanner({ type: 'success', text: r?.matched ? "C'est un match !" : `Intérêt envoyé. Reste ${r?.interestsLeft ?? '—'} cette semaine.` });
                                },
                                "Intérêt envoyé."
                            )}
                            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-pink-600 py-2.5 font-medium text-white disabled:opacity-40"
                        >
                            <FaHeart /> Manifester un intérêt
                        </button>

                        <div className="mt-3 flex gap-3">
                            <button
                                disabled={busy}
                                onClick={() => {
                                    const reason = window.prompt('Motif du signalement ?');
                                    if (reason) act(async () => handleApiResponse(await sbcApiService.sbcloveReportProfile(profile.id, reason)), 'Profil signalé.');
                                }}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-2 text-sm text-gray-600 disabled:opacity-40"
                            >
                                <FaFlag size={12} /> Signaler
                            </button>
                            <button
                                disabled={busy}
                                onClick={() => act(
                                    async () => { handleApiResponse(await sbcApiService.sbcloveBlockProfile(profile.id)); navigate('/sbclove'); },
                                    'Profil bloqué.'
                                )}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-2 text-sm text-gray-600 disabled:opacity-40"
                            >
                                <FaBan size={12} /> Bloquer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SbcLoveProfileDetail;
