import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FaHeart, FaCheck, FaTimes, FaLockOpen } from 'react-icons/fa';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import ProtectedImage from '../../components/sbclove/ProtectedImage';
import { INTENTION_LABELS } from '../../types/sbclove';
import type { SbcloveMatch } from '../../types/sbclove';
import { useState } from 'react';

function SbcLoveMatches() {
    const queryClient = useQueryClient();
    const [pending, setPending] = useState<string | null>(null);

    const { data, isLoading } = useQuery<SbcloveMatch[]>({
        queryKey: ['sbclove', 'matches'],
        queryFn: async () => handleApiResponse(await sbcApiService.sbcloveGetMyMatches()),
    });

    const matches = data ?? [];

    const choose = async (match: SbcloveMatch, choice: 'wants_contact' | 'declined') => {
        setPending(match.matchId + choice);
        try {
            await handleApiResponse(await sbcApiService.sbcloveSetContactChoice(match.matchId, choice));
            queryClient.invalidateQueries({ queryKey: ['sbclove', 'matches'] });
        } catch {
            // surfaced on next refetch; keep UI simple
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <div className="flex items-center gap-3 mb-4">
                <BackButton />
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FaHeart className="text-pink-600" /> Mes matchs
                </h1>
            </div>

            {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
            ) : matches.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">Vous n'avez pas encore de match.</p>
            ) : (
                <div className="space-y-3">
                    {matches.map((m) => (
                        <div key={m.matchId} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <ProtectedImage url={m.photoUrl} alt={m.displayName} className="h-20 w-20 rounded-xl flex-shrink-0" watermark={false} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{m.displayName}</p>
                                <p className="text-xs text-gray-500 truncate">{[m.ageBracket, m.city].filter(Boolean).join(' · ')}</p>
                                {m.intention && <p className="text-xs text-pink-600 truncate">{INTENTION_LABELS[m.intention]}</p>}

                                {m.contactUnlocked ? (
                                    <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-green-700">
                                        <FaLockOpen size={12} /> Contact accepté des deux côtés
                                    </p>
                                ) : m.myChoice === 'wants_contact' ? (
                                    <p className="mt-2 text-sm text-amber-700">En attente de la réponse de l'autre membre…</p>
                                ) : m.myChoice === 'declined' ? (
                                    <p className="mt-2 text-sm text-gray-500">Vous avez décliné.</p>
                                ) : (
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            disabled={pending === m.matchId + 'wants_contact'}
                                            onClick={() => choose(m, 'wants_contact')}
                                            className="flex items-center gap-1 rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                                        >
                                            <FaCheck size={11} /> Je souhaite être contacté(e)
                                        </button>
                                        <button
                                            disabled={pending === m.matchId + 'declined'}
                                            onClick={() => choose(m, 'declined')}
                                            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-40"
                                        >
                                            <FaTimes size={11} /> Pas plus loin
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SbcLoveMatches;
