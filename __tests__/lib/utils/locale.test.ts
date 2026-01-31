/**
 * Unit Tests for Locale Utilities
 * 
 * Tests the locale-aware content selection helpers.
 * **Validates: Requirements 3.2.1, 3.2.2, 3.2.3**
 */

import { describe, it, expect } from 'vitest'
import { 
  getLocalizedContent, 
  getLocalizedContentNullable,
  type Locale 
} from '@/lib/utils/locale'

describe('Locale Utilities', () => {
  describe('getLocalizedContent', () => {
    describe('English locale (en)', () => {
      const locale: Locale = 'en'

      it('should return default value when locale is en', () => {
        const result = getLocalizedContent(locale, 'Cargo Front View', 'Foto Depan Kargo')
        expect(result).toBe('Cargo Front View')
      })

      it('should return default value even when localized is null', () => {
        const result = getLocalizedContent(locale, 'Cargo Front View', null)
        expect(result).toBe('Cargo Front View')
      })

      it('should return default value even when localized is undefined', () => {
        const result = getLocalizedContent(locale, 'Cargo Front View', undefined)
        expect(result).toBe('Cargo Front View')
      })

      it('should return default value for empty localized string', () => {
        const result = getLocalizedContent(locale, 'Cargo Front View', '')
        expect(result).toBe('Cargo Front View')
      })
    })

    describe('Indonesian locale (id)', () => {
      const locale: Locale = 'id'

      it('should return localized value when available', () => {
        const result = getLocalizedContent(locale, 'Cargo Front View', 'Foto Depan Kargo')
        expect(result).toBe('Foto Depan Kargo')
      })

      it('should fall back to default when localized is null', () => {
        const result = getLocalizedContent(locale, 'Cargo Front View', null)
        expect(result).toBe('Cargo Front View')
      })

      it('should fall back to default when localized is undefined', () => {
        const result = getLocalizedContent(locale, 'Cargo Front View', undefined)
        expect(result).toBe('Cargo Front View')
      })

      it('should return empty string if localized is empty string', () => {
        // Empty string is a valid value (not null/undefined)
        const result = getLocalizedContent(locale, 'Cargo Front View', '')
        expect(result).toBe('')
      })
    })

    describe('Real-world examples', () => {
      it('should handle title localization', () => {
        expect(getLocalizedContent('en', 'Cargo Front View', 'Foto Depan Kargo'))
          .toBe('Cargo Front View')
        expect(getLocalizedContent('id', 'Cargo Front View', 'Foto Depan Kargo'))
          .toBe('Foto Depan Kargo')
      })

      it('should handle description localization', () => {
        const defaultDesc = 'Take photo of cargo from the front before loading'
        const localizedDesc = 'Ambil foto kargo dari depan sebelum dimuat'
        
        expect(getLocalizedContent('en', defaultDesc, localizedDesc))
          .toBe(defaultDesc)
        expect(getLocalizedContent('id', defaultDesc, localizedDesc))
          .toBe(localizedDesc)
      })

      it('should handle missing Indonesian translation', () => {
        const defaultTitle = 'Loading Document'
        
        expect(getLocalizedContent('id', defaultTitle, null))
          .toBe(defaultTitle)
      })
    })
  })

  describe('getLocalizedContentNullable', () => {
    describe('English locale (en)', () => {
      const locale: Locale = 'en'

      it('should return default value when available', () => {
        const result = getLocalizedContentNullable(locale, 'Description text', 'Teks deskripsi')
        expect(result).toBe('Description text')
      })

      it('should return null when default is null', () => {
        const result = getLocalizedContentNullable(locale, null, 'Teks deskripsi')
        expect(result).toBeNull()
      })

      it('should return null when default is undefined', () => {
        const result = getLocalizedContentNullable(locale, undefined, 'Teks deskripsi')
        expect(result).toBeNull()
      })
    })

    describe('Indonesian locale (id)', () => {
      const locale: Locale = 'id'

      it('should return localized value when available', () => {
        const result = getLocalizedContentNullable(locale, 'Description text', 'Teks deskripsi')
        expect(result).toBe('Teks deskripsi')
      })

      it('should fall back to default when localized is null', () => {
        const result = getLocalizedContentNullable(locale, 'Description text', null)
        expect(result).toBe('Description text')
      })

      it('should return null when both are null', () => {
        const result = getLocalizedContentNullable(locale, null, null)
        expect(result).toBeNull()
      })

      it('should return null when default is null and localized is undefined', () => {
        const result = getLocalizedContentNullable(locale, null, undefined)
        expect(result).toBeNull()
      })
    })

    describe('Real-world examples', () => {
      it('should handle nullable description field', () => {
        // Description exists in both languages
        expect(getLocalizedContentNullable('en', 'Take photo', 'Ambil foto'))
          .toBe('Take photo')
        expect(getLocalizedContentNullable('id', 'Take photo', 'Ambil foto'))
          .toBe('Ambil foto')
      })

      it('should handle missing description', () => {
        // No description in either language
        expect(getLocalizedContentNullable('en', null, null))
          .toBeNull()
        expect(getLocalizedContentNullable('id', null, null))
          .toBeNull()
      })

      it('should handle partial translation', () => {
        // English description exists, Indonesian doesn't
        expect(getLocalizedContentNullable('id', 'Take photo', null))
          .toBe('Take photo')
      })
    })
  })
})
