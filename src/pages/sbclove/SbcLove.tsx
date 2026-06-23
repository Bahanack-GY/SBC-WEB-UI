import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FaHeart, FaUserEdit, FaCommentDots } from 'react-icons/fa';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import ProtectedImage from '../../components/sbclove/ProtectedImage';
import { useSbcloveStatus } from '../../hooks/useSbcloveStatus';
import SbcLoveClosed from './SbcLoveClosed';
import { INTENTION_LABELS } from '../../types/sbclove';
import type { SbcloveProfile } from '../../types/sbclove';

function SbcLove() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isOpen, nextOpenAt, isLoading: statusLoading } = useSbcloveStatus();
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);

    const { data: myProfile } = useQuery<SbcloveProfile | null>({
        queryKey: ['sbclove', 'my-profile'],
        queryFn: async () => {
            const res = await sbcApiService.sbcloveGetMyProfile();
            return res.isSuccessByStatusCode ? (res.body?.data ?? null) : null;
        },
    });

    const { data, isLoading } = useQuery({
        queryKey: ['sbclove', 'browse'],
        queryFn: async () => handleApiResponse(await sbcApiService.sbcloveBrowse(1, 30)),
        enabled: isOpen,
    });

    const profiles: SbcloveProfile[] = data ?? [];
    const hasApprovedProfile = myProfile?.status === 'approved';

    const expressInterest = async (profile: SbcloveProfile) => {
        setPendingId(profile.id);
        setBanner(null);
        try {
            const result = await handleApiResponse(await sbcApiService.sbcloveExpressInterest(profile.id));
            if (result?.matched) {
                setBanner({ type: 'success', text: `C'est un match avec ${profile.displayName} ! Retrouvez-le dans « Mes matchs ».` });
            } else {
                setBanner({ type: 'success', text: `Intérêt envoyé. Il vous reste ${result?.interestsLeft ?? '—'} intérêt(s) cette semaine.` });
            }
            queryClient.invalidateQueries({ queryKey: ['sbclove', 'matches'] });
        } catch (e) {
            setBanner({ type: 'error', text: e instanceof Error ? e.message : "Impossible d'envoyer l'intérêt." });
        } finally {
            setPendingId(null);
        }
    };

    if (statusLoading) {
        return <div className="p-4"><Skeleton className="h-40 w-full" /></div>;
    }
    if (!isOpen) {
        return <SbcLoveClosed nextOpenAt={nextOpenAt} />;
    }

    return (
        <div className="p-4 max-w-3xl mx-auto pb-24">
            <div className="flex items-center gap-3 mb-4">
                <BackButton />
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FaHeart className="text-[#115CF6]" /> SBC Love
                </h1>
            </div>

            <div className="flex gap-3 mb-4">
                <button
                    onClick={() => navigate('/sbclove/profil')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2 font-medium text-[#115CF6]"
                >
                    <FaUserEdit /> {myProfile ? 'Mon profil' : 'Créer mon profil'}
                </button>
                <button
                    onClick={() => navigate('/sbclove/matchs')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2 font-medium text-[#115CF6]"
                >
                    <FaCommentDots /> Mes matchs
                </button>
            </div>

            {!hasApprovedProfile && (
                <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    {myProfile
                        ? "Votre profil est en attente de validation. Vous pourrez manifester un intérêt une fois validé."
                        : "Créez votre profil SBC Love pour pouvoir manifester un intérêt."}
                </div>
            )}

            {banner && (
                <div className={`mb-4 rounded-xl p-3 text-sm ${banner.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {banner.text}
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
                </div>
            ) : profiles.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">Aucun profil à découvrir pour le moment.</p>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {profiles.map((p) => (
                        <div key={p.id} className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                            <button onClick={() => navigate(`/sbclove/profil/${p.id}`)} className="block w-full">
                                <ProtectedImage
                                    url={p.photos[0]?.url}
                                    blurred={p.photos[0]?.blurred}
                                    alt={p.displayName}
                                    className="h-44 w-full"
                                />
                            </button>
                            <div className="p-3">
                                <p className="font-semibold truncate">{p.displayName}</p>
                                <p className="text-xs text-gray-500 truncate">
                                    {[p.ageBracket, p.city].filter(Boolean).join(' · ')}
                                </p>
                                <p className="text-xs text-[#115CF6] mt-1 truncate">
                                    {p.intention === 'autre' ? p.otherIntentionText : INTENTION_LABELS[p.intention]}
                                </p>
                                <button
                                    disabled={!hasApprovedProfile || pendingId === p.id}
                                    onClick={() => expressInterest(p)}
                                    className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-[#115CF6] hover:bg-blue-700 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                                >
                                    <FaHeart size={12} /> {pendingId === p.id ? '...' : "Manifester un intérêt"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SbcLove;
