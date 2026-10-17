/**
 * Full-page navigation to another URL (a payment page, typically).
 *
 * Its own module so tests can replace it: jsdom does not implement navigation,
 * and window.location cannot be redefined there.
 */
export function redirectTo(url: string): void {
  window.location.href = url;
}
