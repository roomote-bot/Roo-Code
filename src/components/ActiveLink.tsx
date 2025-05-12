'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

type ActiveLinkProps = {
  href: string;
  children: React.ReactNode;
};

export const ActiveLink = ({ href, children }: ActiveLinkProps) => {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-2',
        pathname.endsWith(href) &&
          'rounded-md bg-primary text-primary-foreground',
      )}
    >
      {children}
    </Link>
  );
};
