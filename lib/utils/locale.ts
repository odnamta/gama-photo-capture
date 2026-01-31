/**
 * Locale utilities for GAMA Photo Capture
 * 
 * Provides helper functions for locale-aware content selection.
 * Supports English ('en') and Indonesian ('id') locales.
 */

export type Locale = 'en' | 'id'

/**
 * Selects the appropriate localized content based on the current locale.
 * 
 * For Indonesian locale ('id'):
 * - Returns the localized value if it exists (not null/undefined)
 * - Falls back to the default value if localized value is null/undefined
 * 
 * For English locale ('en'):
 * - Always returns the default value
 * 
 * @param locale - The current locale ('en' or 'id')
 * @param defaultValue - The default (English) value
 * @param localizedValue - The localized (Indonesian) value, may be null
 * @returns The appropriate content based on locale
 * 
 * @example
 * // Returns 'Cargo Front View' for English
 * getLocalizedContent('en', 'Cargo Front View', 'Foto Depan Kargo')
 * 
 * @example
 * // Returns 'Foto Depan Kargo' for Indonesian when available
 * getLocalizedContent('id', 'Cargo Front View', 'Foto Depan Kargo')
 * 
 * @example
 * // Falls back to English when Indonesian is null
 * getLocalizedContent('id', 'Cargo Front View', null)
 */
export function getLocalizedContent(
  locale: Locale,
  defaultValue: string,
  localizedValue: string | null | undefined
): string {
  if (locale === 'id' && localizedValue != null) {
    return localizedValue
  }
  return defaultValue
}

/**
 * Selects the appropriate localized content, handling nullable default values.
 * 
 * Similar to getLocalizedContent but allows the default value to be null.
 * Returns null if both values are null/undefined.
 * 
 * @param locale - The current locale ('en' or 'id')
 * @param defaultValue - The default (English) value, may be null
 * @param localizedValue - The localized (Indonesian) value, may be null
 * @returns The appropriate content based on locale, or null if unavailable
 * 
 * @example
 * // Returns null when both values are null
 * getLocalizedContentNullable('id', null, null)
 */
export function getLocalizedContentNullable(
  locale: Locale,
  defaultValue: string | null | undefined,
  localizedValue: string | null | undefined
): string | null {
  if (locale === 'id' && localizedValue != null) {
    return localizedValue
  }
  return defaultValue ?? null
}
