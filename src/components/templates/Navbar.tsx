import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { CenteredMenu } from '@/components/landing/CenteredMenu';
import { Section } from '@/components/landing/Section';

import { Logo } from './Logo';

export const Navbar = () => {
  const t = useTranslations('Navbar');

  return (
    <Section className="px-3 py-6">
      <CenteredMenu
        logo={<Logo />}
        rightMenu={
          <>
            <li data-fade>
              <LocaleSwitcher />
            </li>
            <li data-fade>
              <ThemeSwitcher />
            </li>
            <li className="ml-1 mr-2.5" data-fade>
              <Link href="/sign-in">{t('sign_in')}</Link>
            </li>
            <li>
              <Button asChild>
                <Link href="/sign-up">{t('sign_up')}</Link>
              </Button>
            </li>
          </>
        }
      />
    </Section>
  );
};
