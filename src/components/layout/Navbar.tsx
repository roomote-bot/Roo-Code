'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui';
import { Section, LocaleSwitcher, ThemeSwitcher } from '@/components/layout';

import { Logo } from './Logo';

export const Navbar = () => {
  const t = useTranslations('Navbar');

  return (
    <Section className="py-6">
      <div className="flex flex-wrap items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <ul className="flex flex-row items-center gap-x-1.5 text-lg font-medium [&_li[data-fade]:hover]:opacity-100 [&_li[data-fade]]:opacity-60">
          <li data-fade>
            <LocaleSwitcher />
          </li>
          <li data-fade>
            <ThemeSwitcher />
          </li>
          <li>
            <Button variant="ghost" asChild>
              <Link href="/sign-in">{t('sign_in')}</Link>
            </Button>
          </li>
          <li>
            <Button asChild>
              <Link href="/sign-up">{t('sign_up')}</Link>
            </Button>
          </li>
        </ul>
      </div>
    </Section>
  );
};
