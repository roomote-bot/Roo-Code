import { enUS, frFR } from '@clerk/localizations';

export const locales = ['en', 'fr'] as const;

export type Locale = (typeof locales)[number];

export const isLocale = (value: string | undefined): value is Locale =>
  locales.includes(value as Locale);

export const Locales: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};

type ClerkLocalization = typeof enUS;

export const getClerkLocale = (locale: string): ClerkLocalization => {
  if (!isLocale(locale)) {
    return enUS;
  }

  switch (locale) {
    case 'fr':
      return frFR;
    default:
      return enUS;
  }
};
