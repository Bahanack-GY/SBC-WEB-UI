/**
 * Tactile and audible feedback for interactive UI.
 *
 * Chat felt dead: taps, sends and arrivals all produced nothing. These are the
 * two cheap signals a messaging app is expected to give — a short vibration on
 * touch, a soft tone when a message leaves or lands.
 *
 * Both are best-effort and must never break a flow: vibration is unsupported on
 * iOS Safari and throws in some embedded browsers, and audio is blocked until
 * the user has interacted with the page. Every call is guarded.
 */

type HapticPattern = 'light' | 'medium' | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 20,
    success: [12, 40, 12],
    error: [30, 60, 30],
};

export const haptic = (pattern: HapticPattern = 'light'): void => {
    try {
        navigator.vibrate?.(PATTERNS[pattern]);
    } catch {
        // Unsupported or blocked; feedback is a nicety, never a requirement.
    }
};

// One context for the page. Created lazily because constructing it before any
// user gesture leaves it suspended in most browsers.
let audioContext: AudioContext | null = null;

const getContext = (): AudioContext | null => {
    try {
        if (!audioContext) {
            const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return null;
            audioContext = new Ctor();
        }
        if (audioContext.state === 'suspended') void audioContext.resume();
        return audioContext;
    } catch {
        return null;
    }
};

/**
 * Synthesised rather than loaded from a file: two short tones cost nothing to
 * ship, need no asset pipeline, and start instantly on a slow connection.
 */
const tone = (frequency: number, durationMs: number, volume = 0.05): void => {
    const ctx = getContext();
    if (!ctx) return;
    try {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        const now = ctx.currentTime;
        const end = now + durationMs / 1000;
        // Ramped, not switched: an abrupt stop clicks.
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(end);
    } catch {
        // Autoplay policy or an unavailable device.
    }
};

/** Rising blip: the message left. */
export const soundMessageSent = (): void => {
    tone(660, 90);
};

/** Softer, lower blip: a message arrived. */
export const soundMessageReceived = (): void => {
    tone(440, 120, 0.04);
};

/** Tap feedback for buttons and list rows. */
export const tapFeedback = (): void => haptic('light');
