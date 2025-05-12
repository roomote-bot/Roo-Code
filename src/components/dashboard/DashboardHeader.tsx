'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { Logo } from '@/components/layout/Logo';

export const DashboardHeader = () => {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <OrganizationSwitcher
          appearance={{ baseTheme }}
          organizationProfileMode="navigation"
          organizationProfileUrl="/dashboard/org"
          afterCreateOrganizationUrl="/dashboard"
          createOrganizationUrl="/onboarding/create-org"
        />
      </div>
      <div>
        <ul className="flex items-center gap-2 [&_li[data-fade]:hover]:opacity-100 [&_li[data-fade]]:opacity-60">
          <li data-fade>
            <LocaleSwitcher />
          </li>
          <li data-fade>
            <ThemeSwitcher />
          </li>
          <li>
            <UserButton
              appearance={{ baseTheme }}
              userProfileMode="navigation"
              userProfileUrl="/dashboard/user"
            />
          </li>
        </ul>
      </div>
    </>
  );
};
