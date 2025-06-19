'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

import { Switch } from '@/components/ui';

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  // Fixes hydration error.
  useEffect(
    () => setMode(resolvedTheme === 'dark' ? 'dark' : 'light'),
    [resolvedTheme],
  );

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={mode === 'dark'}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
      <div className="relative h-[1.2rem] w-[1.2rem]">
        <Sun className="absolute top-0 left-0 size-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute top-0 left-0 size-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </div>
    </div>
  );
}
