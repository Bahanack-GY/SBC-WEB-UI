import { useRef, useState } from 'react';

const CHARACTER = /^[a-zA-Z0-9]$/;

/**
 * Shared state for the 6-box OTP inputs (login, signup, email verification).
 *
 * Pasting used to leave only the first character. `handlePaste` filled all six
 * boxes, but without `preventDefault` the browser then performed its own paste
 * into the focused input; `maxLength={1}` truncated that to one character, and
 * the resulting `onChange` rebuilt state from a stale closure — wiping the five
 * the paste handler had just written. On a phone, where the code is pasted
 * rather than typed, that made the screen unusable.
 *
 * Every state update below goes through the functional form for the same
 * reason: two updates can land in one batch, and the second must not be built
 * from a snapshot taken before the first.
 */
export function useOtpInput(length = 6) {
    const [otp, setOtp] = useState<string[]>(() => Array(length).fill(''));
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const focus = (index: number) => {
        inputs.current[Math.min(Math.max(index, 0), length - 1)]?.focus();
    };

    /**
     * Writes `text` across the boxes starting at `start`, ignoring separators.
     *
     * Separators matter: "123 456" is a normal thing to copy out of an SMS, and
     * any length cap applied before this point would eat a character.
     */
    const fillFrom = (start: number, text: string) => {
        const characters = text.replace(/[^a-zA-Z0-9]/g, '').slice(0, length - start).split('');
        if (!characters.length) return;

        setOtp(previous => {
            const next = [...previous];
            characters.forEach((character, offset) => { next[start + offset] = character; });
            return next;
        });

        // After the state commits, so the focused box is the one the user types into.
        setTimeout(() => focus(start + characters.length), 0);
    };

    const handleChange = (index: number, value: string) => {
        // The main paste path on mobile.
        //
        // Long-press → Paste usually arrives as an input event rather than a paste
        // event, so onPaste never fires. The boxes therefore carry no maxLength:
        // with maxLength={1} the DOM truncated the pasted string to one character
        // before this handler ever saw it, which is why "paste only fills the
        // first box" survived a fix that only addressed the paste event.
        if (value.length > 1) {
            fillFrom(index, value);
            return;
        }

        if (value !== '' && !CHARACTER.test(value)) return;

        setOtp(previous => {
            const next = [...previous];
            next[index] = value;
            return next;
        });

        if (value) focus(index + 1);
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !otp[index] && index > 0) {
            focus(index - 1);
        }
    };

    const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
        // The fix. Without this the browser's own paste follows ours and undoes it.
        event.preventDefault();
        fillFrom(index, event.clipboardData.getData('text'));
    };

    const reset = () => setOtp(Array(length).fill(''));

    return { otp, inputs, handleChange, handleKeyDown, handlePaste, reset, code: otp.join('') };
}
