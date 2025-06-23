import Link from 'next/link';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

import { ThemeSwitcher, HoppingLogo } from '@/components/layout';

import { Section } from './Section';

type NavbarHeaderProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>;

export const NavbarHeader = (props: NavbarHeaderProps) => (
  <Section {...props}>
    <div className="flex justify-between items-center h-full">
      <div className="flex items-center gap-2">
        <Link href="/usage">
          <HoppingLogo />
        </Link>
        <OrganizationSwitcher
          organizationProfileMode="navigation"
          organizationProfileUrl="/org"
          afterCreateOrganizationUrl="/usage"
          hidePersonal={false}
          afterSelectPersonalUrl="/usage"
        />
      </div>
      <ul className="flex items-center gap-2">
        <li>
          <ThemeSwitcher />
        </li>
        <li>
          <UserButton />
        </li>
      </ul>
    </div>
  </Section>
);
