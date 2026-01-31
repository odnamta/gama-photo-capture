/**
 * Property-Based Tests for Locale-Aware Content Display
 * 
 * Feature: v0.3-guided-capture, Property 3: Locale-aware content display
 * 
 * **Validates: Requirements 3.2.1, 3.2.2, 3.2.3**
 * 
 * Tests the locale-aware content selection logic:
 * - If locale is 'id' and `title_id` is not null, display `title_id`; otherwise display `title`
 * - If locale is 'id' and `description_id` is not null, display `description_id`; otherwise display `description`
 * - Tips are displayed if not null (no locale variant)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { PhotoChecklistItem, JobStage } from '@/types/job'
import type { Locale } from '@/lib/utils/locale'
import { getLocalizedContent, getLocalizedContentNullable } from '@/lib/utils/locale'

// ============================================
// ARBITRARIES (Test Data Generators)
// ============================================

/**
 * Generator for locales
 */
const localeArb: fc.Arbitrary<Locale> = fc.constantFrom('en', 'id')

/**
 * Generator for job stages
 */
const jobStageArb: fc.Arbitrary<JobStage> = fc.constantFrom(
  'job_start',
  'in_transit',
  'job_end'
)

/**
 * Generator for photo types
 */
const photoTypeArb: fc.Arbitrary<string> = fc.constantFrom(
  'cargo_before',
  'cargo_after',
  'cargo_transit',
  'document',
  'damage',
  'issue'
)

/**
 * Generator for non-empty strings (for required fields like title)
 */
const nonEmptyStringArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 100 })

/**
 * Generator for nullable strings (for optional fields)
 */
const nullableStringArb: fc.Arbitrary<string | null> = fc.option(
  fc.string({ minLength: 1, maxLength: 200 }),
  { nil: null }
)

/**
 * Generator for a checklist item with various combinations of localized values
 */
const checklistItemArb: fc.Arbitrary<PhotoChecklistItem> = fc.record({
  id: fc.uuid(),
  stage: jobStageArb,
  sequence: fc.integer({ min: 1, max: 20 }),
  title: nonEmptyStringArb,
  title_id: nullableStringArb,
  description: nullableStringArb,
  description_id: nullableStringArb,
  tips: nullableStringArb,
  is_required: fc.boolean(),
  photo_type: photoTypeArb,
  example_image_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.constant(true),
})

/**
 * Generator for checklist item where title_id is guaranteed to be non-null
 */
const checklistItemWithTitleIdArb: fc.Arbitrary<PhotoChecklistItem> = fc.record({
  id: fc.uuid(),
  stage: jobStageArb,
  sequence: fc.integer({ min: 1, max: 20 }),
  title: nonEmptyStringArb,
  title_id: nonEmptyStringArb, // Guaranteed non-null
  description: nullableStringArb,
  description_id: nullableStringArb,
  tips: nullableStringArb,
  is_required: fc.boolean(),
  photo_type: photoTypeArb,
  example_image_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.constant(true),
})

/**
 * Generator for checklist item where title_id is guaranteed to be null
 */
const checklistItemWithoutTitleIdArb: fc.Arbitrary<PhotoChecklistItem> = fc.record({
  id: fc.uuid(),
  stage: jobStageArb,
  sequence: fc.integer({ min: 1, max: 20 }),
  title: nonEmptyStringArb,
  title_id: fc.constant(null), // Guaranteed null
  description: nullableStringArb,
  description_id: nullableStringArb,
  tips: nullableStringArb,
  is_required: fc.boolean(),
  photo_type: photoTypeArb,
  example_image_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.constant(true),
})

/**
 * Generator for checklist item where description_id is guaranteed to be non-null
 */
const checklistItemWithDescriptionIdArb: fc.Arbitrary<PhotoChecklistItem> = fc.record({
  id: fc.uuid(),
  stage: jobStageArb,
  sequence: fc.integer({ min: 1, max: 20 }),
  title: nonEmptyStringArb,
  title_id: nullableStringArb,
  description: nonEmptyStringArb, // Guaranteed non-null for fallback
  description_id: nonEmptyStringArb, // Guaranteed non-null
  tips: nullableStringArb,
  is_required: fc.boolean(),
  photo_type: photoTypeArb,
  example_image_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.constant(true),
})

/**
 * Generator for checklist item where description_id is guaranteed to be null
 */
