import { describe, it, expect } from 'vitest'
import { safeRedirectPath, DEFAULT_REDIRECT_PATH } from '@/lib/utils/safe-redirect'

describe('safeRedirectPath', () => {
  it('keeps same-origin paths with query and hash', () => {
    expect(safeRedirectPath('/camera')).toBe('/camera')
    expect(safeRedirectPath('/jobs/123')).toBe('/jobs/123')
    expect(safeRedirectPath('/camera?job=abc&stage=job_start')).toBe('/camera?job=abc&stage=job_start')
    expect(safeRedirectPath('/queue#failed')).toBe('/queue#failed')
  })

  it('falls back for missing values', () => {
    expect(safeRedirectPath(null)).toBe(DEFAULT_REDIRECT_PATH)
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_REDIRECT_PATH)
    expect(safeRedirectPath('')).toBe(DEFAULT_REDIRECT_PATH)
  })

  it.each([
    'https://evil.example',
    'http://evil.example/camera',
    '//evil.example',
    '//evil.example/camera',
    '/\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    'javascript:alert(1)',
    'camera',
  ])('rejects off-origin or non-path value %j', (value) => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_REDIRECT_PATH)
  })

  it('uses the given fallback', () => {
    expect(safeRedirectPath('//evil.example', '/jobs')).toBe('/jobs')
  })
})
