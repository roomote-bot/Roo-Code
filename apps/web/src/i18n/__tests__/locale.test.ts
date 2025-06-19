// pnpm test src/i18n/__tests__/locale.test.ts

import { enUS, frFR } from '@clerk/localizations';

import { locales, isLocale, Locales, getClerkLocale, Locale } from '../locale';

describe('locale module', () => {
  describe('locales', () => {
    it('should contain supported locales', () => {
      expect(locales).toEqual(['en', 'fr']);
    });
  });

  describe('isLocale', () => {
    it('should return true for valid locales', () => {
      expect(isLocale('en')).toBe(true);
      expect(isLocale('fr')).toBe(true);
    });

    it('should return false for invalid locales', () => {
      expect(isLocale('es')).toBe(false);
      expect(isLocale('de')).toBe(false);
      expect(isLocale('')).toBe(false);
      expect(isLocale(undefined)).toBe(false);
    });

    it('should properly type-narrow the input', () => {
      const testLocale = (locale: string | undefined): Locale | null => {
        if (isLocale(locale)) {
          const validLocale: Locale = locale;
          return validLocale;
        }

        return null;
      };

      expect(testLocale('en')).toBe('en');
      expect(testLocale('invalid')).toBe(null);
    });
  });

  describe('Locales', () => {
    it('should map locale codes to display names', () => {
      expect(Locales).toEqual({
        en: 'English',
        fr: 'Français',
      });
    });

    it('should have an entry for each supported locale', () => {
      locales.forEach((locale) => {
        expect(Locales[locale]).toBeDefined();
      });
    });
  });

  describe('getClerkLocale', () => {
    it('should return enUS for "en" locale', () => {
      expect(getClerkLocale('en')).toBe(enUS);
    });

    it('should return frFR for "fr" locale', () => {
      expect(getClerkLocale('fr')).toBe(frFR);
    });

    it('should return enUS for invalid locales', () => {
      expect(getClerkLocale('es')).toBe(enUS);
      expect(getClerkLocale('de')).toBe(enUS);
      expect(getClerkLocale('')).toBe(enUS);
      // @ts-expect-error Testing with invalid type
      expect(getClerkLocale(undefined)).toBe(enUS);
      // @ts-expect-error Testing with invalid type
      expect(getClerkLocale(null)).toBe(enUS);
    });

    it('should handle case sensitivity correctly', () => {
      expect(getClerkLocale('EN')).toBe(enUS);
      expect(getClerkLocale('Fr')).toBe(enUS);
    });
  });
});
