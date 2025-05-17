import Link from 'next/link';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

import {
  LocaleSwitcher,
  ThemeSwitcher,
  HoppingLogo,
} from '@/components/layout';

import { Section } from './Section';

type NavbarHeaderProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>;

export const NavbarHeader = (props: NavbarHeaderProps) => (
  <Section {...props}>
    <div className="flex justify-between items-center h-full">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <HoppingLogo />
        </Link>
        <OrganizationSwitcher
          organizationProfileMode="navigation"
          organizationProfileUrl="/org"
          afterCreateOrganizationUrl="/dashboard"
          hidePersonal
        />
      </div>
      <ul className="flex items-center gap-2 [&_li[data-fade]:hover]:opacity-100 [&_li[data-fade]]:opacity-60">
        <li data-fade>
          <LocaleSwitcher />
        </li>
        <li data-fade>
          <ThemeSwitcher />
        </li>
        <li>
          <UserButton />
        </li>
      </ul>
    </div>
  </Section>
);
