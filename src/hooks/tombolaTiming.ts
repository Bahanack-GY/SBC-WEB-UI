// Timings of the SBC Tombola screen, in their own module so tests can shorten them.

/** While winners are being revealed (or the final is live): the server caches 5 s. */
export const TOMBOLA_LIVE_POLL_MS = 3 * 1000;
export const TOMBOLA_IDLE_POLL_MS = 60 * 1000;
/** How long the « drawing » effect runs before landing on a new winner. */
export const TOMBOLA_REVEAL_MS = 2600;
export const TOMBOLA_REVEAL_REDUCED_MS = 700;
