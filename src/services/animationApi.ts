import { sbcApiService } from './SBCApiService';
import type { ApiResponse } from './ApiResponse';
import { getBaseUrl } from '../utils/apiHelpers';

/**
 * SBC Événement — « Animation & Engagement » (challenges, votes, rewards).
 * Thin wrappers over event-service's /tickets/animation/* routes; every call
 * returns the usual ApiResponse (check `apiReportedSuccess`, read `body.data`).
 * Errors carry a machine `body.code` (e.g. QUOTA_EXHAUSTED, LOCKED_FIELDS) and
 * sometimes `body.details`.
 */

const A = '/tickets/animation';
const P = `${A}/public`;
const M = (eventId: string) => `${A}/manage/events/${eventId}`;
const pub = { requiresAuth: false } as const;

export const animationApi = {
    // ---------- public ----------
    eventChallenges: (slug: string): Promise<ApiResponse> => sbcApiService.get(`${P}/events/${encodeURIComponent(slug)}/challenges`, pub),
    resolveChallenge: (slug: string, cslug: string): Promise<ApiResponse> =>
        sbcApiService.get(`${P}/events/${encodeURIComponent(slug)}/challenges/${encodeURIComponent(cslug)}`, pub),
    challenge: (id: string): Promise<ApiResponse> => sbcApiService.get(`${P}/challenges/${id}`, pub),
    candidates: (id: string, q: { q?: string; page?: number; limit?: number; sort?: 'number' | 'votes' | 'recent' } = {}): Promise<ApiResponse> =>
        sbcApiService.get(`${P}/challenges/${id}/candidates`, { ...pub, queryParameters: q }),
    candidateByNumber: (id: string, n: number): Promise<ApiResponse> => sbcApiService.get(`${P}/challenges/${id}/candidates/by-number/${n}`, pub),
    candidate: (candidateId: string): Promise<ApiResponse> => sbcApiService.get(`${P}/candidates/${candidateId}`, pub),
    board: (id: string): Promise<ApiResponse> => sbcApiService.get(`${P}/challenges/${id}/board`, { ...pub, skipDeduplication: true }),
    /** Server-Sent Events URL for the live board (EventSource can't send headers: public data only). */
    streamUrl: (id: string): string => `${getBaseUrl()}${P}/challenges/${id}/stream`,
    result: (id: string): Promise<ApiResponse> => sbcApiService.get(`${P}/challenges/${id}/result`, pub),
    drawProof: (drawId: string): Promise<ApiResponse> => sbcApiService.get(`${P}/draws/${drawId}/proof`, pub),
    eventDraws: (slug: string): Promise<ApiResponse> => sbcApiService.get(`${P}/events/${encodeURIComponent(slug)}/draws`, pub),

    // ---------- signed-in member ----------
    me: (id: string, candidateId?: string): Promise<ApiResponse> => sbcApiService.get(`${A}/challenges/${id}/me`, { queryParameters: { candidateId }, skipDeduplication: true }),
    register: (id: string, body: { displayName: string; photoFileId?: string; videoFileId?: string; description?: string; category?: string }): Promise<ApiResponse> =>
        sbcApiService.post(`${A}/challenges/${id}/register`, { body }),
    updateCandidacy: (candidateId: string, body: Record<string, unknown>): Promise<ApiResponse> => sbcApiService.patch(`${A}/candidacies/${candidateId}`, { body }),
    withdraw: (candidateId: string): Promise<ApiResponse> => sbcApiService.post(`${A}/candidacies/${candidateId}/withdraw`, { body: {} }),
    myCandidacies: (): Promise<ApiResponse> => sbcApiService.get(`${A}/me/candidacies`, { skipDeduplication: true }),
    freeVote: (id: string, candidateId: string): Promise<ApiResponse> => sbcApiService.post(`${A}/challenges/${id}/free-votes`, { body: { candidateId } }),
    buyVotes: (id: string, body: { candidateId: string; packageId: string; idempotencyKey: string }): Promise<ApiResponse> =>
        sbcApiService.post(`${A}/challenges/${id}/vote-purchases`, { body }),
    myVoteTransaction: (txId: string): Promise<ApiResponse> => sbcApiService.get(`${A}/me/vote-transactions/${txId}`, { skipDeduplication: true }),
    myVoteTransactions: (): Promise<ApiResponse> => sbcApiService.get(`${A}/me/vote-transactions`, { skipDeduplication: true }),
    myRewards: (): Promise<ApiResponse> => sbcApiService.get(`${A}/me/rewards`, { skipDeduplication: true }),
    myTeams: (): Promise<ApiResponse> => sbcApiService.get(`${A}/me/teams`),
    acceptInvite: (token: string): Promise<ApiResponse> => sbcApiService.post(`${A}/invites/${encodeURIComponent(token)}/accept`, { body: {} }),

    // ---------- jury ----------
    juryAssignments: (): Promise<ApiResponse> => sbcApiService.get(`${A}/jury/assignments`, { skipDeduplication: true }),
    juryChallenge: (id: string): Promise<ApiResponse> => sbcApiService.get(`${A}/jury/challenges/${id}`, { skipDeduplication: true }),
    saveScore: (id: string, candidateId: string, body: { scores: { key: string; value: number }[]; comment?: string; submit?: boolean }): Promise<ApiResponse> =>
        sbcApiService.put(`${A}/jury/challenges/${id}/candidates/${candidateId}/score`, { body }),

    // ---------- event team (organizer, manager, moderator, staff) ----------
    manage: {
        me: (eventId: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/me`, { skipDeduplication: true }),
        overview: (eventId: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/overview`, { skipDeduplication: true }),
        lookupMember: (eventId: string, contact: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/members/lookup`, { queryParameters: { contact }, skipDeduplication: true }),

        team: (eventId: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/team`, { skipDeduplication: true }),
        addTeam: (eventId: string, body: { contact?: string; userId?: string; role: 'MANAGER' | 'MODERATOR' | 'STAFF'; allEvents?: boolean }): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/team`, { body }),
        removeTeam: (eventId: string, memberId: string): Promise<ApiResponse> => sbcApiService.delete(`${M(eventId)}/team/${memberId}`),
        revokeInvite: (eventId: string, inviteId: string): Promise<ApiResponse> => sbcApiService.delete(`${M(eventId)}/invites/${inviteId}`),
        /** Event ticket types — readable by every team role (eligibility pickers). */
        ticketTypes: (eventId: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/ticket-types`, { skipDeduplication: true }),
        reward: (eventId: string, rid: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/rewards/${rid}`, { skipDeduplication: true }),

        challenges: (eventId: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/challenges`, { skipDeduplication: true }),
        createChallenge: (eventId: string, body: Record<string, unknown>): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/challenges`, { body }),
        challenge: (eventId: string, cid: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/challenges/${cid}`, { skipDeduplication: true }),
        updateChallenge: (eventId: string, cid: string, body: Record<string, unknown>): Promise<ApiResponse> => sbcApiService.patch(`${M(eventId)}/challenges/${cid}`, { body }),
        transition: (eventId: string, cid: string, to: string, reason?: string): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/challenges/${cid}/transition`, { body: { to, reason } }),
        cancel: (eventId: string, cid: string, reason: string): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/challenges/${cid}/cancel`, { body: { reason } }),
        requestChange: (eventId: string, cid: string, patch: Record<string, unknown>, reason: string): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/challenges/${cid}/change-requests`, { body: { patch, reason } }),
        changeRequests: (eventId: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/change-requests`, { skipDeduplication: true }),

        packages: (eventId: string, cid: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/challenges/${cid}/packages`, { skipDeduplication: true }),
        createPackage: (eventId: string, cid: string, body: { label: string; votes: number; price: number; availableFrom?: string; availableUntil?: string }): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/challenges/${cid}/packages`, { body }),
        updatePackage: (eventId: string, pid: string, body: Record<string, unknown>): Promise<ApiResponse> => sbcApiService.patch(`${M(eventId)}/packages/${pid}`, { body }),
        archivePackage: (eventId: string, pid: string): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/packages/${pid}/archive`, { body: {} }),

        candidates: (eventId: string, cid: string, q: { status?: string; q?: string; page?: number; limit?: number; sort?: string } = {}): Promise<ApiResponse> =>
            sbcApiService.get(`${M(eventId)}/challenges/${cid}/candidates`, { queryParameters: q, skipDeduplication: true }),
        addCandidate: (eventId: string, cid: string, body: { userId: string; displayName: string; photoFileId?: string; description?: string; category?: string }): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/challenges/${cid}/candidates`, { body }),
        moderate: (eventId: string, candidateId: string, action: 'approve' | 'reject' | 'disqualify', reason?: string): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/candidates/${candidateId}/${action}`, { body: { reason } }),

        jury: (eventId: string, cid: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/challenges/${cid}/jury`, { skipDeduplication: true }),
        addJuror: (eventId: string, cid: string, body: { contact?: string; userId?: string }): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/challenges/${cid}/jury`, { body }),
        removeJuror: (eventId: string, cid: string, userId: string): Promise<ApiResponse> => sbcApiService.delete(`${M(eventId)}/challenges/${cid}/jury/${userId}`),

        transactions: (eventId: string, cid: string, q: { status?: string; page?: number; limit?: number } = {}): Promise<ApiResponse> =>
            sbcApiService.get(`${M(eventId)}/challenges/${cid}/transactions`, { queryParameters: q, skipDeduplication: true }),
        votes: (eventId: string, cid: string, q: { page?: number; limit?: number } = {}): Promise<ApiResponse> =>
            sbcApiService.get(`${M(eventId)}/challenges/${cid}/votes`, { queryParameters: q, skipDeduplication: true }),
        board: (eventId: string, cid: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/challenges/${cid}/board`, { skipDeduplication: true }),
        history: (eventId: string, cid: string, candidateId?: string): Promise<ApiResponse> =>
            sbcApiService.get(`${M(eventId)}/challenges/${cid}/history`, { queryParameters: { candidateId }, skipDeduplication: true }),

        result: (eventId: string, cid: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/challenges/${cid}/result`, { skipDeduplication: true }),
        computeResult: (eventId: string, cid: string): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/challenges/${cid}/result/compute`, { body: {} }),
        resolveTie: (eventId: string, cid: string, body: { rank: number; order: string[]; note: string }): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/challenges/${cid}/result/resolve-tie`, { body }),
        secondRound: (eventId: string, cid: string, body: { votingOpensAt: string; votingClosesAt: string }): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/challenges/${cid}/result/second-round`, { body }),
        freeze: (eventId: string, cid: string): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/challenges/${cid}/result/freeze`, { body: {} }),
        publish: (eventId: string, cid: string): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/challenges/${cid}/result/publish`, { body: {} }),

        rewards: (eventId: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/rewards`, { skipDeduplication: true }),
        createReward: (eventId: string, body: Record<string, unknown>): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/rewards`, { body }),
        updateReward: (eventId: string, rid: string, body: Record<string, unknown>): Promise<ApiResponse> => sbcApiService.patch(`${M(eventId)}/rewards/${rid}`, { body }),
        cancelReward: (eventId: string, rid: string, reason: string): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/rewards/${rid}/cancel`, { body: { reason } }),
        rules: (eventId: string, rid: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/rewards/${rid}/rules`, { skipDeduplication: true }),
        createRule: (eventId: string, rid: string, body: Record<string, unknown>): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/rewards/${rid}/rules`, { body }),
        activateRule: (eventId: string, ruleId: string): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/rules/${ruleId}/activate`, { body: {} }),
        requestRuleChange: (eventId: string, ruleId: string, reason: string): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/rules/${ruleId}/request-change`, { body: { reason } }),
        drawNow: (eventId: string, ruleId: string): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/rules/${ruleId}/draw`, { body: {} }),
        draws: (eventId: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/draws`, { skipDeduplication: true }),
        winners: (eventId: string, rewardId?: string): Promise<ApiResponse> => sbcApiService.get(`${M(eventId)}/winners`, { queryParameters: { rewardId }, skipDeduplication: true }),
        award: (eventId: string, rid: string, body: { userId: string; note?: string }): Promise<ApiResponse> => sbcApiService.post(`${M(eventId)}/rewards/${rid}/award`, { body }),
        winnerAction: (eventId: string, wid: string, action: 'deliver' | 'forfeit' | 'revoke', body: { note?: string; proofFileId?: string } = {}): Promise<ApiResponse> =>
            sbcApiService.post(`${M(eventId)}/winners/${wid}/${action}`, { body }),

        audit: (eventId: string, q: { challengeId?: string; page?: number; limit?: number } = {}): Promise<ApiResponse> =>
            sbcApiService.get(`${M(eventId)}/audit`, { queryParameters: q, skipDeduplication: true }),
        /** Authenticated file download (exports need the bearer token, so not a plain link). */
        exportUrl: (eventId: string, kind: string, format: 'csv' | 'xlsx' | 'pdf', challengeId?: string): string =>
            `${getBaseUrl()}${M(eventId)}/exports/${kind}.${format}${challengeId ? `?challengeId=${challengeId}` : ''}`,
    },
};

/** Downloads a protected file with the session token and saves it. */
export const downloadWithAuth = async (url: string, filename: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
        let message = 'Export impossible.';
        try { message = (await res.json()).message || message; } catch { /* binary or empty */ }
        throw new Error(message);
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

/** A fresh key per purchase click (server dedupes a double tap on it). */
export const newIdempotencyKey = () =>
    (crypto as any).randomUUID ? (crypto as any).randomUUID().replace(/-/g, '') : `${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
