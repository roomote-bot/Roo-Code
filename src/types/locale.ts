export const locales = ['en', 'fr'] as const;

export type Locale = (typeof locales)[number];

export const isLocale = (value: string | undefined): value is Locale =>
  locales.includes(value as Locale);

export const Locales: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};
