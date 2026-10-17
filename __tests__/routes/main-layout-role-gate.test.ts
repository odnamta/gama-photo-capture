import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { checkUserRole } from '@/lib/auth/check-role'
import MainLayout from '@/app/(main)/layout'

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  })
)

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/auth/check-role', () => ({
  checkUserRole: vi.fn(),
}))

vi.mock('@/contexts/sync-context', () => ({
  SyncProvider: ({ children }: { children: unknown }) => children,
}))

function setup(user: { id: string } | null, allowed: boolean) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>)

  vi.mocked(checkUserRole).mockResolvedValue({
    allowed,
    profile: null,
    error: allowed ? null : 'Your role does not have access',
  })
}

describe('MainLayout role gate', () => {
  beforeEach(() => {
    redirectMock.mockClear()
  })

  it('redirects to /login when there is no user', async () => {
    setup(null, false)
    await expect(MainLayout({ children: null })).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects to /access-denied when the role check is not allowed', async () => {
    setup({ id: 'u1' }, false)
    await expect(MainLayout({ children: null })).rejects.toThrow('NEXT_REDIRECT:/access-denied')
    expect(redirectMock).toHaveBeenCalledWith('/access-denied')
  })

  it('renders children when the role check is allowed', async () => {
    setup({ id: 'u1' }, true)
    await expect(MainLayout({ children: 'content' })).resolves.toBeTruthy()
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
