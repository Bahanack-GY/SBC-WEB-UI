/**
 * Relance is hidden on production until the redesign has been reviewed
 * (Sterling, 2026-10-05). Preprod and local dev keep it, so it can be reviewed
 * there. Hidden means no menu entry, no Home tile, no Packs publicité page, and
 * every /relance URL sends the member home. The backend keeps running: credits
 * already bought and campaigns already launched still send.
 *
 * To show it again, delete this check and its uses.
 */
export const RELANCE_VISIBLE =
  typeof window === 'undefined' ||
  !/^(www\.)?sniperbuisnesscenter\.com$/.test(window.location.hostname);