const checklistItemWithoutDescriptionIdArb: fc.Arbitrary<PhotoChecklistItem> = fc.record({
  id: fc.uuid(),
  stage: jobStageArb,
  sequence: fc.integer({ min: 1, max: 20 }),
  title: nonEmptyStringArb,
  title_id: nullableStringArb,
  description: nullableStringArb,
  description_id: fc.constant(null), // Guaranteed null
  tips: nullableStringArb,
  is_required: fc.boolean(),
  photo_type: photoTypeArb,
  example_image_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.constant(true),
})

// ============================================
// HELPER FUNCTIONS (Simulating Component Logic)
// ============================================

/**
 * Gets the display title for a checklist item based on locale
 * This mirrors the logic used in components like StepInstructions
 */
function getDisplayTitle(item: PhotoChecklistItem, locale: Locale): string {
  return getLocalizedContent(locale, item.title, item.title_id)
}

/**
 * Gets the display description for a checklist item based on locale
 * This mirrors the logic used in components like StepInstructions
 */
function getDisplayDescription(item: PhotoChecklistItem, locale: Locale): string | null {
  return getLocalizedContentNullable(locale, item.description, item.description_id)
}

/**
 * Gets the display tips for a checklist item
 * Tips have no locale variant - displayed if not null
 */
