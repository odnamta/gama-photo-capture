import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

const ORIGIN = 'http://localhost:3001'

function runUpdateSession(url: string, user: { id: string } | null) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  } as unknown as ReturnType<typeof createServerClient>)
  return updateSession(new NextRequest(new URL(url, ORIGIN)))
}

describe('updateSession redirects', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  it('keeps the query string when sending an unauthenticated user to login', async () => {
    const response = await runUpdateSession('/camera?job=abc&stage=job_start', null)
    const location = new URL(response.headers.get('location')!, ORIGIN)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('redirectTo')).toBe('/camera?job=abc&stage=job_start')
  })

  it('redirects a signed-in user on /login to a same-origin redirectTo', async () => {
    const response = await runUpdateSession('/login?redirectTo=%2Fjobs%2F42', { id: 'u1' })
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe(ORIGIN)
    expect(location.pathname).toBe('/jobs/42')
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
  ])('never redirects a signed-in user off-origin (redirectTo=%j)', async (target) => {
    const response = await runUpdateSession(
      `/login?redirectTo=${encodeURIComponent(target)}`,
      { id: 'u1' }
    )
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe(ORIGIN)
    expect(location.pathname).toBe('/camera')
  })
})
