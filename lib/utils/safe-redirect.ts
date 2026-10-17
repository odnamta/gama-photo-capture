/**
 * Post-login redirect target validation.
 *
 * `redirectTo` arrives in the query string, so it is attacker-controlled.
 * Only same-origin relative paths are allowed; absolute URLs, protocol-relative
 * forms (`//host`), backslash forms (`/\host`) and paths the URL parser would
 * turn into another host (e.g. with embedded tabs/newlines) fall back.
 */

const BASE_ORIGIN = 'http://localhost'

export const DEFAULT_REDIRECT_PATH = '/camera'

export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT_PATH
): string {
  if (!value || !value.startsWith('/')) {
    return fallback
  }

  try {
    const url = new URL(value, BASE_ORIGIN)
    if (url.origin !== BASE_ORIGIN) {
      return fallback
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
