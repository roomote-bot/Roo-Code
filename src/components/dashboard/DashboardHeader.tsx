'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  OrganizationSwitcher,
  UserButton,
  useOrganization,
} from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import { ActiveLink } from '@/components/ActiveLink';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ToggleMenuButton } from '@/components/ToggleMenuButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
} from '@/components/ui';
import { Logo } from '@/components/templates/Logo';

export const DashboardHeader = () => {
  const t = useTranslations('DashboardLayout');
  const { organization } = useOrganization();

  const menu = useMemo(() => {
    const menu = [{ href: '/dashboard', label: t('home') }];

    return organization
      ? [
          ...menu,
          {
            href: '/dashboard/organization-profile/organization-members',
            label: t('members'),
          },
          { href: '/dashboard/organization-profile', label: t('settings') },
        ]
      : menu;
  }, [organization, t]);

  return (
    <>
      <div className="flex items-center">
        <Link href="/dashboard" className="max-sm:hidden">
          <Logo />
        </Link>
        <svg
          className="size-8 stroke-muted-foreground max-sm:hidden"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" />
          <path d="M17 5 7 19" />
        </svg>
        <OrganizationSwitcher
          organizationProfileMode="navigation"
          organizationProfileUrl="/dashboard/organization-profile"
          afterCreateOrganizationUrl="/dashboard"
          createOrganizationUrl="/onboarding/create-org"
        />
        <nav className="ml-3 max-lg:hidden">
          <ul className="flex flex-row items-center gap-x-3 text-lg font-medium [&_a:hover]:opacity-100 [&_a]:opacity-75">
            {menu.map(({ href, label }) => (
              <li key={href}>
                <ActiveLink href={href}>{label}</ActiveLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div>
        <ul className="flex items-center gap-x-1.5 [&_li[data-fade]:hover]:opacity-100 [&_li[data-fade]]:opacity-60">
          <li data-fade>
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ToggleMenuButton />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {menu.map(({ href, label }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href}>{label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
          <li data-fade>
            <LocaleSwitcher />
          </li>
          <li data-fade>
            <ThemeSwitcher />
          </li>
          <li>
            <Separator orientation="vertical" className="h-4" />
          </li>
          <li>
            <UserButton
              userProfileMode="navigation"
              userProfileUrl="/dashboard/user-profile"
              appearance={{ elements: { rootBox: 'px-2 py-1.5' } }}
            />
          </li>
        </ul>
      </div>
    </>
  );
};
