/**
 * Post-login redirect target validation.
 *
 * `redirectTo` arrives in the query string, so it is attacker-controlled.
 * Only same-origin relative paths are allowed; absolute URLs, protocol-relative
 * forms (`//host`), backslash forms (`/\host`) and paths the URL parser would
 * turn into another host (e.g. with embedded tabs/newlines, or dot-segments that
 * collapse into //host) fall back.
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
    const path = `${url.pathname}${url.search}${url.hash}`
    // Dot-segments can collapse into a host: '/.//evil.com' has pathname '//evil.com'.
    // Check the result the caller will resolve, not only the input.
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
      return fallback
    }
    if (new URL(path, BASE_ORIGIN).origin !== BASE_ORIGIN) {
      return fallback
    }
    return path
  } catch {
    return fallback
  }
}
