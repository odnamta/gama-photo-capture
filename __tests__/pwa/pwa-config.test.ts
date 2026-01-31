/**
 * Unit Tests for PWA Configuration
 * 
 * Tests that PWA manifest and configuration are properly set up.
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('PWA Configuration Tests', () => {
  describe('Manifest File', () => {
    it('should have manifest.ts file', () => {
      const manifestPath = path.join(process.cwd(), 'app', 'manifest.ts')
      expect(fs.existsSync(manifestPath)).toBe(true)
    })

    it('should export a function that returns manifest object', async () => {
      const manifest = await import('@/app/manifest')
      expect(typeof manifest.default).toBe('function')
      
      const result = manifest.default()
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should have required name field', async () => {
      const manifest = await import('@/app/manifest')
      const result = manifest.default()
      
      expect(result.name).toBeDefined()
      expect(result.name).toBe('GAMA Photo Capture')
    })

    it('should have required short_name field', async () => {
      const manifest = await import('@/app/manifest')
      const result = manifest.default()
      
      expect(result.short_name).toBeDefined()
      expect(result.short_name).toBe('GAMA Photos')
    })

    it('should have display set to standalone', async () => {
      const manifest = await import('@/app/manifest')
      const result = manifest.default()
      
      expect(result.display).toBe('standalone')
    })

    it('should have start_url defined', async () => {
      const manifest = await import('@/app/manifest')
      const result = manifest.default()
      
      expect(result.start_url).toBeDefined()
      expect(result.start_url).toBe('/')
    })

    it('should have theme_color defined', async () => {
      const manifest = await import('@/app/manifest')
      const result = manifest.default()
      
      expect(result.theme_color).toBeDefined()
    })

    it('should have background_color defined', async () => {
      const manifest = await import('@/app/manifest')
      const result = manifest.default()
      
      expect(result.background_color).toBeDefined()
    })

    it('should have icons array with required sizes', async () => {
      const manifest = await import('@/app/manifest')
      const result = manifest.default()
      
      expect(result.icons).toBeDefined()
      expect(Array.isArray(result.icons)).toBe(true)
      
      const icons = result.icons!
      expect(icons.length).toBeGreaterThanOrEqual(2)
      
      // Check for 192x192 icon
      const icon192 = icons.find((icon: { sizes?: string }) => icon.sizes === '192x192')
      expect(icon192).toBeDefined()
      
      // Check for 512x512 icon
      const icon512 = icons.find((icon: { sizes?: string }) => icon.sizes === '512x512')
      expect(icon512).toBeDefined()
    })

    it('should have maskable icon', async () => {
      const manifest = await import('@/app/manifest')
      const result = manifest.default()
      
      const icons = result.icons!
      const maskableIcon = icons.find((icon: { purpose?: string }) => icon.purpose === 'maskable')
      expect(maskableIcon).toBeDefined()
    })
  })

  describe('PWA Icons', () => {
    const iconsDir = path.join(process.cwd(), 'public', 'icons')

    it('should have icons directory', () => {
      expect(fs.existsSync(iconsDir)).toBe(true)
    })

    it('should have 192x192 icon', () => {
      const iconPath = path.join(iconsDir, 'icon-192.svg')
      expect(fs.existsSync(iconPath)).toBe(true)
    })

    it('should have 512x512 icon', () => {
      const iconPath = path.join(iconsDir, 'icon-512.svg')
      expect(fs.existsSync(iconPath)).toBe(true)
    })

    it('should have maskable icon', () => {
      const iconPath = path.join(iconsDir, 'maskable-icon.svg')
      expect(fs.existsSync(iconPath)).toBe(true)
    })
  })

  describe('Service Worker', () => {
    it('should have service worker file', () => {
      const swPath = path.join(process.cwd(), 'public', 'sw.js')
      expect(fs.existsSync(swPath)).toBe(true)
    })

    it('should have install event handler', () => {
      const swPath = path.join(process.cwd(), 'public', 'sw.js')
      const content = fs.readFileSync(swPath, 'utf-8')
      
      expect(content).toContain("addEventListener('install'")
    })

    it('should have activate event handler', () => {
      const swPath = path.join(process.cwd(), 'public', 'sw.js')
      const content = fs.readFileSync(swPath, 'utf-8')
      
      expect(content).toContain("addEventListener('activate'")
    })

    it('should have fetch event handler', () => {
      const swPath = path.join(process.cwd(), 'public', 'sw.js')
      const content = fs.readFileSync(swPath, 'utf-8')
      
      expect(content).toContain("addEventListener('fetch'")
    })
  })

  describe('Service Worker Hook', () => {
    it('should have service worker hook file', () => {
      const hookPath = path.join(process.cwd(), 'hooks', 'use-service-worker.ts')
      expect(fs.existsSync(hookPath)).toBe(true)
    })

    it('should register service worker', () => {
      const hookPath = path.join(process.cwd(), 'hooks', 'use-service-worker.ts')
      const content = fs.readFileSync(hookPath, 'utf-8')
      
      expect(content).toContain('serviceWorker')
      expect(content).toContain('register')
    })
  })
})
