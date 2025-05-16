'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

import { Locales, isLocale } from '@/i18n/locale';
import { setLocale } from '@/actions/locale';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui';
import { Globe } from 'lucide-react';

export const LocaleSwitcher = () => {
  const router = useRouter();
  const locale = useLocale();

  const onLocaleChange = useCallback(
    (value: string) => {
      if (isLocale(value)) {
        setLocale(value);
        router.refresh();
      }
    },
    [router],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={locale} onValueChange={onLocaleChange}>
          {Object.entries(Locales).map(([id, name]) => (
            <DropdownMenuRadioItem key={id} value={id}>
              {name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
