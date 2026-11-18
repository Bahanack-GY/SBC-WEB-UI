import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { sbcApiService } from '../../services/SBCApiService';
import { unwrap } from './support';

/**
 * Live request updates through LiveKit (support-service realtime.service).
 *
 * While a member is on an Aide page, one shared connection listens to the
 * member's own room (listen-only token). A signal says only which request
 * changed; the page then reloads it through the normal API. Pages keep polling
 * as a fallback, fast when the connection is down or LiveKit is not configured.
 */

type TokenAnswer = { enabled: false } | { enabled: true; url: string; room: string; token: string };

let users = 0;
let connected = false;
let stopTimer: ReturnType<typeof setTimeout> | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;
let attempt = 0;
let room: { disconnect: () => Promise<void> } | null = null;
let starting = false;
let client: QueryClient | null = null;
const listeners = new Set<() => void>();
const setConnected = (v: boolean) => { if (v !== connected) { connected = v; listeners.forEach((l) => l()); } };

export function parseSignal(bytes: Uint8Array, topic?: string): { ticketId: string } | null {
    if (topic && topic !== 'support') return null;
    try {
        const v = JSON.parse(new TextDecoder().decode(bytes));
        return v && v.type === 'ticket' && typeof v.ticketId === 'string' ? v : null;
    } catch {
        return null;
    }
}

const onSignal = (s: { ticketId: string }) => {
    void client?.invalidateQueries({ queryKey: ['support', 'ticket', s.ticketId] });
    void client?.invalidateQueries({ queryKey: ['support', 'tickets'] });
};

async function connect() {
    if (starting || room || users === 0) return;
    starting = true;
    try {
        const t = unwrap<TokenAnswer>(await sbcApiService.supportRealtimeToken());
        if (!t?.enabled || users === 0) return;
        const { Room, RoomEvent } = await import('livekit-client');
        const r = new Room({ adaptiveStream: false, dynacast: false });
        r.on(RoomEvent.DataReceived, (payload: Uint8Array, _p: unknown, _k: unknown, topic?: string) => {
            const s = parseSignal(payload, topic);
            if (s) onSignal(s);
        });
        r.on(RoomEvent.Disconnected, () => { room = null; setConnected(false); schedule(); });
        r.on(RoomEvent.Reconnecting, () => setConnected(false));
        r.on(RoomEvent.Reconnected, () => setConnected(true));
        await r.connect(t.url, t.token, { autoSubscribe: false });
        if (users === 0) { await r.disconnect(); return; }
        room = r;
        attempt = 0;
        setConnected(true);
        void client?.invalidateQueries({ queryKey: ['support'] }); // catch up on what happened before
    } catch {
        setConnected(false);
        schedule();
    } finally {
        starting = false;
    }
}

function schedule() {
    clearTimeout(retry);
    if (users === 0) return;
    retry = setTimeout(() => void connect(), Math.min(60_000, 5_000 * 2 ** attempt++));
}

/**
 * Call on each Aide page that shows requests. Returns whether the live
 * connection is up, so the page can poll slowly while it is.
 */
export function useSupportLive(): boolean {
    const qc = useQueryClient();
    useEffect(() => {
        client = qc;
        users++;
        clearTimeout(stopTimer);
        void connect();
        return () => {
            users--;
            // Leave the room shortly after the member leaves the Aide pages (page to page keeps it).
            stopTimer = setTimeout(() => {
                if (users > 0) return;
                clearTimeout(retry);
                setConnected(false);
                void room?.disconnect();
                room = null;
            }, 3_000);
        };
    }, [qc]);
    return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => connected, () => false);
}

/** Polling interval for a live page: fast without the connection, a safety net with it. */
export const livePoll = (isConnected: boolean, fastMs: number) => (isConnected ? 60_000 : fastMs);