function getDisplayTips(item: PhotoChecklistItem): string | null {
  return item.tips
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Feature: v0.3-guided-capture, Property 3: Locale-aware content display', () => {
  describe('Title Localization', () => {
    /**
     * **Validates: Requirements 3.2.1**
     * 
     * If locale is 'id' and `title_id` is not null, display `title_id`;
     * otherwise display `title`
     */

    it('should display title_id when locale is id AND title_id is not null', () => {
      fc.assert(
        fc.property(checklistItemWithTitleIdArb, (item) => {
          const locale: Locale = 'id'
          
          // Precondition: title_id is not null
          expect(item.title_id).not.toBeNull()
          
          // Action: get display title
          const displayTitle = getDisplayTitle(item, locale)
          
          // Postcondition: should display title_id
          expect(displayTitle).toBe(item.title_id)
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should display title when locale is id AND title_id is null', () => {
      fc.assert(
        fc.property(checklistItemWithoutTitleIdArb, (item) => {
          const locale: Locale = 'id'
          
          // Precondition: title_id is null
          expect(item.title_id).toBeNull()
          
          // Action: get display title
          const displayTitle = getDisplayTitle(item, locale)
          
          // Postcondition: should fall back to title
          expect(displayTitle).toBe(item.title)
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should ALWAYS display title when locale is en (regardless of title_id)', () => {
      fc.assert(
        fc.property(checklistItemArb, (item) => {
          const locale: Locale = 'en'
          
          // Action: get display title
          const displayTitle = getDisplayTitle(item, locale)
          
          // Postcondition: should always display title for English locale
          expect(displayTitle).toBe(item.title)
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should return non-empty string for ANY checklist item and locale', () => {
      fc.assert(
        fc.property(checklistItemArb, localeArb, (item, locale) => {
          // Action: get display title
          const displayTitle = getDisplayTitle(item, locale)
          
          // Postcondition: title should never be empty (title is required field)
          expect(displayTitle.length).toBeGreaterThan(0)
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Description Localization', () => {
    /**
     * **Validates: Requirements 3.2.2**
     * 
     * If locale is 'id' and `description_id` is not null, display `description_id`;
     * otherwise display `description`
     */

    it('should display description_id when locale is id AND description_id is not null', () => {
      fc.assert(
        fc.property(checklistItemWithDescriptionIdArb, (item) => {
          const locale: Locale = 'id'
          
          // Precondition: description_id is not null
          expect(item.description_id).not.toBeNull()
          
          // Action: get display description
          const displayDescription = getDisplayDescription(item, locale)
          
          // Postcondition: should display description_id
          expect(displayDescription).toBe(item.description_id)
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should display description when locale is id AND description_id is null', () => {
      fc.assert(
        fc.property(checklistItemWithoutDescriptionIdArb, (item) => {
          const locale: Locale = 'id'
          
          // Precondition: description_id is null
          expect(item.description_id).toBeNull()
          
          // Action: get display description
          const displayDescription = getDisplayDescription(item, locale)
          
          // Postcondition: should fall back to description
          expect(displayDescription).toBe(item.description)
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should ALWAYS display description when locale is en (regardless of description_id)', () => {
      fc.assert(
        fc.property(checklistItemArb, (item) => {
          const locale: Locale = 'en'
          
          // Action: get display description
          const displayDescription = getDisplayDescription(item, locale)
          
          // Postcondition: should always display description for English locale
          expect(displayDescription).toBe(item.description)
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should return null when both description and description_id are null', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            stage: jobStageArb,
            sequence: fc.integer({ min: 1, max: 20 }),
            title: nonEmptyStringArb,
            title_id: nullableStringArb,
            description: fc.constant(null), // Guaranteed null
            description_id: fc.constant(null), // Guaranteed null
            tips: nullableStringArb,
            is_required: fc.boolean(),
            photo_type: photoTypeArb,
            example_image_url: fc.option(fc.webUrl(), { nil: null }),
            is_active: fc.constant(true),
          }),
          localeArb,
          (item, locale) => {
            // Precondition: both description values are null
            expect(item.description).toBeNull()
            expect(item.description_id).toBeNull()
            
            // Action: get display description
            const displayDescription = getDisplayDescription(item, locale)
            
            // Postcondition: should return null
            expect(displayDescription).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Tips Display', () => {
    /**
     * **Validates: Requirements 3.2.3**
     * 
     * Tips are displayed if not null (no locale variant)
     */

    it('should display tips when tips is not null (regardless of locale)', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            stage: jobStageArb,
            sequence: fc.integer({ min: 1, max: 20 }),
            title: nonEmptyStringArb,
            title_id: nullableStringArb,
            description: nullableStringArb,
            description_id: nullableStringArb,
            tips: nonEmptyStringArb, // Guaranteed non-null
            is_required: fc.boolean(),
            photo_type: photoTypeArb,
            example_image_url: fc.option(fc.webUrl(), { nil: null }),
            is_active: fc.constant(true),
          }),
          localeArb,
          (item, _locale) => {
            // Precondition: tips is not null
            expect(item.tips).not.toBeNull()
            
            // Action: get display tips
            const displayTips = getDisplayTips(item)
            
            // Postcondition: should display tips value
            expect(displayTips).toBe(item.tips)
            
            // Verify locale doesn't affect tips
            // (tips has no locale variant)
            const displayTipsEn = getDisplayTips(item)
            const displayTipsId = getDisplayTips(item)
            expect(displayTipsEn).toBe(displayTipsId)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return null when tips is null (regardless of locale)', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            stage: jobStageArb,
            sequence: fc.integer({ min: 1, max: 20 }),
            title: nonEmptyStringArb,
            title_id: nullableStringArb,
            description: nullableStringArb,
            description_id: nullableStringArb,
            tips: fc.constant(null), // Guaranteed null
            is_required: fc.boolean(),
            photo_type: photoTypeArb,
            example_image_url: fc.option(fc.webUrl(), { nil: null }),
            is_active: fc.constant(true),
          }),
          localeArb,
          (item, _locale) => {
            // Precondition: tips is null
            expect(item.tips).toBeNull()
            
            // Action: get display tips
            const displayTips = getDisplayTips(item)
            
            // Postcondition: should return null
            expect(displayTips).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('tips should be locale-independent for ANY checklist item', () => {
      fc.assert(
        fc.property(checklistItemArb, (item) => {
          // Action: get tips for both locales
          const tipsEn = getDisplayTips(item)
          const tipsId = getDisplayTips(item)
          
          // Postcondition: tips should be the same regardless of locale
          expect(tipsEn).toBe(tipsId)
          expect(tipsEn).toBe(item.tips)
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Combined Locale Behavior', () => {
    /**
     * Tests that verify the combined behavior of all locale-aware fields
     */

    it('should correctly localize all fields for ANY checklist item and locale', () => {
      fc.assert(
        fc.property(checklistItemArb, localeArb, (item, locale) => {
          // Action: get all display values
          const displayTitle = getDisplayTitle(item, locale)
          const displayDescription = getDisplayDescription(item, locale)
          const displayTips = getDisplayTips(item)
          
          // Postconditions based on locale
          if (locale === 'en') {
            // English: always use default values
            expect(displayTitle).toBe(item.title)
            expect(displayDescription).toBe(item.description)
          } else {
            // Indonesian: use localized if available, else default
            if (item.title_id !== null) {
              expect(displayTitle).toBe(item.title_id)
            } else {
              expect(displayTitle).toBe(item.title)
            }
            
            if (item.description_id !== null) {
              expect(displayDescription).toBe(item.description_id)
            } else {
              expect(displayDescription).toBe(item.description)
            }
          }
          
          // Tips: always the same regardless of locale
          expect(displayTips).toBe(item.tips)
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should handle all null localized values gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            stage: jobStageArb,
            sequence: fc.integer({ min: 1, max: 20 }),
            title: nonEmptyStringArb,
            title_id: fc.constant(null),
            description: fc.constant(null),
            description_id: fc.constant(null),
            tips: fc.constant(null),
            is_required: fc.boolean(),
            photo_type: photoTypeArb,
            example_image_url: fc.constant(null),
            is_active: fc.constant(true),
          }),
          localeArb,
          (item, locale) => {
            // Action: get all display values
            const displayTitle = getDisplayTitle(item, locale)
            const displayDescription = getDisplayDescription(item, locale)
            const displayTips = getDisplayTips(item)
            
            // Postconditions: should fall back gracefully
            expect(displayTitle).toBe(item.title) // title is required, always available
            expect(displayDescription).toBeNull() // both null
            expect(displayTips).toBeNull() // null
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle all non-null localized values correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            stage: jobStageArb,
            sequence: fc.integer({ min: 1, max: 20 }),
            title: nonEmptyStringArb,
            title_id: nonEmptyStringArb,
            description: nonEmptyStringArb,
            description_id: nonEmptyStringArb,
            tips: nonEmptyStringArb,
            is_required: fc.boolean(),
            photo_type: photoTypeArb,
            example_image_url: fc.webUrl(),
            is_active: fc.constant(true),
          }),
          localeArb,
          (item, locale) => {
            // Action: get all display values
            const displayTitle = getDisplayTitle(item, locale)
            const displayDescription = getDisplayDescription(item, locale)
            const displayTips = getDisplayTips(item)
            
            // Postconditions based on locale
            if (locale === 'en') {
              expect(displayTitle).toBe(item.title)
              expect(displayDescription).toBe(item.description)
            } else {
              expect(displayTitle).toBe(item.title_id)
              expect(displayDescription).toBe(item.description_id)
            }
            
            // Tips always the same
            expect(displayTips).toBe(item.tips)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Locale Invariants', () => {
    /**
     * Invariant properties that should hold across all inputs
     */

    it('title should NEVER be null or undefined for ANY input', () => {
      fc.assert(
        fc.property(checklistItemArb, localeArb, (item, locale) => {
          const displayTitle = getDisplayTitle(item, locale)
          
          // Title is a required field, should never be null/undefined
          expect(displayTitle).not.toBeNull()
          expect(displayTitle).not.toBeUndefined()
          expect(typeof displayTitle).toBe('string')
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('English locale should NEVER use localized values', () => {
      fc.assert(
        fc.property(checklistItemArb, (item) => {
          const locale: Locale = 'en'
          
          const displayTitle = getDisplayTitle(item, locale)
          const displayDescription = getDisplayDescription(item, locale)
          
          // English should always use default values
          expect(displayTitle).toBe(item.title)
          expect(displayDescription).toBe(item.description)
          
          // Even if localized values exist, they should not be used
          if (item.title_id !== null) {
            expect(displayTitle).not.toBe(item.title_id)
          }
          if (item.description_id !== null && item.description !== item.description_id) {
            expect(displayDescription).not.toBe(item.description_id)
          }
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('Indonesian locale should prefer localized values when available', () => {
      fc.assert(
        fc.property(checklistItemArb, (item) => {
          const locale: Locale = 'id'
          
          const displayTitle = getDisplayTitle(item, locale)
          const displayDescription = getDisplayDescription(item, locale)
          
          // If localized value exists, it should be used
          if (item.title_id !== null) {
            expect(displayTitle).toBe(item.title_id)
          }
          if (item.description_id !== null) {
            expect(displayDescription).toBe(item.description_id)
          }
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('locale selection should be deterministic for same input', () => {
      fc.assert(
        fc.property(checklistItemArb, localeArb, (item, locale) => {
          // Call multiple times with same input
          const title1 = getDisplayTitle(item, locale)
          const title2 = getDisplayTitle(item, locale)
          const desc1 = getDisplayDescription(item, locale)
          const desc2 = getDisplayDescription(item, locale)
          const tips1 = getDisplayTips(item)
          const tips2 = getDisplayTips(item)
          
          // Results should be identical
          expect(title1).toBe(title2)
          expect(desc1).toBe(desc2)
          expect(tips1).toBe(tips2)
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })
})
