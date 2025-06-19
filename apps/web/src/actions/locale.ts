'use server';

import type { Locale } from '@/i18n/locale';
import { cookies } from 'next/headers';

export const setLocale = async (locale: Locale) => {
  const store = await cookies();
  store.set('locale', locale);
};
